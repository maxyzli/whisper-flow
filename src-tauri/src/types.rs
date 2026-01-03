use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri_plugin_shell::process::CommandChild;

pub struct RecordingSession {
    pub id: String,
    pub dir: PathBuf,
    pub raw_path: PathBuf,
    pub wav_path: PathBuf,
    pub transcript_path: PathBuf,
    pub child: CommandChild,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ModelStatus {
    pub exists: bool,
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    pub progress: u8,
    pub total_bytes: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: String,
    pub text: String,
    pub timestamp: String,
}
