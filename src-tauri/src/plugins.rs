//! Profile plugin install (`dsh plugin`) + home `cordis.patch.yml` MCP rows.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;

use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use tokio::process::Command;

use crate::agent::{agent_prefix_dir, ensure_local_agent, local_dsh_binary};
use crate::launch::{augmented_path, find_in_path};
use crate::settings::AppSettings;

const PROFILE: &str = "web";
const MCP_PACKAGE: &str = "@deepseek-ai/dsh-mcp-client";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginPackage {
    pub name: String,
    pub version: String,
    pub is_bundle: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    pub id: String,
    pub server_name: String,
    pub transport: String,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub cwd: Option<String>,
    pub url: Option<String>,
    pub env: BTreeMap<String, String>,
    pub headers: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginsSnapshot {
    pub profile: String,
    pub profile_path: String,
    pub dsh_home: String,
    pub packages: Vec<PluginPackage>,
    pub bundles: Vec<String>,
    pub mcp_servers: Vec<McpServer>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertMcpInput {
    pub id: String,
    pub server_name: String,
    pub transport: String,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub cwd: Option<String>,
    pub url: Option<String>,
    #[serde(default)]
    pub env: BTreeMap<String, String>,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
}

fn dsh_home() -> Result<PathBuf, String> {
    crate::paths::dsh_home_dir()
}

fn ensure_dsh_home() -> Result<PathBuf, String> {
    let home = dsh_home()?;
    fs::create_dir_all(&home).map_err(|error| format!("无法创建 DSH_HOME: {error}"))?;
    Ok(home)
}

fn profile_dir(home: &Path) -> PathBuf {
    home.join("profiles").join(PROFILE)
}

fn home_patch_path(home: &Path) -> PathBuf {
    home.join("cordis.patch.yml")
}

fn read_json_object(path: &Path) -> Result<serde_json::Value, String> {
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let raw = fs::read_to_string(path).map_err(|error| format!("读取 {} 失败: {error}", path.display()))?;
    serde_json::from_str(&raw).map_err(|error| format!("解析 {} 失败: {error}", path.display()))
}

fn read_patch_document(path: &Path) -> Result<Vec<Value>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(path).map_err(|error| format!("读取 patch 失败: {error}"))?;
    if raw.trim().is_empty() {
        return Ok(Vec::new());
    }
    let value: Value =
        serde_yaml::from_str(&raw).map_err(|error| format!("解析 cordis.patch.yml 失败: {error}"))?;
    match value {
        Value::Sequence(items) => Ok(items),
        Value::Null => Ok(Vec::new()),
        _ => Err("cordis.patch.yml 根节点必须是数组".into()),
    }
}

fn write_patch_document(path: &Path, items: &[Value]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("无法创建目录: {error}"))?;
    }
    if items.is_empty() {
        // Empty patch file is invalid for dsh; write an empty array comment-free.
        fs::write(path, "[]\n").map_err(|error| format!("写入 patch 失败: {error}"))?;
        return Ok(());
    }
    let raw = serde_yaml::to_string(items).map_err(|error| format!("序列化 patch 失败: {error}"))?;
    fs::write(path, raw).map_err(|error| format!("写入 patch 失败: {error}"))
}

fn mapping_str(map: &serde_yaml::Mapping, key: &str) -> Option<String> {
    map.get(Value::String(key.into()))
        .and_then(|value| value.as_str())
        .map(str::to_string)
}

fn mapping_string_list(map: &serde_yaml::Mapping, key: &str) -> Vec<String> {
    map.get(Value::String(key.into()))
        .and_then(|value| value.as_sequence())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

fn mapping_string_map(map: &serde_yaml::Mapping, key: &str) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    let Some(Value::Mapping(entries)) = map.get(Value::String(key.into())) else {
        return out;
    };
    for (name, value) in entries {
        let Some(key_str) = name.as_str() else { continue };
        let Some(val_str) = value.as_str() else { continue };
        if key_str.trim().is_empty() {
            continue;
        }
        out.insert(key_str.to_string(), val_str.to_string());
    }
    out
}

fn yaml_string_map(entries: &BTreeMap<String, String>) -> Value {
    let mut map = serde_yaml::Mapping::new();
    for (key, value) in entries {
        let trimmed = key.trim();
        if trimmed.is_empty() {
            continue;
        }
        map.insert(
            Value::String(trimmed.to_string()),
            Value::String(value.clone()),
        );
    }
    Value::Mapping(map)
}

fn extract_mcp_servers(patch: &[Value]) -> Vec<McpServer> {
    let mut servers = Vec::new();
    for op in patch {
        let Some(map) = op.as_mapping() else { continue };
        let Some(Value::Sequence(rows)) = map.get(Value::String("insert".into())) else {
            continue;
        };
        for row in rows {
            let Some(row_map) = row.as_mapping() else { continue };
            let name = mapping_str(row_map, "name").unwrap_or_default();
            if name != MCP_PACKAGE {
                continue;
            }
            let id = mapping_str(row_map, "id").unwrap_or_default();
            let Some(config) = row_map
                .get(Value::String("config".into()))
                .and_then(|value| value.as_mapping())
            else {
                continue;
            };
            servers.push(McpServer {
                id,
                server_name: mapping_str(config, "serverName").unwrap_or_default(),
                transport: mapping_str(config, "transport").unwrap_or_else(|| "stdio".into()),
                command: mapping_str(config, "command"),
                args: mapping_string_list(config, "args"),
                cwd: mapping_str(config, "cwd"),
                url: mapping_str(config, "url"),
                env: mapping_string_map(config, "env"),
                headers: mapping_string_map(config, "headers"),
            });
        }
    }
    servers
}

fn list_packages(profile: &Path) -> Result<(Vec<PluginPackage>, Vec<String>), String> {
    let package_json = read_json_object(&profile.join("package.json"))?;
    let mut bundles = Vec::new();
    if let Some(list) = package_json
        .pointer("/dsh/profile/bundles")
        .and_then(|value| value.as_array())
    {
        for item in list {
            if let Some(name) = item.as_str() {
                bundles.push(name.to_string());
            }
        }
    }

    let mut packages = Vec::new();
    if let Some(deps) = package_json.get("dependencies").and_then(|value| value.as_object()) {
        for (name, version) in deps {
            let version = version.as_str().unwrap_or("*").to_string();
            let is_bundle = bundles.iter().any(|bundle| bundle == name)
                || version.contains("bundle")
                || name.contains("dsh-");
            packages.push(PluginPackage {
                name: name.clone(),
                version,
                is_bundle,
            });
        }
    }
    packages.sort_by(|a, b| a.name.cmp(&b.name));
    Ok((packages, bundles))
}

pub fn snapshot() -> Result<PluginsSnapshot, String> {
    let home = ensure_dsh_home()?;
    let profile = profile_dir(&home);
    let (packages, bundles) = if profile.exists() {
        list_packages(&profile)?
    } else {
        (Vec::new(), Vec::new())
    };
    let patch = read_patch_document(&home_patch_path(&home))?;
    Ok(PluginsSnapshot {
        profile: PROFILE.into(),
        profile_path: profile.display().to_string(),
        dsh_home: home.display().to_string(),
        packages,
        bundles,
        mcp_servers: extract_mcp_servers(&patch),
    })
}

async fn resolve_dsh_program(settings: &AppSettings) -> Result<String, String> {
    let path_var = augmented_path();
    if settings.harness_command.trim().is_empty() {
        let _ = ensure_local_agent(settings).await;
    }
    if let Ok(prefix) = agent_prefix_dir() {
        if let Some(local) = local_dsh_binary(&prefix) {
            return Ok(local.display().to_string());
        }
    }
    if let Some(path_dsh) = find_in_path("dsh", &path_var) {
        return Ok(path_dsh.display().to_string());
    }
    Err("找不到 dsh。请先安装 Agent，或在设置中指定 Harness 命令。".into())
}

async fn run_dsh_plugin(settings: &AppSettings, args: &[String]) -> Result<String, String> {
    let program = resolve_dsh_program(settings).await?;
    let path_var = augmented_path();
    let mut command = Command::new(&program);
    command
        .arg("plugin")
        .arg("--profile")
        .arg(PROFILE)
        .args(args)
        .env("PATH", &path_var)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let output = command
        .output()
        .await
        .map_err(|error| format!("执行 dsh plugin 失败: {error}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if !output.status.success() {
        let detail = if stderr.is_empty() { stdout } else { stderr };
        return Err(format!("dsh plugin 失败: {detail}"));
    }
    Ok(if stdout.is_empty() { stderr } else { stdout })
}

pub async fn add_plugin(settings: &AppSettings, package: &str) -> Result<PluginsSnapshot, String> {
    let package = package.trim();
    if package.is_empty() {
        return Err("请填写插件包名，例如 github:org/repo 或 @scope/name".into());
    }
    let _ = run_dsh_plugin(settings, &["add".into(), package.into()]).await?;
    snapshot()
}

pub async fn remove_plugin(settings: &AppSettings, package: &str) -> Result<PluginsSnapshot, String> {
    let package = package.trim();
    if package.is_empty() {
        return Err("请选择要移除的插件".into());
    }
    let _ = run_dsh_plugin(settings, &["remove".into(), package.into()]).await?;
    snapshot()
}

fn mcp_row(input: &UpsertMcpInput) -> Result<Value, String> {
    let id = input.id.trim().to_ascii_lowercase();
    let server_name = input.server_name.trim();
    if id.is_empty() {
        return Err("MCP id 不能为空".into());
    }
    if server_name.is_empty() {
        return Err("serverName 不能为空".into());
    }
    let transport = input.transport.trim();
    let mut config = serde_yaml::Mapping::new();
    config.insert(
        Value::String("transport".into()),
        Value::String(transport.to_string()),
    );
    config.insert(
        Value::String("serverName".into()),
        Value::String(server_name.to_string()),
    );
    config.insert(Value::String("failOnStartupError".into()), Value::Bool(false));
    config.insert(
        Value::String("toolCallTimeoutMs".into()),
        Value::Number(60_000.into()),
    );

    match transport {
        "stdio" => {
            let command = input
                .command
                .as_ref()
                .map(|value| value.trim())
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "stdio 传输需要 command".to_string())?;
            config.insert(
                Value::String("command".into()),
                Value::String(command.to_string()),
            );
            config.insert(
                Value::String("args".into()),
                Value::Sequence(
                    input
                        .args
                        .iter()
                        .map(|item| Value::String(item.clone()))
                        .collect(),
                ),
            );
            config.insert(Value::String("env".into()), yaml_string_map(&input.env));
            if let Some(cwd) = input.cwd.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty())
            {
                config.insert(Value::String("cwd".into()), Value::String(cwd.to_string()));
            } else {
                config.insert(Value::String("cwd".into()), Value::String(".".into()));
            }
        }
        "streamable-http" => {
            let url = input
                .url
                .as_ref()
                .map(|value| value.trim())
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "HTTP 传输需要 url".to_string())?;
            config.insert(Value::String("url".into()), Value::String(url.to_string()));
            config.insert(
                Value::String("headers".into()),
                yaml_string_map(&input.headers),
            );
        }
        _ => return Err("transport 仅支持 stdio 或 streamable-http".into()),
    }

    let mut row = serde_yaml::Mapping::new();
    row.insert(Value::String("id".into()), Value::String(id));
    row.insert(
        Value::String("name".into()),
        Value::String(MCP_PACKAGE.into()),
    );
    row.insert(Value::String("config".into()), Value::Mapping(config));
    Ok(Value::Mapping(row))
}

pub fn upsert_mcp(input: UpsertMcpInput) -> Result<PluginsSnapshot, String> {
    let home = ensure_dsh_home()?;
    let path = home_patch_path(&home);
    let mut patch = read_patch_document(&path)?;
    let row = mcp_row(&input)?;
    let id = input.id.trim().to_ascii_lowercase();

    // Remove any existing MCP row with the same id from insert ops.
    for op in &mut patch {
        let Some(map) = op.as_mapping_mut() else { continue };
        let Some(Value::Sequence(rows)) = map.get_mut(Value::String("insert".into())) else {
            continue;
        };
        rows.retain(|item| {
            item.as_mapping()
                .and_then(|row_map| mapping_str(row_map, "id"))
                .as_deref()
                != Some(id.as_str())
        });
    }

    // Prefer appending into the first insert op; else create one.
    let mut placed = false;
    for op in &mut patch {
        let Some(map) = op.as_mapping_mut() else { continue };
        if let Some(Value::Sequence(rows)) = map.get_mut(Value::String("insert".into())) {
            rows.push(row.clone());
            placed = true;
            break;
        }
    }
    if !placed {
        let mut insert_map = serde_yaml::Mapping::new();
        insert_map.insert(
            Value::String("insert".into()),
            Value::Sequence(vec![row]),
        );
        patch.push(Value::Mapping(insert_map));
    }

    // Drop empty insert ops.
    patch.retain(|op| {
        let Some(map) = op.as_mapping() else {
            return true;
        };
        match map.get(Value::String("insert".into())) {
            Some(Value::Sequence(rows)) => !rows.is_empty(),
            _ => true,
        }
    });

    write_patch_document(&path, &patch)?;
    snapshot()
}

pub fn delete_mcp(server_id: &str) -> Result<PluginsSnapshot, String> {
    let id = server_id.trim();
    let home = ensure_dsh_home()?;
    let path = home_patch_path(&home);
    let mut patch = read_patch_document(&path)?;
    for op in &mut patch {
        let Some(map) = op.as_mapping_mut() else { continue };
        let Some(Value::Sequence(rows)) = map.get_mut(Value::String("insert".into())) else {
            continue;
        };
        rows.retain(|item| {
            item.as_mapping()
                .and_then(|row_map| mapping_str(row_map, "id"))
                .as_deref()
                != Some(id)
        });
    }
    patch.retain(|op| {
        let Some(map) = op.as_mapping() else {
            return true;
        };
        match map.get(Value::String("insert".into())) {
            Some(Value::Sequence(rows)) => !rows.is_empty(),
            _ => true,
        }
    });
    write_patch_document(&path, &patch)?;
    snapshot()
}
