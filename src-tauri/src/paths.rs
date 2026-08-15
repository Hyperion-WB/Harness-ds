use std::fs;
use std::path::{Path, PathBuf};

const APP_DIR_NAME: &str = "deepseek-harness-gui";

/// Determine the base data directory.
/// Prefers the `data` folder inside the application's executable directory (portable mode)
/// if it is writable or already exists. Otherwise falls back to OS AppData.
pub fn app_data_root() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let local_data = exe_dir.join("data");
            // If data folder exists or exe_dir is writable, use installation data directory
            if local_data.is_dir() || is_dir_writable(exe_dir) {
                let _ = fs::create_dir_all(&local_data);
                return local_data;
            }
        }
    }

    let base = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join(APP_DIR_NAME);
    let _ = fs::create_dir_all(&dir);
    dir
}

fn is_dir_writable(path: &Path) -> bool {
    let test_file = path.join(".write_test_check");
    if fs::write(&test_file, b"ok").is_ok() {
        let _ = fs::remove_file(&test_file);
        true
    } else {
        false
    }
}

pub fn agent_prefix_dir() -> Result<PathBuf, String> {
    let user_prefix = app_data_root().join("agent-prefix");
    if user_prefix.join("node_modules").join("@deepseek-ai").join("dsh").is_dir() {
        return Ok(user_prefix);
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let bundled_resources = exe_dir.join("resources").join("agent-prefix");
            if bundled_resources.join("node_modules").join("@deepseek-ai").join("dsh").is_dir() {
                return Ok(bundled_resources);
            }
            let bundled_dir = exe_dir.join("agent-prefix");
            if bundled_dir.join("node_modules").join("@deepseek-ai").join("dsh").is_dir() {
                return Ok(bundled_dir);
            }
        }
    }

    fs::create_dir_all(&user_prefix).map_err(|e| format!("无法创建 agent 前缀目录: {e}"))?;
    Ok(user_prefix)
}

pub fn dsh_home_dir() -> Result<PathBuf, String> {
    if let Ok(val) = std::env::var("DSH_HOME") {
        let p = PathBuf::from(val);
        if !p.as_os_str().is_empty() {
            return Ok(p);
        }
    }
    let home = app_data_root().join("dsh-home");
    fs::create_dir_all(&home).map_err(|e| format!("无法创建 dsh-home 数据目录: {e}"))?;
    Ok(home)
}
