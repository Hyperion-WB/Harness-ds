//! Spawn, watch, and tear down a `dsh web` child process.

use std::process::Stdio;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tokio::time::timeout;

use crate::agent::ensure_local_agent;
use crate::launch::{augmented_path, parse_dsh_web_url, resolve_launch, LaunchSource};
use crate::settings::{collect_provider_env, AppSettings};

const READY_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HarnessStatus {
    pub state: HarnessState,
    pub url: Option<String>,
    pub workspace: Option<String>,
    pub pid: Option<u32>,
    pub source: Option<String>,
    pub error: Option<String>,
    pub log_tail: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HarnessState {
    Idle,
    Starting,
    Ready,
    Error,
}

impl Default for HarnessStatus {
    fn default() -> Self {
        Self {
            state: HarnessState::Idle,
            url: None,
            workspace: None,
            pid: None,
            source: None,
            error: None,
            log_tail: Vec::new(),
        }
    }
}

pub struct HarnessRuntime {
    child: Child,
}

pub struct HarnessManager {
    inner: Mutex<Option<HarnessRuntime>>,
    status: Mutex<HarnessStatus>,
}

impl HarnessManager {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
            status: Mutex::new(HarnessStatus::default()),
        }
    }

    pub async fn snapshot(&self) -> HarnessStatus {
        self.status.lock().await.clone()
    }

    pub async fn stop(&self, app: &AppHandle) -> Result<(), String> {
        let runtime = self.inner.lock().await.take();
        if let Some(mut runtime) = runtime {
            terminate_child(&mut runtime.child).await;
        }
        let mut status = self.status.lock().await;
        *status = HarnessStatus::default();
        emit_status(app, &status);
        Ok(())
    }

    pub async fn start(
        &self,
        app: &AppHandle,
        settings: &AppSettings,
        workspace: String,
    ) -> Result<HarnessStatus, String> {
        if !std::path::Path::new(&workspace).is_dir() {
            return Err(format!("工作区不存在: {workspace}"));
        }
        let mut provider_env = collect_provider_env(settings).unwrap_or_default();
        if let Ok(credentials) = crate::providers::collect_credential_env() {
            for (name, value) in credentials {
                if !provider_env.iter().any(|(existing, _)| existing == &name) {
                    provider_env.push((name, value));
                }
            }
        }

        // Reuse a healthy runtime for the same workspace instead of respawning.
        {
            let status = self.status.lock().await.clone();
            let alive = self.inner.lock().await.is_some();
            if alive
                && status.state == HarnessState::Ready
                && status.url.is_some()
                && status.workspace.as_deref() == Some(workspace.as_str())
            {
                return Ok(status);
            }
        }

        self.stop(app).await?;

        // Prefer a local npm-prefix install so we do not cold-start via npx every launch.
        if settings.harness_command.trim().is_empty() {
            let _ = ensure_local_agent(settings).await;
        }

        let path_var = augmented_path();
        let spec = resolve_launch(settings, &path_var);
        let source = match spec.source {
            LaunchSource::Configured => "configured",
            LaunchSource::LocalPrefix => "local",
            LaunchSource::PathDsh => "dsh",
            LaunchSource::Npx => "npx",
        };

        {
            let mut status = self.status.lock().await;
            *status = HarnessStatus {
                state: HarnessState::Starting,
                url: None,
                workspace: Some(workspace.clone()),
                pid: None,
                source: Some(source.into()),
                error: None,
                log_tail: Vec::new(),
            };
            emit_status(app, &status);
        }

        if let Err(node_err) = crate::launch::check_node_version(&path_var) {
            let mut status = self.status.lock().await;
            *status = HarnessStatus {
                state: HarnessState::Error,
                url: None,
                workspace: Some(workspace.clone()),
                pid: None,
                source: Some(source.into()),
                error: Some(node_err.clone()),
                log_tail: vec![node_err.clone()],
            };
            emit_status(app, &status);
            return Err(node_err);
        }

        let _ = crate::paths::ensure_dsh_home_node_modules();
        let prefix = crate::paths::agent_prefix_dir().unwrap_or_default();
        let node_modules = prefix.join("node_modules");

        let mut command = Command::new(&spec.program);
        command
            .args(&spec.args)
            .current_dir(&workspace)
            .env("PATH", &path_var)
            .env("NODE_PATH", &node_modules)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .stdin(Stdio::null());
        for (name, value) in &provider_env {
            command.env(name, value);
        }
        let dsh_home = if let Some(custom) = &settings.dsh_home_override {
            if !custom.trim().is_empty() {
                std::path::PathBuf::from(custom.trim())
            } else {
                crate::paths::dsh_home_dir().unwrap_or_default()
            }
        } else {
            crate::paths::dsh_home_dir().unwrap_or_default()
        };
        command.env("DSH_HOME", &dsh_home);

        #[cfg(unix)]
        {
            command.process_group(0);
        }
        #[cfg(windows)]
        {
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = command.spawn().map_err(|error| {
            format!(
                "无法启动 {} {}: {error}",
                spec.program,
                spec.args.join(" ")
            )
        })?;
        let pid = child.id();

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "子进程 stdout 不可用".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "子进程 stderr 不可用".to_string())?;

        let (url_tx, url_rx) = tokio::sync::oneshot::channel::<Result<String, String>>();
        let app_for_logs = app.clone();
        tokio::spawn(read_output(app_for_logs, stdout, stderr, url_tx));

        match timeout(READY_TIMEOUT, url_rx).await {
            Ok(Ok(Ok(url))) => {
                let log_tail = self.status.lock().await.log_tail.clone();
                let status = HarnessStatus {
                    state: HarnessState::Ready,
                    url: Some(url),
                    workspace: Some(workspace.clone()),
                    pid,
                    source: Some(source.into()),
                    error: None,
                    log_tail,
                };
                *self.inner.lock().await = Some(HarnessRuntime { child });
                *self.status.lock().await = status.clone();
                emit_status(app, &status);
                Ok(status)
            }
            Ok(Ok(Err(error))) => {
                terminate_child(&mut child).await;
                self.fail(app, error).await
            }
            Ok(Err(_)) => {
                terminate_child(&mut child).await;
                self.fail(app, error_placeholder()).await
            }
            Err(_) => {
                terminate_child(&mut child).await;
                self.fail(
                    app,
                    format!(
                        "等待 dsh web 就绪超时（{}s）。确认已安装 Node 与 @deepseek-ai/dsh，并查看日志。",
                        READY_TIMEOUT.as_secs()
                    ),
                )
                .await
            }
        }
    }

    async fn fail(&self, app: &AppHandle, error: String) -> Result<HarnessStatus, String> {
        let mut status = self.status.lock().await;
        status.state = HarnessState::Error;
        status.error = Some(error.clone());
        status.url = None;
        status.pid = None;
        emit_status(app, &status);
        Err(error)
    }
}

fn error_placeholder() -> String {
    "dsh web 在公布 URL 之前退出".into()
}

async fn read_output<R1, R2>(
    app: AppHandle,
    stdout: R1,
    stderr: R2,
    url_tx: tokio::sync::oneshot::Sender<Result<String, String>>,
) where
    R1: tokio::io::AsyncRead + Unpin + Send + 'static,
    R2: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    let mut url_tx = Some(url_tx);
    let mut stdout_lines = BufReader::new(stdout).lines();
    let mut stderr_lines = BufReader::new(stderr).lines();
    let mut logs: Vec<String> = Vec::new();

    loop {
        tokio::select! {
            line = stdout_lines.next_line() => {
                match line {
                    Ok(Some(text)) => {
                        push_log(&app, &mut logs, &text);
                        if let Some(url) = parse_dsh_web_url(&text) {
                            if let Some(tx) = url_tx.take() {
                                let _ = tx.send(Ok(url));
                            }
                        }
                    }
                    Ok(None) => break,
                    Err(error) => {
                        if let Some(tx) = url_tx.take() {
                            let _ = tx.send(Err(format!("读取 stdout 失败: {error}")));
                        }
                        break;
                    }
                }
            }
            line = stderr_lines.next_line() => {
                match line {
                    Ok(Some(text)) => {
                        push_log(&app, &mut logs, &text);
                        if let Some(url) = parse_dsh_web_url(&text) {
                            if let Some(tx) = url_tx.take() {
                                let _ = tx.send(Ok(url));
                            }
                        }
                    }
                    Ok(None) => {}
                    Err(_) => {}
                }
            }
        }
    }

    if let Some(tx) = url_tx.take() {
        let tail = logs
            .iter()
            .rev()
            .take(8)
            .cloned()
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect::<Vec<_>>()
            .join("\n");
        let message = if tail.is_empty() {
            error_placeholder()
        } else {
            format!("{}:\n{tail}", error_placeholder())
        };
        let _ = tx.send(Err(message));
    }
}

fn push_log(app: &AppHandle, logs: &mut Vec<String>, line: &str) {
    logs.push(line.to_string());
    if logs.len() > 80 {
        logs.remove(0);
    }
    let _ = app.emit("harness://log", line);
}

fn emit_status(app: &AppHandle, status: &HarnessStatus) {
    let _ = app.emit("harness://status", status);
}

async fn terminate_child(child: &mut Child) {
    #[cfg(unix)]
    {
        if let Some(pid) = child.id() {
            unsafe {
                libc::kill(-(pid as i32), libc::SIGTERM);
            }
            if timeout(Duration::from_millis(1500), child.wait())
                .await
                .is_err()
            {
                unsafe {
                    libc::kill(-(pid as i32), libc::SIGKILL);
                }
                let _ = child.wait().await;
            }
            return;
        }
    }
    #[cfg(windows)]
    {
        if let Some(pid) = child.id() {
            let mut cmd = Command::new("taskkill");
            cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
            let _ = cmd.status().await;
            let _ = timeout(Duration::from_millis(1500), child.wait()).await;
            return;
        }
    }
    let _ = child.kill().await;
    let _ = child.wait().await;
}
