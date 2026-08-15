//! Local npm-prefix install and update checks for `@deepseek-ai/dsh`.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tokio::time::timeout;

use crate::launch::{augmented_path, find_in_path};
use crate::settings::AppSettings;

const AGENT_DIR: &str = "deepseek-harness-gui";
const PREFIX_DIR: &str = "agent-prefix";
const PACKAGE_NAME: &str = "@deepseek-ai/dsh";
const NPM_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentStatus {
    pub installed_version: Option<String>,
    pub latest_version: Option<String>,
    pub channel: String,
    pub update_available: bool,
    pub prefix_path: String,
    pub binary_path: Option<String>,
    pub auto_update: bool,
    pub error: Option<String>,
}

pub fn agent_prefix_dir() -> Result<PathBuf, String> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let app_prefix = exe_dir.join("agent-prefix");
            if app_prefix.is_dir() {
                return Ok(app_prefix);
            }
            let resources_prefix = exe_dir.join("resources").join("agent-prefix");
            if resources_prefix.is_dir() {
                return Ok(resources_prefix);
            }
        }
    }

    let dir = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .ok_or_else(|| "无法解析应用数据目录".to_string())?
        .join(AGENT_DIR)
        .join(PREFIX_DIR);
    fs::create_dir_all(&dir).map_err(|error| format!("无法创建 agent 前缀目录: {error}"))?;
    Ok(dir)
}

pub fn local_dsh_js_entry(prefix: &Path) -> Option<PathBuf> {
    let pkg_dir = prefix.join("node_modules").join("@deepseek-ai").join("dsh");
    let candidates = [
        pkg_dir.join("dist").join("index.js"),
        pkg_dir.join("dist").join("cli.js"),
        pkg_dir.join("bin").join("dsh.js"),
        pkg_dir.join("index.js"),
    ];
    for candidate in candidates {
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    let pkg_json = pkg_dir.join("package.json");
    if let Ok(content) = std::fs::read_to_string(pkg_json) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(bin_str) = val.get("bin").and_then(|b| b.as_str()) {
                let p = pkg_dir.join(bin_str);
                if p.is_file() {
                    return Some(p);
                }
            } else if let Some(bin_obj) = val.get("bin").and_then(|b| b.as_object()) {
                if let Some(bin_val) = bin_obj.values().next().and_then(|v| v.as_str()) {
                    let p = pkg_dir.join(bin_val);
                    if p.is_file() {
                        return Some(p);
                    }
                }
            }
        }
    }
    None
}

pub fn local_dsh_binary(prefix: &Path) -> Option<PathBuf> {
    let bin_dir = prefix.join("node_modules").join(".bin");
    for name in executable_names("dsh") {
        let candidate = bin_dir.join(&name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    let cmd = bin_dir.join("dsh.cmd");
    if cmd.is_file() {
        return Some(cmd);
    }
    None
}

fn executable_names(name: &str) -> Vec<String> {
    if cfg!(windows) {
        vec![
            format!("{name}.cmd"),
            format!("{name}.exe"),
            format!("{name}.bat"),
            name.to_string(),
        ]
    } else {
        vec![name.to_string()]
    }
}

pub fn read_installed_version(prefix: &Path) -> Option<String> {
    let pkg = prefix
        .join("node_modules")
        .join("@deepseek-ai")
        .join("dsh")
        .join("package.json");
    let raw = fs::read_to_string(pkg).ok()?;
    let value: serde_json::Value = serde_json::from_str(&raw).ok()?;
    value
        .get("version")
        .and_then(|v| v.as_str())
        .map(str::to_string)
}

fn package_spec(settings: &AppSettings) -> String {
    let channel = settings.agent_channel.trim();
    if channel.is_empty() || channel == "latest" {
        format!("{PACKAGE_NAME}@latest")
    } else if channel.chars().next().is_some_and(|c| c.is_ascii_digit())
        || channel.starts_with('v')
        || channel.contains('.')
    {
        let version = channel.trim_start_matches('v');
        format!("{PACKAGE_NAME}@{version}")
    } else {
        format!("{PACKAGE_NAME}@{channel}")
    }
}

async fn run_npm(args: &[&str], path_var: &str) -> Result<String, String> {
    let npm = find_in_path("npm", path_var)
        .map(|p| p.display().to_string())
        .unwrap_or_else(|| "npm".to_string());
    let mut command = Command::new(&npm);
    command
        .args(args)
        .env("PATH", path_var)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let output = timeout(NPM_TIMEOUT, command.output())
        .await
        .map_err(|_| "npm 命令超时".to_string())?
        .map_err(|error| format!("无法运行 npm: {error}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if !output.status.success() {
        let detail = if stderr.is_empty() { stdout } else { stderr };
        return Err(format!("npm 失败: {detail}"));
    }
    Ok(stdout)
}

pub async fn fetch_latest_version(channel: &str) -> Result<String, String> {
    let path_var = augmented_path();
    let tag = if channel.is_empty() || channel == "latest" {
        "latest"
    } else if channel.chars().next().is_some_and(|c| c.is_ascii_digit())
        || channel.starts_with('v')
        || channel.matches('.').count() >= 1
    {
        return Ok(channel.trim_start_matches('v').to_string());
    } else {
        channel
    };
    let stdout = run_npm(
        &["view", &format!("{PACKAGE_NAME}@{tag}"), "version", "--registry=https://registry.npmmirror.com"],
        &path_var,
    )
    .await?;
    let version = stdout
        .lines()
        .last()
        .unwrap_or(&stdout)
        .trim()
        .trim_matches('"')
        .to_string();
    if version.is_empty() {
        return Err("npm view 未返回版本号".into());
    }
    Ok(version)
}

pub async fn install_agent(settings: &AppSettings) -> Result<AgentStatus, String> {
    let prefix = agent_prefix_dir()?;
    let path_var = augmented_path();
    let spec = package_spec(settings);
    let prefix_str = prefix.display().to_string();
    run_npm(
        &[
            "install",
            "--prefix",
            &prefix_str,
            "--no-fund",
            "--no-audit",
            "--registry=https://registry.npmmirror.com",
            &spec,
        ],
        &path_var,
    )
    .await?;
    agent_status(settings).await
}

pub async fn ensure_local_agent(settings: &AppSettings) -> Result<PathBuf, String> {
    let prefix = agent_prefix_dir()?;
    if let Some(bin) = local_dsh_binary(&prefix) {
        return Ok(bin);
    }
    let status = install_agent(settings).await?;
    status
        .binary_path
        .map(PathBuf::from)
        .ok_or_else(|| "安装后仍找不到本地 dsh 可执行文件".to_string())
}

pub async fn agent_status(settings: &AppSettings) -> Result<AgentStatus, String> {
    let prefix = agent_prefix_dir()?;
    let installed = read_installed_version(&prefix);
    let binary = local_dsh_binary(&prefix);
    let mut error = None;
    let latest = match fetch_latest_version(&settings.agent_channel).await {
        Ok(version) => Some(version),
        Err(err) => {
            error = Some(err);
            None
        }
    };
    let update_available = match (&installed, &latest) {
        (Some(current), Some(remote)) => current != remote,
        _ => false,
    };
    Ok(AgentStatus {
        installed_version: installed,
        latest_version: latest,
        channel: settings.agent_channel.clone(),
        update_available,
        prefix_path: prefix.display().to_string(),
        binary_path: binary.map(|p| p.display().to_string()),
        auto_update: settings.agent_auto_update,
        error,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn package_spec_latest() {
        let settings = AppSettings {
            agent_channel: "latest".into(),
            ..AppSettings::default()
        };
        assert_eq!(package_spec(&settings), "@deepseek-ai/dsh@latest");
    }

    #[test]
    fn package_spec_pin() {
        let settings = AppSettings {
            agent_channel: "0.1.0-rc.6".into(),
            ..AppSettings::default()
        };
        assert_eq!(package_spec(&settings), "@deepseek-ai/dsh@0.1.0-rc.6");
    }
}
