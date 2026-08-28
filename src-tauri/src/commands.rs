//! Tauri command surface consumed only by the frontend adapter.

use std::process::Stdio;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tokio::process::Command;

use crate::agent::{self, AgentStatus};
use crate::harness::{HarnessManager, HarnessStatus};
use crate::launch::{augmented_path, find_in_path, resolve_launch};
use crate::settings::{
    has_any_provider_key, load_settings, provider_key_presence, save_settings, set_api_key,
    set_provider_key, touch_recent_workspace, AppSettings,
};

pub struct AppState {
    pub settings: std::sync::Mutex<AppSettings>,
    pub harness: HarnessManager,
}

impl AppState {
    pub fn load() -> Result<Self, String> {
        Ok(Self {
            settings: std::sync::Mutex::new(load_settings()?),
            harness: HarnessManager::new(),
        })
    }

    pub fn fallback(error: &str) -> Self {
        eprintln!("load settings: {error}");
        Self {
            settings: std::sync::Mutex::new(AppSettings::default()),
            harness: HarnessManager::new(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorReport {
    pub node: Probe,
    pub dsh: Probe,
    pub npx: Probe,
    pub npm: Probe,
    pub has_api_key: bool,
    pub keyring: bool,
    pub launch_program: String,
    pub launch_args: Vec<String>,
    pub launch_source: String,
    pub agent: AgentStatus,
    pub shell_version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Probe {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPatch {
    pub harness_command: Option<String>,
    pub harness_args: Option<Vec<String>>,
    pub theme: Option<String>,
    pub locale: Option<String>,
    pub close_to_tray: Option<bool>,
    pub recent_workspaces: Option<Vec<crate::settings::RecentWorkspace>>,
    pub agent_channel: Option<String>,
    pub agent_auto_update: Option<bool>,
    pub auto_start: Option<bool>,
    pub global_shortcut_enabled: Option<bool>,
    pub dsh_home_override: Option<String>,
}

fn lock_settings(state: &AppState) -> Result<std::sync::MutexGuard<'_, AppSettings>, String> {
    state
        .settings
        .lock()
        .map_err(|_| "设置锁已损坏".to_string())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let mut snapshot = lock_settings(&state)?.clone();
    snapshot.api_key_fallback = None;
    Ok(snapshot)
}

#[tauri::command]
pub async fn save_settings_patch(
    app: AppHandle,
    state: State<'_, AppState>,
    patch: SettingsPatch,
) -> Result<AppSettings, String> {
    let mut settings = lock_settings(&state)?;
    if let Some(value) = patch.harness_command {
        settings.harness_command = value;
    }
    if let Some(value) = patch.harness_args {
        settings.harness_args = value;
    }
    if let Some(value) = patch.theme {
        settings.theme = value;
    }
    if let Some(value) = patch.locale {
        settings.locale = value;
    }
    if let Some(value) = patch.close_to_tray {
        settings.close_to_tray = value;
    }
    if let Some(value) = patch.recent_workspaces {
        settings.recent_workspaces = value;
    }
    if let Some(value) = patch.agent_channel {
        settings.agent_channel = value;
    }
    if let Some(value) = patch.agent_auto_update {
        settings.agent_auto_update = value;
    }
    if let Some(value) = patch.auto_start {
        settings.auto_start = value;
        apply_autostart(&app, value)?;
    }
    if let Some(value) = patch.global_shortcut_enabled {
        settings.global_shortcut_enabled = value;
        apply_global_shortcut(&app, value)?;
    }
    if let Some(value) = patch.dsh_home_override {
        settings.dsh_home_override = if value.trim().is_empty() {
            None
        } else {
            Some(value)
        };
    }
    save_settings(&settings)?;
    let mut snapshot = settings.clone();
    snapshot.api_key_fallback = None;
    Ok(snapshot)
}

pub fn get_default_shortcut() -> tauri_plugin_global_shortcut::Shortcut {
    use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};
    if cfg!(target_os = "macos") {
        Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyH)
    } else {
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyH)
    }
}

fn apply_global_shortcut(app: &AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let shortcut = get_default_shortcut();
    if enabled {
        let _ = app.global_shortcut().register(shortcut);
    } else {
        let _ = app.global_shortcut().unregister(shortcut);
    }
    Ok(())
}

fn apply_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager
            .enable()
            .map_err(|error| format!("启用开机自启失败: {error}"))?;
    } else {
        manager
            .disable()
            .map_err(|error| format!("关闭开机自启失败: {error}"))?;
    }
    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderKeysStatus {
    pub deepseek: bool,
    pub openai: bool,
    pub anthropic: bool,
}

#[tauri::command]
pub async fn get_api_key_present(state: State<'_, AppState>) -> Result<bool, String> {
    let settings = lock_settings(&state)?;
    if has_any_provider_key(&settings)? {
        return Ok(true);
    }
    crate::providers::has_configured_provider()
}

#[tauri::command]
pub async fn get_provider_keys_status(
    state: State<'_, AppState>,
) -> Result<ProviderKeysStatus, String> {
    let settings = lock_settings(&state)?;
    let (deepseek, openai, anthropic) = provider_key_presence(&settings)?;
    Ok(ProviderKeysStatus {
        deepseek,
        openai,
        anthropic,
    })
}

#[tauri::command]
pub async fn set_stored_api_key(
    state: State<'_, AppState>,
    key: Option<String>,
) -> Result<bool, String> {
    let mut settings = lock_settings(&state)?;
    set_api_key(&mut settings, key)
}

#[tauri::command]
pub async fn set_provider_api_key(
    state: State<'_, AppState>,
    provider: String,
    key: Option<String>,
) -> Result<bool, String> {
    let mut settings = lock_settings(&state)?;
    set_provider_key(&mut settings, &provider, key)
}

#[tauri::command]
pub async fn list_model_providers() -> Result<crate::providers::ModelProvidersSnapshot, String> {
    crate::providers::snapshot()
}

#[tauri::command]
pub async fn upsert_model_provider(
    state: State<'_, AppState>,
    input: crate::providers::UpsertProviderInput,
) -> Result<crate::providers::ModelProvidersSnapshot, String> {
    let mut settings = lock_settings(&state)?;
    crate::providers::upsert_provider(&mut settings, input)
}

#[tauri::command]
pub async fn delete_model_provider(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<crate::providers::ModelProvidersSnapshot, String> {
    let mut settings = lock_settings(&state)?;
    crate::providers::delete_provider(&mut settings, &provider_id)
}

#[tauri::command]
pub async fn set_default_model(
    provider: String,
    model: String,
) -> Result<crate::providers::DefaultModel, String> {
    crate::providers::set_default_model(&provider, &model)
}

#[tauri::command]
pub async fn list_plugins() -> Result<crate::plugins::PluginsSnapshot, String> {
    crate::plugins::snapshot()
}

#[tauri::command]
pub async fn add_plugin(
    state: State<'_, AppState>,
    package: String,
) -> Result<crate::plugins::PluginsSnapshot, String> {
    let settings = lock_settings(&state)?.clone();
    crate::plugins::add_plugin(&settings, &package).await
}

#[tauri::command]
pub async fn remove_plugin(
    state: State<'_, AppState>,
    package: String,
) -> Result<crate::plugins::PluginsSnapshot, String> {
    let settings = lock_settings(&state)?.clone();
    crate::plugins::remove_plugin(&settings, &package).await
}

#[tauri::command]
pub async fn upsert_mcp_server(
    input: crate::plugins::UpsertMcpInput,
) -> Result<crate::plugins::PluginsSnapshot, String> {
    crate::plugins::upsert_mcp(input)
}

#[tauri::command]
pub async fn delete_mcp_server(
    server_id: String,
) -> Result<crate::plugins::PluginsSnapshot, String> {
    crate::plugins::delete_mcp(&server_id)
}

#[tauri::command]
pub async fn pick_workspace(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_title("选择工作区")
        .pick_folder(move |folder| {
            let path = folder.map(|file| file.to_string());
            let _ = tx.send(path);
        });
    Ok(rx.await.unwrap_or(None))
}

#[tauri::command]
pub async fn start_harness(
    app: AppHandle,
    state: State<'_, AppState>,
    workspace: String,
) -> Result<HarnessStatus, String> {
    let snapshot = {
        let mut settings = lock_settings(&state)?;
        touch_recent_workspace(&mut settings, &workspace);
        save_settings(&settings)?;
        settings.clone()
    };
    state.harness.start(&app, &snapshot, workspace).await
}

#[tauri::command]
pub async fn stop_harness(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state.harness.stop(&app).await
}

#[tauri::command]
pub async fn harness_status(state: State<'_, AppState>) -> Result<HarnessStatus, String> {
    Ok(state.harness.snapshot().await)
}

#[tauri::command]
pub async fn get_agent_status(state: State<'_, AppState>) -> Result<AgentStatus, String> {
    let settings = lock_settings(&state)?.clone();
    agent::agent_status(&settings).await
}

#[tauri::command]
pub async fn update_agent(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<AgentStatus, String> {
    let settings = lock_settings(&state)?.clone();
    let status = agent::install_agent(&settings).await?;
    // Restart runtime if a workspace is already connected so the new binary is used.
    let current = state.harness.snapshot().await;
    if let Some(workspace) = current.workspace.clone() {
        let _ = state.harness.stop(&app).await;
        let _ = state.harness.start(&app, &settings, workspace).await;
    }
    Ok(status)
}

#[tauri::command]
pub async fn repair_agent(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<AgentStatus, String> {
    let settings = lock_settings(&state)?.clone();
    let _ = state.harness.stop(&app).await;
    let status = agent::clean_and_reinstall_agent(&settings).await?;
    let current = state.harness.snapshot().await;
    if let Some(workspace) = current.workspace.clone() {
        let _ = state.harness.start(&app, &settings, workspace).await;
    }
    Ok(status)
}

#[tauri::command]
pub async fn doctor(state: State<'_, AppState>) -> Result<DoctorReport, String> {
    let settings = lock_settings(&state)?.clone();
    let path_var = augmented_path();
    let spec = resolve_launch(&settings, &path_var);
    let keyring_ok = keyring::Entry::new(
        crate::launch::KEYRING_SERVICE,
        crate::launch::KEYRING_USER,
    )
    .is_ok();
    let agent = agent::agent_status(&settings)
        .await
        .unwrap_or_else(|error| AgentStatus {
            installed_version: None,
            latest_version: None,
            channel: settings.agent_channel.clone(),
            update_available: false,
            prefix_path: agent::agent_prefix_dir()
                .map(|p| p.display().to_string())
                .unwrap_or_default(),
            binary_path: None,
            auto_update: settings.agent_auto_update,
            error: Some(error),
        });
    Ok(DoctorReport {
        node: probe_binary("node", &path_var).await,
        dsh: probe_binary("dsh", &path_var).await,
        npx: probe_binary("npx", &path_var).await,
        npm: probe_binary("npm", &path_var).await,
        has_api_key: has_any_provider_key(&settings)?
            || crate::providers::has_configured_provider().unwrap_or(false),
        keyring: keyring_ok,
        launch_program: spec.program,
        launch_args: spec.args,
        launch_source: format!("{:?}", spec.source),
        agent,
        shell_version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

async fn probe_binary(name: &str, path_var: &str) -> Probe {
    match find_in_path(name, path_var) {
        None => Probe {
            found: false,
            path: None,
            version: None,
            error: Some(format!("PATH 上找不到 {name}")),
        },
        Some(path) => {
            let mut cmd = Command::new(&path);
            cmd.arg("--version")
                .env("PATH", path_var)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            #[cfg(windows)]
            {
                const CREATE_NO_WINDOW: u32 = 0x0800_0000;
                cmd.creation_flags(CREATE_NO_WINDOW);
            }
            match cmd.output().await {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                    let version = if stdout.is_empty() { stderr } else { stdout };
                    Probe {
                        found: output.status.success() || !version.is_empty(),
                        path: Some(display),
                        version: if version.is_empty() {
                            None
                        } else {
                            Some(version.lines().next().unwrap_or(&version).to_string())
                        },
                        error: if output.status.success() {
                            None
                        } else {
                            Some(format!("{name} --version 退出码 {:?}", output.status.code()))
                        },
                    }
                }
                Err(error) => Probe {
                    found: true,
                    path: Some(display),
                    version: None,
                    error: Some(error.to_string()),
                },
            }
        }
    }
}

pub fn close_to_tray(state: &AppState) -> bool {
    state
        .settings
        .lock()
        .map(|settings| settings.close_to_tray)
        .unwrap_or(false)
}

#[tauri::command]
pub async fn open_in_editor(path: String, editor: Option<String>) -> Result<(), String> {
    let editor_name = editor.unwrap_or_else(|| "code".into());
    let path_var = augmented_path();
    let bin = find_in_path(&editor_name, &path_var)
        .map(|p| p.display().to_string())
        .unwrap_or(editor_name);

    let mut command = Command::new(&bin);
    command.arg(&path).env("PATH", &path_var);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
        .spawn()
        .map_err(|err| format!("无法打开编辑器 {}: {err}", bin))?;
    Ok(())
}

#[tauri::command]
pub async fn open_in_terminal(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("cmd");
        command.args(["/c", "start", "cmd.exe", "/K", &format!("cd /d \"{}\"", path)]);
        command.spawn().map_err(|e| format!("打开终端失败: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("open");
        command.args(["-a", "Terminal", &path]);
        command.spawn().map_err(|e| format!("打开终端失败: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        let mut command = Command::new("xdg-open");
        command.arg(&path);
        command.spawn().map_err(|e| format!("打开终端失败: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn reveal_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("explorer");
        command.arg(&path);
        command.spawn().map_err(|e| format!("打开文件管理器失败: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("open");
        command.arg(&path);
        command.spawn().map_err(|e| format!("打开访达失败: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        let mut command = Command::new("xdg-open");
        command.arg(&path);
        command.spawn().map_err(|e| format!("打开文件管理器失败: {e}"))?;
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    pub agent_prefix_path: String,
    pub agent_prefix_size_bytes: u64,
    pub dsh_home_path: String,
    pub dsh_home_size_bytes: u64,
    pub config_dir_path: String,
    pub config_dir_size_bytes: u64,
    pub cache_size_bytes: u64,
}

fn calculate_dir_size(path: &std::path::Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    if path.is_file() {
        return path.metadata().map(|m| m.len()).unwrap_or(0);
    }
    let mut total = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                total += entry.metadata().map(|m| m.len()).unwrap_or(0);
            } else if p.is_dir() {
                total += calculate_dir_size(&p);
            }
        }
    }
    total
}

#[tauri::command]
pub async fn get_storage_info(state: State<'_, AppState>) -> Result<StorageInfo, String> {
    let settings = lock_settings(&state)?.clone();
    let prefix_path = agent::agent_prefix_dir()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    let prefix_size = calculate_dir_size(std::path::Path::new(&prefix_path));

    let dsh_home = if let Some(custom) = &settings.dsh_home_override {
        if !custom.trim().is_empty() {
            std::path::PathBuf::from(custom.trim())
        } else {
            dirs::home_dir().map(|h| h.join(".dsh")).unwrap_or_default()
        }
    } else {
        dirs::home_dir().map(|h| h.join(".dsh")).unwrap_or_default()
    };
    let dsh_home_path = dsh_home.display().to_string();
    let dsh_home_size = calculate_dir_size(&dsh_home);

    let config_dir = dirs::config_dir()
        .map(|c| c.join("deepseek-harness-gui"))
        .unwrap_or_default();
    let config_dir_path = config_dir.display().to_string();
    let config_dir_size = calculate_dir_size(&config_dir);

    let cache_dir = dirs::cache_dir()
        .map(|c| c.join("deepseek-harness-gui"))
        .unwrap_or_default();
    let cache_size = calculate_dir_size(&cache_dir);

    Ok(StorageInfo {
        agent_prefix_path: prefix_path,
        agent_prefix_size_bytes: prefix_size,
        dsh_home_path,
        dsh_home_size_bytes: dsh_home_size,
        config_dir_path,
        config_dir_size_bytes: config_dir_size,
        cache_size_bytes: cache_size,
    })
}

#[tauri::command]
pub async fn clear_cache(state: State<'_, AppState>) -> Result<StorageInfo, String> {
    if let Some(cache_dir) = dirs::cache_dir().map(|c| c.join("deepseek-harness-gui")) {
        if cache_dir.exists() {
            let _ = std::fs::remove_dir_all(&cache_dir);
            let _ = std::fs::create_dir_all(&cache_dir);
        }
    }
    let settings = lock_settings(&state)?.clone();
    let dsh_home = if let Some(custom) = &settings.dsh_home_override {
        if !custom.trim().is_empty() {
            std::path::PathBuf::from(custom.trim())
        } else {
            dirs::home_dir().map(|h| h.join(".dsh")).unwrap_or_default()
        }
    } else {
        dirs::home_dir().map(|h| h.join(".dsh")).unwrap_or_default()
    };
    let dsh_tmp = dsh_home.join("tmp");
    if dsh_tmp.exists() {
        let _ = std::fs::remove_dir_all(&dsh_tmp);
    }
    let dsh_logs = dsh_home.join("logs");
    if dsh_logs.exists() {
        let _ = std::fs::remove_dir_all(&dsh_logs);
    }
    get_storage_info(state).await
}

#[tauri::command]
pub async fn open_storage_dir(path: String) -> Result<(), String> {
    reveal_in_file_manager(path).await
}

#[tauri::command]
pub async fn list_profiles(state: State<'_, AppState>) -> Result<Vec<crate::profiles::ProfileInfo>, String> {
    let settings = lock_settings(&state)?;
    crate::profiles::list_profiles(&settings.active_profile)
}

#[tauri::command]
pub async fn create_profile(name: String) -> Result<crate::profiles::ProfileInfo, String> {
    crate::profiles::create_profile(&name, None)
}

#[tauri::command]
pub async fn delete_profile(name: String) -> Result<(), String> {
    crate::profiles::delete_profile(&name)
}

#[tauri::command]
pub async fn switch_profile(
    app: AppHandle,
    state: State<'_, AppState>,
    name: String,
) -> Result<Vec<crate::profiles::ProfileInfo>, String> {
    let mut settings = lock_settings(&state)?.clone();
    settings.active_profile = name.clone();
    crate::settings::save_settings(&settings)?;
    *state.settings.lock().map_err(|e| e.to_string())? = settings.clone();

    // Restart harness on new profile if currently running
    let current = state.harness.snapshot().await;
    if let Some(workspace) = current.workspace {
        let _ = state.harness.stop(&app).await;
        let _ = state.harness.start(&app, &settings, workspace).await;
    }

    crate::profiles::list_profiles(&name)
}


