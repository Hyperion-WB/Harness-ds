//! Persisted desktop settings (non-secret). API keys prefer the OS keyring.

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::launch::{
    KEYRING_SERVICE, KEYRING_USER_ANTHROPIC, KEYRING_USER_DEEPSEEK, KEYRING_USER_OPENAI,
};

const SETTINGS_FILE: &str = "settings.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RecentWorkspace {
    pub path: String,
    pub name: String,
    pub opened_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub harness_command: String,
    #[serde(default)]
    pub harness_args: Vec<String>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_locale")]
    pub locale: String,
    #[serde(default)]
    pub close_to_tray: bool,
    #[serde(default)]
    pub recent_workspaces: Vec<RecentWorkspace>,
    #[serde(default = "default_agent_channel")]
    pub agent_channel: String,
    #[serde(default = "default_true")]
    pub agent_auto_update: bool,
    #[serde(default)]
    pub auto_start: bool,
    #[serde(default = "default_true")]
    pub global_shortcut_enabled: bool,
    #[serde(default)]
    pub dsh_home_override: Option<String>,
    /// Used only when the OS keyring is unavailable.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_key_fallback: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub openai_api_key_fallback: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub anthropic_api_key_fallback: Option<String>,
}

fn default_theme() -> String {
    "dark".into()
}

fn default_locale() -> String {
    "zh".into()
}

fn default_agent_channel() -> String {
    "latest".into()
}

fn default_true() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            harness_command: String::new(),
            harness_args: Vec::new(),
            theme: default_theme(),
            locale: default_locale(),
            close_to_tray: false,
            recent_workspaces: Vec::new(),
            agent_channel: default_agent_channel(),
            agent_auto_update: true,
            auto_start: false,
            global_shortcut_enabled: true,
            dsh_home_override: None,
            api_key_fallback: None,
            openai_api_key_fallback: None,
            anthropic_api_key_fallback: None,
        }
    }
}

pub fn settings_path() -> Result<PathBuf, String> {
    let root = crate::paths::app_data_root();
    Ok(root.join(SETTINGS_FILE))
}

pub fn load_settings() -> Result<AppSettings, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let raw = fs::read_to_string(&path).map_err(|error| format!("读取设置失败: {error}"))?;
    serde_json::from_str(&raw).map_err(|error| format!("设置文件损坏: {error}"))
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path()?;
    let raw = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("序列化设置失败: {error}"))?;
    fs::write(&path, raw).map_err(|error| format!("写入设置失败: {error}"))
}

#[allow(dead_code)]
pub fn get_api_key(settings: &AppSettings) -> Result<Option<String>, String> {
    get_provider_key(settings, "deepseek")
}

pub fn set_api_key(settings: &mut AppSettings, key: Option<String>) -> Result<bool, String> {
    set_provider_key(settings, "deepseek", key)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderId {
    DeepSeek,
    OpenAi,
    Anthropic,
}

impl ProviderId {
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "deepseek" => Some(Self::DeepSeek),
            "openai" => Some(Self::OpenAi),
            "anthropic" => Some(Self::Anthropic),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::DeepSeek => "deepseek",
            Self::OpenAi => "openai",
            Self::Anthropic => "anthropic",
        }
    }

    pub fn env_name(self) -> &'static str {
        match self {
            Self::DeepSeek => "DEEPSEEK_API_KEY",
            Self::OpenAi => "OPENAI_API_KEY",
            Self::Anthropic => "ANTHROPIC_API_KEY",
        }
    }

    fn keyring_user(self) -> &'static str {
        match self {
            Self::DeepSeek => KEYRING_USER_DEEPSEEK,
            Self::OpenAi => KEYRING_USER_OPENAI,
            Self::Anthropic => KEYRING_USER_ANTHROPIC,
        }
    }

    fn fallback_get(self, settings: &AppSettings) -> Option<&String> {
        match self {
            Self::DeepSeek => settings.api_key_fallback.as_ref(),
            Self::OpenAi => settings.openai_api_key_fallback.as_ref(),
            Self::Anthropic => settings.anthropic_api_key_fallback.as_ref(),
        }
    }

    fn fallback_set(self, settings: &mut AppSettings, value: Option<String>) {
        match self {
            Self::DeepSeek => settings.api_key_fallback = value,
            Self::OpenAi => settings.openai_api_key_fallback = value,
            Self::Anthropic => settings.anthropic_api_key_fallback = value,
        }
    }
}

pub fn get_provider_key(settings: &AppSettings, provider: &str) -> Result<Option<String>, String> {
    let Some(provider) = ProviderId::parse(provider) else {
        return Err(format!("未知提供商: {provider}"));
    };
    if let Ok(value) = std::env::var(provider.env_name()) {
        if !value.is_empty() {
            return Ok(Some(value));
        }
    }
    let fallback = || {
        provider
            .fallback_get(settings)
            .cloned()
            .filter(|value| !value.is_empty())
    };
    match keyring::Entry::new(KEYRING_SERVICE, provider.keyring_user()) {
        Ok(entry) => match entry.get_password() {
            Ok(value) if !value.is_empty() => Ok(Some(value)),
            Ok(_) | Err(keyring::Error::NoEntry) => Ok(fallback()),
            Err(error) => {
                if let Some(value) = fallback() {
                    Ok(Some(value))
                } else {
                    Err(format!("读取钥匙串失败: {error}"))
                }
            }
        },
        Err(_) => Ok(fallback()),
    }
}

pub fn set_provider_key(
    settings: &mut AppSettings,
    provider: &str,
    key: Option<String>,
) -> Result<bool, String> {
    let Some(provider) = ProviderId::parse(provider) else {
        return Err(format!("未知提供商: {provider}"));
    };
    let uses_keyring = match keyring::Entry::new(KEYRING_SERVICE, provider.keyring_user()) {
        Ok(entry) => {
            match &key {
                Some(value) if !value.is_empty() => entry
                    .set_password(value)
                    .map_err(|error| format!("写入钥匙串失败: {error}"))?,
                _ => match entry.delete_credential() {
                    Ok(()) | Err(keyring::Error::NoEntry) => {}
                    Err(error) => return Err(format!("删除钥匙串条目失败: {error}")),
                },
            }
            provider.fallback_set(settings, None);
            true
        }
        Err(_) => {
            provider.fallback_set(settings, key.filter(|value| !value.is_empty()));
            false
        }
    };
    save_settings(settings)?;
    Ok(uses_keyring)
}

pub fn provider_key_presence(settings: &AppSettings) -> Result<(bool, bool, bool), String> {
    Ok((
        get_provider_key(settings, "deepseek")?.is_some(),
        get_provider_key(settings, "openai")?.is_some(),
        get_provider_key(settings, "anthropic")?.is_some(),
    ))
}

pub fn has_any_provider_key(settings: &AppSettings) -> Result<bool, String> {
    let (deepseek, openai, anthropic) = provider_key_presence(settings)?;
    Ok(deepseek || openai || anthropic)
}

pub fn collect_provider_env(settings: &AppSettings) -> Result<Vec<(String, String)>, String> {
    let mut pairs = Vec::new();
    for provider in [ProviderId::DeepSeek, ProviderId::OpenAi, ProviderId::Anthropic] {
        if let Some(value) = get_provider_key(settings, provider.as_str())? {
            pairs.push((provider.env_name().to_string(), value));
        }
    }
    Ok(pairs)
}

pub fn touch_recent_workspace(settings: &mut AppSettings, path: &str) {
    let name = std::path::Path::new(path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(path)
        .to_string();
    settings.recent_workspaces.retain(|item| item.path != path);
    settings.recent_workspaces.insert(
        0,
        RecentWorkspace {
            path: path.to_string(),
            name,
            opened_at: now_rfc3339(),
        },
    );
    settings.recent_workspaces.truncate(12);
}

fn now_rfc3339() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recent_workspace_moves_to_front_and_caps() {
        let mut settings = AppSettings::default();
        for index in 0..15 {
            touch_recent_workspace(&mut settings, &format!("/tmp/ws-{index}"));
        }
        assert_eq!(settings.recent_workspaces.len(), 12);
        assert_eq!(settings.recent_workspaces[0].path, "/tmp/ws-14");
        touch_recent_workspace(&mut settings, "/tmp/ws-10");
        assert_eq!(settings.recent_workspaces[0].path, "/tmp/ws-10");
        assert_eq!(
            settings
                .recent_workspaces
                .iter()
                .filter(|item| item.path == "/tmp/ws-10")
                .count(),
            1
        );
    }
}
