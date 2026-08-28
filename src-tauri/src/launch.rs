//! Shared launch-spec helpers for locating and spawning `dsh web`.

use std::env;
use std::path::{Path, PathBuf};

use crate::agent::{agent_prefix_dir, local_dsh_binary, local_dsh_js_entry};
use crate::settings::AppSettings;

pub const DEFAULT_DSH_PACKAGE: &str = "@deepseek-ai/dsh@latest";
pub const KEYRING_SERVICE: &str = "ai.deepseek.harness.gui";
pub const KEYRING_USER_DEEPSEEK: &str = "deepseek-api-key";
pub const KEYRING_USER_OPENAI: &str = "openai-api-key";
pub const KEYRING_USER_ANTHROPIC: &str = "anthropic-api-key";
/// Backward-compatible alias.
pub const KEYRING_USER: &str = KEYRING_USER_DEEPSEEK;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LaunchSpec {
    pub program: String,
    pub args: Vec<String>,
    pub source: LaunchSource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LaunchSource {
    Configured,
    LocalPrefix,
    PathDsh,
    Npx,
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            if chars.peek() == Some(&'[') {
                chars.next();
                while let Some(&next) = chars.peek() {
                    chars.next();
                    if next.is_alphabetic() || next == 'm' || next == 'K' || next == 'G' || next == 'H' {
                        break;
                    }
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// Parse the `dsh web:` announcement line printed after the webserver binds.
///
/// Only loopback http URLs are accepted. A LAN suffix is ignored.
pub fn parse_dsh_web_url(line: &str) -> Option<String> {
    let clean = strip_ansi(line);
    let trimmed_line = clean.trim();
    if let Some(rest) = trimmed_line.strip_prefix("dsh web:") {
        if let Some(url) = rest.split_whitespace().next() {
            if is_loopback_http(url) {
                return Some(url.trim_end_matches('/').to_string());
            }
        }
    }
    for token in clean.split_whitespace() {
        let trimmed = token.trim_matches(|c: char| !c.is_alphanumeric() && c != ':' && c != '/' && c != '.');
        if is_loopback_http(trimmed) {
            return Some(trimmed.trim_end_matches('/').to_string());
        }
    }
    None
}

pub fn is_loopback_http(url: &str) -> bool {
    url.starts_with("http://127.0.0.1:") || url.starts_with("http://localhost:")
}

pub fn path_separator() -> char {
    if cfg!(windows) { ';' } else { ':' }
}

pub fn augmented_path() -> String {
    let sep = path_separator();
    let current = env::var("PATH").unwrap_or_default();
    let mut parts: Vec<String> = current
        .split(sep)
        .filter(|part| !part.is_empty())
        .map(str::to_string)
        .collect();

    let mut extras: Vec<String> = Vec::new();
    if let Ok(prefix) = agent_prefix_dir() {
        extras.push(prefix.join("node_modules").join(".bin").display().to_string());
    }

    #[cfg(windows)]
    {
        extras.push("C:\\Program Files\\nodejs".into());
        extras.push("C:\\Program Files (x86)\\nodejs".into());
        if let Ok(prog_files) = env::var("ProgramFiles") {
            extras.push(format!("{prog_files}\\nodejs"));
        }
        if let Ok(prog_files_x86) = env::var("ProgramFiles(x86)") {
            extras.push(format!("{prog_files_x86}\\nodejs"));
        }
        if let Ok(app_data) = env::var("APPDATA") {
            extras.push(format!("{app_data}\\npm"));
            extras.push(format!("{app_data}\\nvm"));
        }
        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            extras.push(format!("{local_app_data}\\Programs\\node"));
            extras.push(format!("{local_app_data}\\pnpm"));
        }
    }

    if let Some(home) = dirs::home_dir() {
        extras.push(home.join(".local/bin").display().to_string());
        extras.push(home.join(".local/share/pnpm").display().to_string());
        extras.push(home.join("Library/pnpm").display().to_string());
        extras.push(home.join(".npm-global/bin").display().to_string());
        extras.push(home.join("AppData/Roaming/npm").display().to_string());
        extras.push(home.join("AppData/Local/pnpm").display().to_string());
        extras.push(home.join("scoop").join("shims").display().to_string());
        extras.push(home.join("scoop").join("apps").join("nodejs").join("current").join("bin").display().to_string());
    }
    extras.extend([
        "/opt/homebrew/bin".into(),
        "/opt/homebrew/sbin".into(),
        "/usr/local/bin".into(),
        "/usr/bin".into(),
        "/bin".into(),
    ]);

    for extra in extras {
        if !parts.iter().any(|part| part == &extra) {
            parts.insert(0, extra);
        }
    }
    parts.join(&sep.to_string())
}

pub fn find_in_path(name: &str, path_var: &str) -> Option<PathBuf> {
    let sep = path_separator();
    let candidates = executable_names(name);
    for dir in path_var.split(sep).filter(|part| !part.is_empty()) {
        for file_name in &candidates {
            let candidate = Path::new(dir).join(file_name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

pub fn check_node_version(path_var: &str) -> Result<String, String> {
    let node = find_in_path("node", path_var)
        .ok_or_else(|| "未在系统中检测到 Node.js。请前往 https://nodejs.org 安装 Node.js (推荐 LTS v22.12+)。".to_string())?;
    let mut cmd = std::process::Command::new(&node);
    cmd.arg("--version").env("PATH", path_var);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd
        .output()
        .map_err(|e| format!("无法执行 node --version: {e}"))?;
    let ver_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let clean_ver = ver_str.trim_start_matches('v');
    let parts: Vec<u32> = clean_ver
        .split('.')
        .filter_map(|s| s.parse::<u32>().ok())
        .collect();
    if parts.len() >= 2 {
        let major = parts[0];
        let minor = parts[1];
        if major < 22 || (major == 22 && minor < 12) {
            return Err(format!(
                "检测到当前 Node.js 版本为 {ver_str}，DeepSeek Harness 核心依赖 Node.js >= 22.12.0（以支持原生的 zstd 压缩与 TypeScript 剥离）。请前往 https://nodejs.org 升级至 Node.js v22 (LTS) 或 v24。"
            ));
        }
    }
    Ok(ver_str)
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

pub fn resolve_launch(settings: &AppSettings, path_var: &str) -> LaunchSpec {
    let args = if settings.harness_args.is_empty() {
        default_harness_args()
    } else {
        settings.harness_args.clone()
    };

    let configured = settings.harness_command.trim();
    if !configured.is_empty() {
        return LaunchSpec {
            program: configured.to_string(),
            args,
            source: LaunchSource::Configured,
        };
    }

    if let Ok(prefix) = agent_prefix_dir() {
        if crate::agent::is_installation_complete(&prefix) {
            if let Some(js_entry) = local_dsh_js_entry(&prefix) {
                if let Some(node) = find_in_path("node", path_var) {
                    let mut node_args = vec![js_entry.display().to_string()];
                    node_args.extend(args.clone());
                    return LaunchSpec {
                        program: node.display().to_string(),
                        args: node_args,
                        source: LaunchSource::LocalPrefix,
                    };
                }
            }
            if let Some(dsh) = local_dsh_binary(&prefix) {
                return LaunchSpec {
                    program: dsh.display().to_string(),
                    args,
                    source: LaunchSource::LocalPrefix,
                };
            }
        }
    }

    if let Some(dsh) = find_in_path("dsh", path_var) {
        return LaunchSpec {
            program: dsh.display().to_string(),
            args,
            source: LaunchSource::PathDsh,
        };
    }

    // Last resort: cold npx. Prefer installing into the local prefix via ensure_local_agent first.
    let npx = find_in_path("npx", path_var)
        .map(|path| path.display().to_string())
        .unwrap_or_else(|| "npx".to_string());
    let mut npx_args = vec!["--yes".into(), DEFAULT_DSH_PACKAGE.into()];
    npx_args.extend(args);
    LaunchSpec {
        program: npx,
        args: npx_args,
        source: LaunchSource::Npx,
    }
}

pub fn default_harness_args() -> Vec<String> {
    vec![
        "web".into(),
        "--host".into(),
        "127.0.0.1".into(),
        "--port".into(),
        "0".into(),
        "--no-open".into(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn parse_plain_loopback_url() {
        assert_eq!(
            parse_dsh_web_url("dsh web: http://127.0.0.1:4567"),
            Some("http://127.0.0.1:4567".into())
        );
    }

    #[test]
    fn parse_url_with_lan_suffix() {
        assert_eq!(
            parse_dsh_web_url(
                "dsh web: http://127.0.0.1:4567 (LAN: http://192.168.1.5:4567)"
            ),
            Some("http://127.0.0.1:4567".into())
        );
    }

    #[test]
    fn parse_localhost_url() {
        assert_eq!(
            parse_dsh_web_url("  dsh web: http://localhost:3080  "),
            Some("http://localhost:3080".into())
        );
    }

    #[test]
    fn reject_non_loopback_url() {
        assert_eq!(
            parse_dsh_web_url("dsh web: http://192.168.1.5:4567"),
            None
        );
        assert_eq!(parse_dsh_web_url("ready on http://127.0.0.1:4567"), None);
        assert_eq!(parse_dsh_web_url("dsh web: https://127.0.0.1:4567"), None);
    }

    #[test]
    fn resolve_configured_command() {
        let settings = AppSettings {
            harness_command: "/opt/dsh".into(),
            harness_args: vec!["web".into()],
            ..AppSettings::default()
        };
        let spec = resolve_launch(&settings, "");
        assert_eq!(spec.program, "/opt/dsh");
        assert_eq!(spec.args, vec!["web"]);
        assert_eq!(spec.source, LaunchSource::Configured);
    }

    #[test]
    fn resolve_npx_when_dsh_missing() {
        let settings = AppSettings::default();
        let spec = resolve_launch(&settings, "/tmp/does-not-exist-dsh-gui");
        assert_eq!(spec.source, LaunchSource::Npx);
        assert!(spec.args.starts_with(&["--yes".into(), DEFAULT_DSH_PACKAGE.into()]));
        assert!(spec.args.windows(2).any(|pair| pair == ["--host", "127.0.0.1"]));
    }

    #[test]
    fn find_in_path_locates_temp_dsh() {
        let dir = env::temp_dir().join(format!("dsh-gui-find-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("temp PATH dir");
        let dsh = dir.join("dsh");
        std::fs::write(&dsh, "#!/bin/sh\n").expect("temp dsh file");
        let found = find_in_path("dsh", dir.to_str().expect("utf-8 PATH dir"));
        let _ = std::fs::remove_dir_all(&dir);
        assert_eq!(found, Some(dsh));
    }

    #[test]
    fn augmented_path_includes_npm_global() {
        let Some(home) = dirs::home_dir() else {
            return;
        };
        let expected = home.join(".npm-global/bin").display().to_string();
        assert!(augmented_path().contains(&expected));
    }

    #[test]
    fn resolves_installed_dsh_when_present() {
        let path = augmented_path();
        if find_in_path("dsh", &path).is_none() {
            return;
        }
        let settings = AppSettings {
            harness_command: String::new(),
            ..AppSettings::default()
        };
        // Prefer local prefix when available; otherwise PATH dsh.
        let spec = resolve_launch(&settings, &path);
        assert!(
            spec.source == LaunchSource::PathDsh
                || spec.source == LaunchSource::LocalPrefix
                || spec.source == LaunchSource::Npx
        );
        if matches!(spec.source, LaunchSource::PathDsh | LaunchSource::LocalPrefix) {
            assert!(spec.args.windows(2).any(|pair| pair == ["--host", "127.0.0.1"]));
        }
    }
}
