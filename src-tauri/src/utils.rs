use crate::consts::MODELS;
use chrono::Local;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};

pub fn ensure_dir(path: &Path) -> Result<(), String> {
    if !path.exists() {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_recordings_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    ensure_dir(&app_dir)?;

    let recordings_dir = app_dir.join("recordings");
    ensure_dir(&recordings_dir)?;
    Ok(recordings_dir)
}

pub fn get_model_info(app: &AppHandle, model_type: &str) -> Result<(PathBuf, String), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // 如果傳入的 model_type 不在 MODELS 裡面，預設使用 small
    let target_model = if MODELS.iter().any(|(name, _)| *name == model_type) {
        model_type
    } else {
        "large-v3-turbo"
    };

    let filename = format!("ggml-{}.bin", target_model);
    let model_path = app_dir.join("models").join(&filename);

    let url = MODELS
        .iter()
        .find(|(name, _)| *name == target_model)
        .map(|(_, url)| url.to_string())
        .ok_or_else(|| format!("Unsupported model type: {}", target_model))?;

    Ok((model_path, url))
}

/// Creates a new per-recording session folder:
/// <app_data_dir>/recordings/<YYYY-MM-DD_HH-MM-SS>/
/// and returns paths for raw/wav/transcript files.
pub fn new_session_paths(
    app: &AppHandle,
) -> Result<(String, PathBuf, PathBuf, PathBuf, PathBuf), String> {
    let recordings_dir = get_recordings_dir(app)?;

    let session_id = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let session_dir = recordings_dir.join(&session_id);
    ensure_dir(&session_dir)?;

    let raw_path = session_dir.join("input.raw");
    let wav_path = session_dir.join("input_16k.wav");
    let transcript_path = session_dir.join("transcript.txt");

    Ok((session_id, session_dir, raw_path, wav_path, transcript_path))
}

/// Returns true if a process with pid still exists.
/// Uses: `kill -0 <pid>` (POSIX).
pub fn process_is_alive(pid: u32) -> bool {
    Command::new("kill")
        .args(["-0", &pid.to_string()])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Sends SIGINT and waits until the process exits (or times out).
pub async fn interrupt_and_wait(pid: u32, timeout_ms: u64) {
    let _ = Command::new("kill")
        .args(["-2", &pid.to_string()]) // SIGINT
        .output();

    let start = std::time::Instant::now();
    while process_is_alive(pid) && start.elapsed().as_millis() < timeout_ms as u128 {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    // As a last resort, if still alive after timeout, try SIGKILL.
    if process_is_alive(pid) {
        let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();
    }
}

/// Simulates a system-level Cmd+V paste action on macOS.
#[cfg(target_os = "macos")]
pub fn simulate_paste() {
    const K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE: i32 = 1;
    const K_CG_HID_EVENT_TAP: u32 = 0;
    const V_KEY: u16 = 9;
    const CMD_FLAG: u64 = 0x0010_0000; // kCGEventFlagMaskCommand

    type CGEventSourceRef = *mut std::ffi::c_void;
    type CGEventRef = *mut std::ffi::c_void;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventSourceCreate(state: i32) -> CGEventSourceRef;
        fn CGEventCreateKeyboardEvent(
            source: CGEventSourceRef,
            virtual_key: u16,
            key_down: bool,
        ) -> CGEventRef;
        fn CGEventSetFlags(event: CGEventRef, flags: u64);
        fn CGEventPost(tap: u32, event: CGEventRef);
        fn CFRelease(obj: *mut std::ffi::c_void);
    }

    unsafe {
        let source = CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE);

        // Key down: Cmd + V
        let event_down = CGEventCreateKeyboardEvent(source, V_KEY, true);
        if !event_down.is_null() {
            CGEventSetFlags(event_down, CMD_FLAG);
            CGEventPost(K_CG_HID_EVENT_TAP, event_down);
            CFRelease(event_down);
        }

        // Key up: Cmd + V
        let event_up = CGEventCreateKeyboardEvent(source, V_KEY, false);
        if !event_up.is_null() {
            CGEventSetFlags(event_up, CMD_FLAG);
            CGEventPost(K_CG_HID_EVENT_TAP, event_up);
            CFRelease(event_up);
        }

        if !source.is_null() {
            CFRelease(source);
        }
    }
}
