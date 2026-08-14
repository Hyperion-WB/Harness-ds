mod agent;
mod commands;
mod harness;
mod launch;
mod plugins;
mod providers;
mod settings;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_window_state::StateFlags;

use commands::AppState;

fn focus_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(true) {
            let _ = window.hide();
        } else {
            focus_main_window(app);
        }
    }
}

fn window_state_flags() -> StateFlags {
    StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED | StateFlags::FULLSCREEN
}

fn schedule_agent_auto_update(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        // Initial delay so UI can bootstrap first.
        tokio::time::sleep(Duration::from_secs(8)).await;
        while let Some(state) = app.try_state::<AppState>() {
            let settings = match state.settings.lock() {
                Ok(guard) => guard.clone(),
                Err(_) => break,
            };
            if settings.agent_auto_update {
                match agent::agent_status(&settings).await {
                    Ok(status) if status.update_available => {
                        let _ = app.emit("agent://update-available", &status);
                        if let Ok(updated) = agent::install_agent(&settings).await {
                            let _ = app.emit("agent://updated", &updated);
                            let current = state.harness.snapshot().await;
                            if let Some(workspace) = current.workspace {
                                let _ = state.harness.stop(&app).await;
                                let _ = state.harness.start(&app, &settings, workspace).await;
                            }
                        }
                    }
                    Ok(status) => {
                        let _ = app.emit("agent://status", &status);
                    }
                    Err(error) => {
                        eprintln!("agent update check failed: {error}");
                    }
                }
            }
            tokio::time::sleep(Duration::from_secs(6 * 60 * 60)).await;
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::load().unwrap_or_else(|error| AppState::fallback(&error));
    let auto_start = state
        .settings
        .lock()
        .map(|s| s.auto_start)
        .unwrap_or(false);
    let shortcut_enabled = state
        .settings
        .lock()
        .map(|s| s.global_shortcut_enabled)
        .unwrap_or(true);

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }
                    let toggle = commands::get_default_shortcut();
                    if shortcut == &toggle {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(window_state_flags())
                .with_filter(|label| label == "main")
                .build(),
        )
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings_patch,
            commands::get_api_key_present,
            commands::get_provider_keys_status,
            commands::set_stored_api_key,
            commands::set_provider_api_key,
            commands::list_model_providers,
            commands::upsert_model_provider,
            commands::delete_model_provider,
            commands::set_default_model,
            commands::list_plugins,
            commands::add_plugin,
            commands::remove_plugin,
            commands::upsert_mcp_server,
            commands::delete_mcp_server,
            commands::pick_workspace,
            commands::start_harness,
            commands::stop_harness,
            commands::harness_status,
            commands::doctor,
            commands::get_agent_status,
            commands::update_agent,
            commands::open_in_editor,
            commands::open_in_terminal,
            commands::reveal_in_file_manager,
            commands::get_storage_info,
            commands::clear_cache,
            commands::open_storage_dir,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();

            if auto_start {
                use tauri_plugin_autostart::ManagerExt;
                let _ = app.autolaunch().enable();
            }

            if shortcut_enabled {
                let shortcut = commands::get_default_shortcut();
                app.global_shortcut()
                    .register(shortcut)
                    .map_err(|error| format!("注册全局快捷键失败: {error}"))?;
            }

            let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
            let check_agent_item =
                MenuItemBuilder::with_id("check_agent", "检查 Agent 更新").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &check_agent_item, &quit_item])
                .build()?;
            let quitting = Arc::new(AtomicBool::new(false));
            let quitting_for_menu = quitting.clone();
            TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::NotFound, "missing tray icon")
                })?)
                .tooltip("DeepSeek Harness")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => focus_main_window(app),
                    "check_agent" => {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Some(state) = app.try_state::<AppState>() {
                                let settings = state
                                    .settings
                                    .lock()
                                    .map(|s| s.clone())
                                    .unwrap_or_default();
                                if let Ok(status) = agent::agent_status(&settings).await {
                                    let _ = app.emit("agent://status", status);
                                }
                            }
                        });
                    }
                    "quit" => {
                        quitting_for_menu.store(true, Ordering::SeqCst);
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Some(state) = app.try_state::<AppState>() {
                                let _ = state.harness.stop(&app).await;
                            }
                            app.exit(0);
                        });
                    }
                    _ => {}
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let app_handle = handle.clone();
                let quitting_for_window = quitting.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        if quitting_for_window.load(Ordering::SeqCst) {
                            return;
                        }
                        let app = app_handle.clone();
                        let close_to_tray = app
                            .try_state::<AppState>()
                            .map(|state| commands::close_to_tray(&state))
                            .unwrap_or(false);
                        if close_to_tray {
                            api.prevent_close();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                            return;
                        }
                        quitting_for_window.store(true, Ordering::SeqCst);
                        api.prevent_close();
                        tauri::async_runtime::spawn(async move {
                            if let Some(state) = app.try_state::<AppState>() {
                                let _ = state.harness.stop(&app).await;
                            }
                            app.exit(0);
                        });
                    }
                });
            }

            schedule_agent_auto_update(handle.clone());
            let _ = handle.emit("host://ready", true);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
