//! Read/write dsh `$DSH_HOME` provider profiles (`settings.yaml` + `.credentials.yaml`).

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_yaml::Value;

use crate::settings::{set_provider_key, AppSettings};

const SETTINGS_FILE: &str = "settings.yaml";
const CREDENTIALS_FILE: &str = ".credentials.yaml";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ModelProvider {
    pub id: String,
    pub kind: String,
    pub display_name: String,
    pub base_url: Option<String>,
    pub api: Option<String>,
    pub api_key_env: String,
    pub has_api_key: bool,
    pub models: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DefaultModel {
    pub provider: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelProvidersSnapshot {
    pub providers: Vec<ModelProvider>,
    pub default_model: DefaultModel,
    pub dsh_home: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertProviderInput {
    pub id: String,
    pub kind: String,
    pub display_name: Option<String>,
    pub base_url: Option<String>,
    pub api: Option<String>,
    pub api_key_env: Option<String>,
    pub api_key: Option<String>,
    pub models: Vec<String>,
}

fn dsh_home() -> Result<PathBuf, String> {
    crate::paths::dsh_home_dir()
}

fn ensure_dsh_home() -> Result<PathBuf, String> {
    let home = dsh_home()?;
    fs::create_dir_all(&home).map_err(|error| format!("无法创建 DSH_HOME: {error}"))?;
    Ok(home)
}

fn settings_path(home: &Path) -> PathBuf {
    home.join(SETTINGS_FILE)
}

fn credentials_path(home: &Path) -> PathBuf {
    home.join(CREDENTIALS_FILE)
}

fn read_yaml_map(path: &Path) -> Result<BTreeMap<String, Value>, String> {
    if !path.exists() {
        return Ok(BTreeMap::new());
    }
    let raw = fs::read_to_string(path).map_err(|error| format!("读取 {} 失败: {error}", path.display()))?;
    if raw.trim().is_empty() {
        return Ok(BTreeMap::new());
    }
    let value: Value =
        serde_yaml::from_str(&raw).map_err(|error| format!("解析 {} 失败: {error}", path.display()))?;
    match value {
        Value::Mapping(map) => {
            let mut out = BTreeMap::new();
            for (key, val) in map {
                if let Value::String(name) = key {
                    out.insert(name, val);
                } else if let Some(name) = key.as_str() {
                    out.insert(name.to_string(), val);
                }
            }
            Ok(out)
        }
        Value::Null => Ok(BTreeMap::new()),
        _ => Err(format!("{} 根节点必须是对象", path.display())),
    }
}

fn write_yaml_map(path: &Path, map: &BTreeMap<String, Value>) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("无法创建目录: {error}"))?;
    }
    let raw = serde_yaml::to_string(map).map_err(|error| format!("序列化 YAML 失败: {error}"))?;
    fs::write(path, raw).map_err(|error| format!("写入 {} 失败: {error}", path.display()))
}

fn read_credentials(home: &Path) -> Result<BTreeMap<String, String>, String> {
    let path = credentials_path(home);
    if !path.exists() {
        return Ok(BTreeMap::new());
    }
    let raw = fs::read_to_string(&path).map_err(|error| format!("读取凭证失败: {error}"))?;
    if raw.trim().is_empty() {
        return Ok(BTreeMap::new());
    }
    let value: Value =
        serde_yaml::from_str(&raw).map_err(|error| format!("解析凭证失败: {error}"))?;
    let mut out = BTreeMap::new();
    let Some(map) = value.as_mapping() else {
        return Ok(out);
    };
    for (key, val) in map {
        let Some(name) = key.as_str() else { continue };
        if let Some(secret) = val.as_str() {
            if !secret.is_empty() {
                out.insert(name.to_string(), secret.to_string());
            }
        }
    }
    Ok(out)
}

fn write_credentials(home: &Path, credentials: &BTreeMap<String, String>) -> Result<(), String> {
    let path = credentials_path(home);
    if credentials.is_empty() {
        if path.exists() {
            fs::remove_file(&path).map_err(|error| format!("删除凭证文件失败: {error}"))?;
        }
        return Ok(());
    }
    let mut map = BTreeMap::new();
    for (key, value) in credentials {
        map.insert(key.clone(), Value::String(value.clone()));
    }
    write_yaml_map(&path, &map)
}

fn mapping_get<'a>(map: &'a BTreeMap<String, Value>, key: &str) -> Option<&'a Value> {
    map.get(key)
}

fn mapping_get_mut<'a>(map: &'a mut BTreeMap<String, Value>, key: &str) -> &'a mut Value {
    map.entry(key.to_string()).or_insert(Value::Mapping(serde_yaml::Mapping::new()))
}

fn as_object_mut(value: &mut Value) -> &mut serde_yaml::Mapping {
    if !value.is_mapping() {
        *value = Value::Mapping(serde_yaml::Mapping::new());
    }
    value.as_mapping_mut().expect("mapping")
}

fn string_field(map: &serde_yaml::Mapping, key: &str) -> Option<String> {
    map.get(Value::String(key.into()))
        .and_then(|value| value.as_str())
        .map(str::to_string)
        .filter(|value| !value.is_empty())
}

fn models_from_value(value: &Value) -> Vec<String> {
    let Some(list) = value.as_sequence() else {
        return Vec::new();
    };
    list.iter()
        .filter_map(|item| {
            if let Some(id) = item.as_str() {
                return Some(id.to_string());
            }
            item.as_mapping()
                .and_then(|map| string_field(map, "id"))
        })
        .collect()
}

fn credential_present(credentials: &BTreeMap<String, String>, env_name: &str) -> bool {
    if credentials.contains_key(env_name) {
        return true;
    }
    std::env::var(env_name)
        .map(|value| !value.is_empty())
        .unwrap_or(false)
}

fn default_model_from_settings(settings: &BTreeMap<String, Value>) -> DefaultModel {
    if let Some(Value::Mapping(map)) = mapping_get(settings, "agent-default-model") {
        let provider = string_field(map, "provider").unwrap_or_else(|| "deepseek-official".into());
        let model = string_field(map, "model").unwrap_or_else(|| "deepseek-chat".into());
        return DefaultModel { provider, model };
    }
    DefaultModel {
        provider: "deepseek-official".into(),
        model: "deepseek-chat".into(),
    }
}

fn list_from_documents(
    settings: &BTreeMap<String, Value>,
    credentials: &BTreeMap<String, String>,
) -> Vec<ModelProvider> {
    let mut providers = Vec::new();

    if let Some(Value::Mapping(deepseek)) = mapping_get(settings, "llm-deepseek") {
        let api_key_env =
            string_field(deepseek, "apiKeyEnv").unwrap_or_else(|| "DEEPSEEK_API_KEY".into());
        let models = deepseek
            .get(Value::String("models".into()))
            .map(models_from_value)
            .unwrap_or_default();
        providers.push(ModelProvider {
            id: "deepseek-official".into(),
            kind: "deepseek-official".into(),
            display_name: "DeepSeek".into(),
            base_url: string_field(deepseek, "baseURL"),
            api: None,
            api_key_env: api_key_env.clone(),
            has_api_key: credential_present(credentials, &api_key_env),
            models,
        });
    }

    if let Some(Value::Mapping(pi)) = mapping_get(settings, "llm-pi-ai") {
        if let Some(Value::Mapping(routes)) = pi.get(Value::String("providers".into())) {
            for (key, value) in routes {
                let Some(id) = key.as_str() else { continue };
                let Some(profile) = value.as_mapping() else { continue };
                let api_key_env = string_field(profile, "apiKeyEnv")
                    .unwrap_or_else(|| format!("{}_API_KEY", id.replace('-', "_").to_ascii_uppercase()));
                let api = string_field(profile, "api");
                let kind = if id == "openai" || id == "anthropic" || id == "deepseek" {
                    "catalog"
                } else {
                    "custom"
                };
                let display_name = string_field(profile, "displayName").unwrap_or_else(|| {
                    match id {
                        "openai" => "OpenAI".into(),
                        "anthropic" => "Anthropic".into(),
                        "deepseek" => "DeepSeek (pi-ai)".into(),
                        other => other.to_string(),
                    }
                });
                let models = profile
                    .get(Value::String("models".into()))
                    .map(models_from_value)
                    .unwrap_or_default();
                providers.push(ModelProvider {
                    id: id.to_string(),
                    kind: kind.into(),
                    display_name,
                    base_url: string_field(profile, "baseURL"),
                    api,
                    api_key_env: api_key_env.clone(),
                    has_api_key: credential_present(credentials, &api_key_env),
                    models,
                });
            }
        }
    }

    providers.sort_by(|a, b| a.display_name.cmp(&b.display_name));
    providers
}

pub fn snapshot() -> Result<ModelProvidersSnapshot, String> {
    let home = ensure_dsh_home()?;
    let settings = read_yaml_map(&settings_path(&home))?;
    let credentials = read_credentials(&home)?;
    Ok(ModelProvidersSnapshot {
        providers: list_from_documents(&settings, &credentials),
        default_model: default_model_from_settings(&settings),
        dsh_home: home.display().to_string(),
    })
}

pub fn has_configured_provider() -> Result<bool, String> {
    let snap = snapshot()?;
    Ok(snap.providers.iter().any(|provider| provider.has_api_key))
}

pub fn collect_credential_env() -> Result<Vec<(String, String)>, String> {
    let home = ensure_dsh_home()?;
    let credentials = read_credentials(&home)?;
    Ok(credentials.into_iter().collect())
}

fn models_to_yaml(models: &[String]) -> Value {
    Value::Sequence(
        models
            .iter()
            .map(|id| {
                let mut map = serde_yaml::Mapping::new();
                map.insert(Value::String("id".into()), Value::String(id.clone()));
                Value::Mapping(map)
            })
            .collect(),
    )
}

fn set_string(map: &mut serde_yaml::Mapping, key: &str, value: Option<String>) {
    let key = Value::String(key.into());
    match value.filter(|item| !item.is_empty()) {
        Some(text) => {
            map.insert(key, Value::String(text));
        }
        None => {
            map.remove(&key);
        }
    }
}

fn sync_shell_key(
    settings: &mut AppSettings,
    api_key_env: &str,
    api_key: Option<&str>,
) -> Result<(), String> {
    let provider = match api_key_env {
        "DEEPSEEK_API_KEY" => "deepseek",
        "OPENAI_API_KEY" => "openai",
        "ANTHROPIC_API_KEY" => "anthropic",
        _ => return Ok(()),
    };
    set_provider_key(
        settings,
        provider,
        api_key.map(str::to_string).filter(|value| !value.is_empty()),
    )?;
    Ok(())
}

pub fn upsert_provider(
    shell_settings: &mut AppSettings,
    input: UpsertProviderInput,
) -> Result<ModelProvidersSnapshot, String> {
    let id = input.id.trim().to_ascii_lowercase();
    if id.is_empty() {
        return Err("Provider ID 不能为空".into());
    }
    if !id
        .chars()
        .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-' || ch == '_')
    {
        return Err("Provider ID 只能包含小写字母、数字、连字符或下划线".into());
    }

    let home = ensure_dsh_home()?;
    let settings_file = settings_path(&home);
    let mut settings = read_yaml_map(&settings_file)?;
    let mut credentials = read_credentials(&home)?;

    let api_key_env = input
        .api_key_env
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| match input.kind.as_str() {
            "deepseek-official" => "DEEPSEEK_API_KEY".into(),
            "catalog" if id == "openai" => "OPENAI_API_KEY".into(),
            "catalog" if id == "anthropic" => "ANTHROPIC_API_KEY".into(),
            "catalog" if id == "deepseek" => "DEEPSEEK_API_KEY".into(),
            _ => format!("{}_API_KEY", id.replace('-', "_").to_ascii_uppercase()),
        });

    if let Some(key) = input.api_key.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty())
    {
        credentials.insert(api_key_env.clone(), key.to_string());
        sync_shell_key(shell_settings, &api_key_env, Some(key))?;
    }

    if input.kind == "deepseek-official" || id == "deepseek-official" {
        let section = mapping_get_mut(&mut settings, "llm-deepseek");
        let map = as_object_mut(section);
        set_string(map, "apiKeyEnv", Some(api_key_env.clone()));
        set_string(map, "baseURL", input.base_url.clone());
        if input.models.is_empty() {
            map.remove(Value::String("models".into()));
        } else {
            map.insert(Value::String("models".into()), models_to_yaml(&input.models));
        }
    } else {
        let pi = mapping_get_mut(&mut settings, "llm-pi-ai");
        let pi_map = as_object_mut(pi);
        let providers_key = Value::String("providers".into());
        if !pi_map.contains_key(&providers_key) {
            pi_map.insert(providers_key.clone(), Value::Mapping(serde_yaml::Mapping::new()));
        }
        let providers = pi_map
            .get_mut(&providers_key)
            .and_then(|value| value.as_mapping_mut())
            .ok_or_else(|| "llm-pi-ai.providers 无效".to_string())?;
        let mut profile = serde_yaml::Mapping::new();
        set_string(&mut profile, "apiKeyEnv", Some(api_key_env.clone()));
        set_string(
            &mut profile,
            "displayName",
            input.display_name.clone().or_else(|| Some(match id.as_str() {
                "openai" => "OpenAI".into(),
                "anthropic" => "Anthropic".into(),
                other => other.to_string(),
            })),
        );
        set_string(&mut profile, "baseURL", input.base_url.clone());
        if input.kind == "custom" || input.api.is_some() {
            set_string(
                &mut profile,
                "api",
                input.api.clone().or_else(|| Some("openai-completions".into())),
            );
        }
        if input.models.is_empty() {
            if input.kind == "custom" {
                return Err("自定义提供商至少需要一个模型".into());
            }
        } else {
            profile.insert(Value::String("models".into()), models_to_yaml(&input.models));
        }
        providers.insert(Value::String(id), Value::Mapping(profile));
    }

    write_yaml_map(&settings_file, &settings)?;
    write_credentials(&home, &credentials)?;
    snapshot()
}

pub fn delete_provider(
    shell_settings: &mut AppSettings,
    provider_id: &str,
) -> Result<ModelProvidersSnapshot, String> {
    let id = provider_id.trim();
    let home = ensure_dsh_home()?;
    let settings_file = settings_path(&home);
    let mut settings = read_yaml_map(&settings_file)?;
    let mut credentials = read_credentials(&home)?;

    let mut removed_env: Option<String> = None;

    if id == "deepseek-official" {
        if let Some(Value::Mapping(map)) = settings.remove("llm-deepseek") {
            removed_env = string_field(&map, "apiKeyEnv");
        }
    } else if let Some(Value::Mapping(pi)) = settings.get_mut("llm-pi-ai") {
        if let Some(Value::Mapping(providers)) = pi.get_mut(Value::String("providers".into())) {
            if let Some(Value::Mapping(profile)) = providers.remove(Value::String(id.into())) {
                removed_env = string_field(&profile, "apiKeyEnv");
            }
            if providers.is_empty() {
                pi.remove(Value::String("providers".into()));
            }
        }
        if pi.is_empty() {
            settings.remove("llm-pi-ai");
        }
    }

    if let Some(env_name) = removed_env {
        credentials.remove(&env_name);
        sync_shell_key(shell_settings, &env_name, None)?;
    }

    if let Some(Value::Mapping(default)) = settings.get("agent-default-model") {
        if string_field(default, "provider").as_deref() == Some(id) {
            settings.insert(
                "agent-default-model".into(),
                Value::Mapping({
                    let mut map = serde_yaml::Mapping::new();
                    map.insert(
                        Value::String("provider".into()),
                        Value::String("deepseek-official".into()),
                    );
                    map.insert(
                        Value::String("model".into()),
                        Value::String("deepseek-chat".into()),
                    );
                    map
                }),
            );
        }
    }

    write_yaml_map(&settings_file, &settings)?;
    write_credentials(&home, &credentials)?;
    snapshot()
}

pub fn set_default_model(provider: &str, model: &str) -> Result<DefaultModel, String> {
    let provider = provider.trim();
    let model = model.trim();
    if provider.is_empty() || model.is_empty() {
        return Err("默认模型需要提供商和模型 ID".into());
    }
    let home = ensure_dsh_home()?;
    let settings_file = settings_path(&home);
    let mut settings = read_yaml_map(&settings_file)?;
    let mut map = serde_yaml::Mapping::new();
    map.insert(
        Value::String("provider".into()),
        Value::String(provider.to_string()),
    );
    map.insert(
        Value::String("model".into()),
        Value::String(model.to_string()),
    );
    settings.insert("agent-default-model".into(), Value::Mapping(map));
    write_yaml_map(&settings_file, &settings)?;
    Ok(DefaultModel {
        provider: provider.to_string(),
        model: model.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn models_yaml_roundtrip_shape() {
        let value = models_to_yaml(&["a".into(), "b".into()]);
        assert_eq!(models_from_value(&value), vec!["a", "b"]);
    }
}
