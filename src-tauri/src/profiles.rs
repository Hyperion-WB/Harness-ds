//! Multi-Profile management and isolation for DeepSeek Harness.
//! Each profile maintains its own dependencies, bundles, and cordis configurations in `~/.dsh/profiles/<name>/`.

use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInfo {
    pub name: String,
    pub path: String,
    pub is_active: bool,
    pub package_count: usize,
    pub bundle_count: usize,
}

fn profiles_root() -> Result<PathBuf, String> {
    let home = crate::paths::dsh_home_dir()?;
    let root = home.join("profiles");
    let _ = fs::create_dir_all(&root);
    Ok(root)
}

fn count_packages(profile_dir: &Path) -> (usize, usize) {
    let pkg_json = profile_dir.join("package.json");
    if !pkg_json.exists() {
        return (0, 0);
    }
    if let Ok(content) = fs::read_to_string(&pkg_json) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            let deps = val.get("dependencies").and_then(|d| d.as_object()).map(|o| o.len()).unwrap_or(0);
            let bundles = val.get("dsh")
                .and_then(|d| d.get("bundles"))
                .and_then(|b| b.as_array())
                .map(|a| a.len())
                .unwrap_or(0);
            return (deps, bundles);
        }
    }
    (0, 0)
}

pub fn list_profiles(active: &str) -> Result<Vec<ProfileInfo>, String> {
    let root = profiles_root()?;
    
    // Ensure default profiles exist
    let web_dir = root.join("web");
    let _ = fs::create_dir_all(&web_dir);
    let desktop_dir = root.join("desktop");
    let _ = fs::create_dir_all(&desktop_dir);

    let mut list = Vec::new();
    if let Ok(entries) = fs::read_dir(&root) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let path = entry.path();
                    let (pkg_count, bundle_count) = count_packages(&path);
                    list.push(ProfileInfo {
                        is_active: name == active,
                        name,
                        path: path.display().to_string(),
                        package_count: pkg_count,
                        bundle_count,
                    });
                }
            }
        }
    }

    list.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(list)
}

pub fn create_profile(name: &str, _template: Option<&str>) -> Result<ProfileInfo, String> {
    let clean = name.trim().to_ascii_lowercase();
    if clean.is_empty() {
        return Err("Profile 名称不能为空".into());
    }
    let root = profiles_root()?;
    let dir = root.join(&clean);
    if dir.exists() {
        return Err(format!("Profile「{clean}」已存在"));
    }
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建 Profile 目录: {e}"))?;

    let init_pkg = serde_json::json!({
        "name": format!("dsh-profile-{clean}"),
        "version": "1.0.0",
        "private": true,
        "dependencies": {},
        "dsh": {
            "bundles": []
        }
    });

    let _ = fs::write(
        dir.join("package.json"),
        serde_json::to_string_pretty(&init_pkg).unwrap_or_default(),
    );

    Ok(ProfileInfo {
        name: clean,
        path: dir.display().to_string(),
        is_active: false,
        package_count: 0,
        bundle_count: 0,
    })
}

pub fn delete_profile(name: &str) -> Result<(), String> {
    let clean = name.trim();
    if clean == "web" || clean == "desktop" || clean == "default" {
        return Err("系统内置 Profile 不可删除".into());
    }
    let root = profiles_root()?;
    let dir = root.join(clean);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| format!("无法删除 Profile: {e}"))?;
    }
    Ok(())
}
