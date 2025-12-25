use std::sync::Mutex;
use tauri::{AppHandle, Emitter, WindowEvent, Manager};
use tauri_plugin_global_shortcut::{Shortcut, ShortcutEvent, ShortcutState};

pub mod commands;
pub mod consts;
pub mod state;
pub mod types;
pub mod utils;

use crate::state::AppState;

// -----------------------------
// Entry point
// -----------------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let win = app.get_webview_window("recording-hint");
            if let Some(window) = win {
                #[cfg(target_os = "macos")]
                {
                    use objc2::rc::Retained;
                    use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior, NSColor};
                    
                    // 取得底層 NSWindow 指標
                    let ns_window_ptr = window.ns_window().unwrap() as *mut NSWindow;
                    
                    unsafe {
                        let ns_window = Retained::retain(ns_window_ptr).unwrap();
                        
                        // 1. 設定背景透明
                        ns_window.setBackgroundColor(Some(&NSColor::clearColor()));
                        
                        // 2. 設定非不透明
                        ns_window.setOpaque(false);
                        
                        // 3. 移除陰影
                        ns_window.setHasShadow(false);
                        
                        // 4. 設定視窗行為 (使用 objc2-app-kit 的簡短 enum 名稱)
                        ns_window.setCollectionBehavior(
                            NSWindowCollectionBehavior::CanJoinAllSpaces
                            | NSWindowCollectionBehavior::Transient
                            | NSWindowCollectionBehavior::IgnoresCycle
                        );
                    }
                }
            }
            Ok(())
        })
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app: &AppHandle, _shortcut: &Shortcut, event: ShortcutEvent| {
                    if event.state == ShortcutState::Pressed {
                        println!("[Rust] Shortcut triggered");
                        let _ = app.emit("shortcut-event", "toggle-recording");
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            session: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // Model commands
            commands::model::check_model_status,
            commands::model::download_model,
            
            // Audio commands
            commands::audio::get_audio_devices,
            commands::audio::start_recording,
            commands::audio::stop_and_transcribe,
            commands::audio::transcribe_external_file,

            // System commands
            commands::system::check_accessibility_permission,
            commands::system::prompt_accessibility_permission,
            commands::system::request_microphone_permission,
            commands::system::update_global_shortcut,
            commands::system::get_recordings_dir_cmd,
            commands::system::open_recordings_dir,
            commands::system::open_accessibility_settings
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                window.hide().unwrap();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}