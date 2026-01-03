use crate::types::RecordingSession;
use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;

pub struct AppState {
    pub session: Mutex<Option<RecordingSession>>,
    pub processing_child: Mutex<Option<CommandChild>>,
}
