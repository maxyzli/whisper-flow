use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
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
