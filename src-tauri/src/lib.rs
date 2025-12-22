use futures_util::StreamExt;
use macos_accessibility_client::accessibility::application_is_trusted;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
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

// --- 設定 ---
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

// --- 資料結構 ---
pub struct AppState {
    pub recording_process: Mutex<Option<CommandChild>>,
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

// --- 輔助函式 ---

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

fn get_audio_paths(app: &AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    let raw_path = app_dir.join("input.raw");
    let wav_path = app_dir.join("input_16k.wav");
    Ok((raw_path, wav_path))
}

// --- Tauri Commands ---

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
    let model_dir = model_path.parent().unwrap();
    if !model_dir.exists() {
        std::fs::create_dir_all(model_dir).map_err(|e| e.to_string())?;
    }

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
            let progress = (downloaded as f64 / total_size as f64 * 100.0) as u8;
            app.emit(
                "download-progress",
                DownloadProgress {
                    progress,
                    total_bytes: total_size,
                },
            )
            .unwrap();
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
        if is_audio_section && line.contains("[") && line.contains("]") {
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

// --- 更新快捷鍵 (動態註冊) ---
#[tauri::command]
fn update_global_shortcut(app: AppHandle, shortcut_str: String) -> Result<(), String> {
    println!("Updating shortcut to: {}", shortcut_str);
    
    // 1. 清除舊的
    let _ = app.global_shortcut().unregister_all();

    // 2. 解析新的字串
    let shortcut = Shortcut::from_str(&shortcut_str).map_err(|e| e.to_string())?;

    // 3. 註冊
    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// 4. 開始錄音 (Start Recording)
#[tauri::command]
async fn start_recording(
    app: AppHandle,
    state: State<'_, AppState>,
    device_id: String,
) -> Result<String, String> {
    // 🔥 修正 1: 立即鎖定並檢查狀態，防止雙重觸發
    let mut process_guard = state.recording_process.lock().unwrap();
    
    if process_guard.is_some() {
        println!("⚠️ [Rust] 錄音已在進行中，忽略此次請求。");
        return Ok("Already Recording".into());
    }

    let (raw_path, _) = get_audio_paths(&app)?;

    if raw_path.exists() {
        let _ = std::fs::remove_file(&raw_path);
    }

    println!("--- [Debug] Start Recording (Device: {}) ---", device_id);

    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args([
            "-y",
            "-f", "avfoundation",
            "-i", &format!(":{}", device_id),
            "-vn",
            "-ar", "16000",
            "-ac", "1",
            "-f", "s16le",
            raw_path.to_str().unwrap(),
        ])
        .spawn()
        .map_err(|e| e.to_string())?;

    // 播放提示音
    thread::spawn(|| {
        let _ = Command::new("afplay")
            .arg("/System/Library/Sounds/Tink.aiff")
            .output();
    });

    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut is_ready = false;
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stderr(line) = event {
                let msg = String::from_utf8_lossy(&line);
                if msg.contains("size=") && !is_ready {
                    is_ready = true;
                    println!("[FFmpeg] Recording started successfully");
                    let _ = app_clone.emit("recording-ready", "ready");
                }
            }
        }
    });

    // 存入 child
    *process_guard = Some(child);
    Ok("Recording Started".into())
}

/// 5. 停止並轉譯 (Stop & Transcribe)
#[tauri::command]
async fn stop_and_transcribe(
    app: AppHandle,
    state: State<'_, AppState>,
    model_type: String,
) -> Result<String, String> {
    println!("--- [Debug] Stop requested ---");

    let child_process_opt = {
        let mut process_guard = state.recording_process.lock().unwrap();
        process_guard.take()
    };

    if let Some(child) = child_process_opt {
        let pid = child.pid();
        println!("Sending SIGINT (Ctrl+C) to FFmpeg PID: {}...", pid);
        
        // 🔥 修正 2: 使用系統 kill -2 發送 SIGINT 訊號
        // 這會讓 FFmpeg 認為使用者按了 Ctrl+C，從而優雅地 flush buffer 並關閉
        let _ = Command::new("kill")
            .args(["-2", &pid.to_string()])
            .output();
            
        // 🔥 修正 3: 等待緩衝區寫入 (500ms)
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    } else {
        return Err("No active recording session".into());
    }

    let (raw_path, wav_path) = get_audio_paths(&app)?;

    if !raw_path.exists() {
        return Err("RAW audio file not found".into());
    }

    let raw_metadata = std::fs::metadata(&raw_path).unwrap();
    println!("RAW File Size: {} bytes", raw_metadata.len());

    if raw_metadata.len() < 1000 {
        return Err("Recording too short".into());
    }

    println!("Converting to WAV...");
    let convert_result = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args([
            "-y", "-f", "s16le", "-ar", "16000", "-ac", "1",
            "-i", raw_path.to_str().unwrap(),
            wav_path.to_str().unwrap(),
        ])
        .output()
        .await
        .map_err(|e| format!("Conversion failed: {}", e))?;

    if !convert_result.status.success() {
        return Err("FFmpeg conversion failed".into());
    }

    println!("Running Whisper...");
    let (model_path, _) = get_model_info(&app, &model_type)?;
    
    let whisper_output = app
        .shell()
        .sidecar("whisper-cli")
        .map_err(|e| e.to_string())?
        .args([
            "-m", model_path.to_str().unwrap(),
            "-f", wav_path.to_str().unwrap(),
            "-t", "8", "-l", "zh", "-nt",
            "--prompt", "API, Python, SDE, Amazon, 繁體中文, 技術討論, Rust, React, debug",
        ])
        .output()
        .await
        .map_err(|e| format!("Whisper failed: {}", e))?;

    let result_text = String::from_utf8_lossy(&whisper_output.stdout).trim().to_string();
    
    if result_text.is_empty() {
        let err = String::from_utf8_lossy(&whisper_output.stderr);
        Ok(format!("(無內容) Debug: {}", err))
    } else {
        Ok(result_text)
    }
}

// --- Entry Point ---
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app: &AppHandle, _shortcut: &Shortcut, event: ShortcutEvent| {
                    if event.state == ShortcutState::Pressed {
                        println!("🎤 [Rust] Shortcut Triggered!");
                        let _ = app.emit("shortcut-event", "toggle-recording");
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AppState {
            recording_process: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            check_model_status,
            download_model,
            get_audio_devices,
            start_recording,
            stop_and_transcribe,
            check_accessibility_permission,
            update_global_shortcut
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