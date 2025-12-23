use futures_util::StreamExt;
use macos_accessibility_client::accessibility::application_is_trusted;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::str::FromStr;
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent, ShortcutState,
};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::io::AsyncWriteExt;

// -----------------------------
// Configuration
// -----------------------------
const MODELS: &[(&str, &str)] = &[
    (
        "tiny",
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    ),
    (
        "base",
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    ),
    (
        "small",
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    ),
    (
        "medium",
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
    ),
];

// -----------------------------
// Data structures
// -----------------------------
pub struct RecordingSession {
    pub id: String,
    pub dir: PathBuf,
    pub raw_path: PathBuf,
    pub wav_path: PathBuf,
    pub transcript_path: PathBuf,
    pub child: CommandChild,
}

pub struct AppState {
    pub session: Mutex<Option<RecordingSession>>,
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

// -----------------------------
// Helpers
// -----------------------------
fn ensure_dir(path: &Path) -> Result<(), String> {
    if !path.exists() {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn get_model_info(app: &AppHandle, model_type: &str) -> Result<(PathBuf, String), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let filename = format!("ggml-{}.bin", model_type);
    let model_path = app_dir.join("models").join(&filename);

    let url = MODELS
        .iter()
        .find(|(name, _)| *name == model_type)
        .map(|(_, url)| url.to_string())
        .ok_or_else(|| format!("Unsupported model type: {}", model_type))?;

    Ok((model_path, url))
}

/// Creates a new per-recording session folder:
/// <app_data_dir>/recordings/<YYYY-MM-DD_HH-MM-SS>/
/// and returns paths for raw/wav/transcript files.
fn new_session_paths(app: &AppHandle) -> Result<(String, PathBuf, PathBuf, PathBuf, PathBuf), String> {
    use chrono::Local;

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    ensure_dir(&app_dir)?;

    let recordings_dir = app_dir.join("recordings");
    ensure_dir(&recordings_dir)?;

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
fn process_is_alive(pid: u32) -> bool {
    Command::new("kill")
        .args(["-0", &pid.to_string()])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Sends SIGINT and waits until the process exits (or times out).
async fn interrupt_and_wait(pid: u32, timeout_ms: u64) {
    let _ = Command::new("kill")
        .args(["-2", &pid.to_string()]) // SIGINT
        .output();

    let start = std::time::Instant::now();
    while process_is_alive(pid) && start.elapsed().as_millis() < timeout_ms as u128 {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    // As a last resort, if still alive after timeout, try SIGKILL.
    if process_is_alive(pid) {
        let _ = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }
}

// -----------------------------
// Tauri Commands
// -----------------------------
#[tauri::command]
fn check_accessibility_permission() -> bool {
    application_is_trusted()
}

#[tauri::command]
async fn check_model_status(app: AppHandle, model_type: String) -> Result<ModelStatus, String> {
    let (model_path, _) = get_model_info(&app, &model_type)?;
    let mut exists = false;
    let mut size_bytes = 0;

    if model_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&model_path) {
            size_bytes = metadata.len();
            // Basic sanity threshold to avoid partially downloaded artifacts being treated as valid
            if size_bytes > 50 * 1024 * 1024 {
                exists = true;
            }
        }
    }

    Ok(ModelStatus {
        exists,
        path: model_path.to_string_lossy().to_string(),
        size_bytes,
    })
}

#[tauri::command]
async fn download_model(app: AppHandle, model_type: String) -> Result<String, String> {
    let (model_path, url) = get_model_info(&app, &model_type)?;
    let model_dir = model_path
        .parent()
        .ok_or_else(|| "Invalid model path".to_string())?;

    ensure_dir(model_dir)?;

    let tmp_path = model_path.with_extension("tmp");
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let total_size = response.content_length().unwrap_or(0);

    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let data = chunk.map_err(|e| e.to_string())?;
        file.write_all(&data).await.map_err(|e| e.to_string())?;
        downloaded += data.len() as u64;

        if total_size > 0 {
            let progress = ((downloaded as f64 / total_size as f64) * 100.0) as u8;
            let _ = app.emit(
                "download-progress",
                DownloadProgress {
                    progress: progress.min(100),
                    total_bytes: total_size,
                },
            );
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    tokio::fs::rename(tmp_path, model_path)
        .await
        .map_err(|e| e.to_string())?;

    Ok("Download Successful".into())
}

#[tauri::command]
async fn get_audio_devices(app: tauri::AppHandle) -> Result<Vec<AudioDevice>, String> {
    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(["-f", "avfoundation", "-list_devices", "true", "-i", ""])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    let mut devices = Vec::new();
    let mut is_audio_section = false;

    for line in stderr.lines() {
        if line.contains("AVFoundation audio devices:") {
            is_audio_section = true;
            continue;
        }
        if is_audio_section && line.contains("AVFoundation video devices:") {
            break;
        }
        if is_audio_section && line.contains('[') && line.contains(']') {
            let parts: Vec<&str> = line.split(']').collect();
            if parts.len() >= 2 {
                let id = parts[parts.len() - 2]
                    .split('[')
                    .last()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let name = parts.last().unwrap_or(&"").trim().to_string();

                if !id.is_empty() && !name.is_empty() && !name.contains("AVFoundation") {
                    devices.push(AudioDevice { id, name });
                }
            }
        }
    }

    if devices.is_empty() {
        devices.push(AudioDevice {
            id: "0".into(),
            name: "Default Microphone".into(),
        });
    }

    Ok(devices)
}

// Dynamically update global shortcut (register/unregister)
#[tauri::command]
fn update_global_shortcut(app: AppHandle, shortcut_str: String) -> Result<(), String> {
    println!("Updating shortcut to: {}", shortcut_str);

    // Best-effort: clear existing shortcuts
    let _ = app.global_shortcut().unregister_all();

    // Parse and register the new shortcut
    let shortcut = Shortcut::from_str(&shortcut_str).map_err(|e| e.to_string())?;
    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Start Recording
/// Creates a unique session folder per recording and writes raw audio there.
/// Returns the session_id for tracking.
#[tauri::command]
async fn start_recording(
    app: AppHandle,
    state: State<'_, AppState>,
    device_id: String,
) -> Result<String, String> {
    // Prevent double-trigger / re-entrancy
    let mut guard = state.session.lock().unwrap();
    if guard.is_some() {
        println!("[Rust] Recording already active. Ignoring start request.");
        return Ok("Already Recording".into());
    }

    let (session_id, session_dir, raw_path, wav_path, transcript_path) = new_session_paths(&app)?;

    println!(
        "--- [Debug] Start Recording (session: {}, device: {}) ---",
        session_id, device_id
    );

    // Spawn ffmpeg and capture events
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args([
            "-y",
            "-f",
            "avfoundation",
            "-i",
            &format!(":{}", device_id),
            "-vn",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-f",
            "s16le",
            raw_path.to_str().ok_or_else(|| "Invalid raw path".to_string())?,
        ])
        .spawn()
        .map_err(|e| e.to_string())?;

    // Emit "recording-ready" when ffmpeg is actually writing
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut is_ready = false;
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stderr(line) = event {
                let msg = String::from_utf8_lossy(&line);
                if msg.contains("size=") && !is_ready {
                    is_ready = true;

                    // Optional: start sound
                    thread::spawn(|| {
                        let _ = Command::new("afplay")
                            .arg("/System/Library/Sounds/Tink.aiff")
                            .output();
                    });

                    let _ = app_clone.emit("recording-ready", "ready");
                }
            }
        }
    });

    *guard = Some(RecordingSession {
        id: session_id.clone(),
        dir: session_dir,
        raw_path,
        wav_path,
        transcript_path,
        child,
    });

    Ok(session_id)
}

/// Stop & Transcribe
/// Stops the active ffmpeg process, converts raw -> wav, runs Whisper, and persists transcript.txt.
/// Returns transcript text (and session tag).
#[tauri::command]
async fn stop_and_transcribe(
    app: AppHandle,
    state: State<'_, AppState>,
    model_type: String,
) -> Result<String, String> {
    println!("--- [Debug] Stop requested ---");

    // Take session atomically (releases the lock quickly)
    let session = {
        let mut guard = state.session.lock().unwrap();
        guard.take()
    };

    let mut session = match session {
        Some(s) => s,
        None => return Err("No active recording session".into()),
    };

    let pid = session.child.pid();
    println!("Sending SIGINT to FFmpeg PID: {}...", pid);

    // Stop gracefully and wait until it actually exits (prevents partial writes / file races)
    interrupt_and_wait(pid, 3000).await;

    // Validate raw output
    if !session.raw_path.exists() {
        return Err(format!(
            "RAW audio file not found: {}",
            session.raw_path.display()
        ));
    }

    let raw_len = std::fs::metadata(&session.raw_path)
        .map_err(|e| e.to_string())?
        .len();

    println!("RAW file size: {} bytes", raw_len);

    if raw_len < 1000 {
        return Err("Recording too short".into());
    }

    // Convert to WAV
    println!("Converting to WAV: {}", session.wav_path.display());
    let convert_result = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args([
            "-y",
            "-f",
            "s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-i",
            session
                .raw_path
                .to_str()
                .ok_or_else(|| "Invalid raw path".to_string())?,
            session
                .wav_path
                .to_str()
                .ok_or_else(|| "Invalid wav path".to_string())?,
        ])
        .output()
        .await
        .map_err(|e| format!("Conversion failed: {}", e))?;

    if !convert_result.status.success() {
        let stderr = String::from_utf8_lossy(&convert_result.stderr);
        return Err(format!("FFmpeg conversion failed: {}", stderr));
    }

    // Run Whisper
    println!("Running Whisper...");
    let (model_path, _) = get_model_info(&app, &model_type)?;

    let whisper_output = app
        .shell()
        .sidecar("whisper-cli")
        .map_err(|e| e.to_string())?
        .args([
            "-m",
            model_path
                .to_str()
                .ok_or_else(|| "Invalid model path".to_string())?,
            "-f",
            session
                .wav_path
                .to_str()
                .ok_or_else(|| "Invalid wav path".to_string())?,
            "-t",
            "8",
            "-l",
            "zh",
            "-nt",
            "--prompt",
            "API, Python, SDE, Amazon, 繁體中文, 技術討論, Rust, React, debug",
        ])
        .output()
        .await
        .map_err(|e| format!("Whisper failed: {}", e))?;

    let transcript_text = String::from_utf8_lossy(&whisper_output.stdout).trim().to_string();
    let whisper_stderr = String::from_utf8_lossy(&whisper_output.stderr).to_string();

    // Persist transcript.txt (always write something for traceability)
    let transcript_body = if !transcript_text.is_empty() {
        transcript_text.clone()
    } else {
        format!("(empty)\n\nstderr:\n{}", whisper_stderr)
    };

    tokio::fs::write(&session.transcript_path, transcript_body)
        .await
        .map_err(|e| format!("Failed to write transcript: {}", e))?;

    // Optional: completion sounds
    if !transcript_text.is_empty() {
        thread::spawn(|| {
            let _ = Command::new("afplay")
                .arg("/System/Library/Sounds/Glass.aiff")
                .output();
        });
    } else {
        thread::spawn(|| {
            let _ = Command::new("afplay")
                .arg("/System/Library/Sounds/Basso.aiff")
                .output();
        });
    }

    // Return transcript + session id for UI tracking
    Ok(transcript_text)
}

// -----------------------------
// Helpers (add)
// -----------------------------
fn get_recordings_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    ensure_dir(&app_dir)?;

    let recordings_dir = app_dir.join("recordings");
    ensure_dir(&recordings_dir)?;
    Ok(recordings_dir)
}

// -----------------------------
// Tauri Commands (add)
// -----------------------------
#[tauri::command]
fn get_recordings_dir_cmd(app: AppHandle) -> Result<String, String> {
    let dir = get_recordings_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn open_recordings_dir(app: AppHandle) -> Result<(), String> {
    let dir = get_recordings_dir(&app)?;
    if !dir.exists() {
        return Err(format!("Recordings dir does not exist: {}", dir.display()));
    }

    // macOS: open in Finder
    Command::new("open")
        .arg(&dir)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok(())
}

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
        .manage(AppState {
            session: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            check_model_status,
            download_model,
            get_audio_devices,
            start_recording,
            stop_and_transcribe,
            check_accessibility_permission,
            update_global_shortcut,
            get_recordings_dir_cmd,
            open_recordings_dir
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
