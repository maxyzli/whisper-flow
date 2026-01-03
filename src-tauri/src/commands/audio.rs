use crate::state::AppState;
use crate::types::{AudioDevice, RecordingSession};
use crate::utils::{get_model_info, interrupt_and_wait, new_session_paths, simulate_paste};
use std::process::Command;
use std::thread;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn get_audio_devices(app: tauri::AppHandle) -> Result<Vec<AudioDevice>, String> {
    // 嘗試執行 ffmpeg 指令
    let output_result = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(["-f", "avfoundation", "-list_devices", "true", "-i", ""])
        .output()
        .await;

    // 定義預設設備，以便在失敗時回傳
    let default_device = AudioDevice {
        id: "0".into(),
        name: "Default Microphone".into(),
    };

    let output = match output_result {
        Ok(o) => o,
        Err(e) => {
            println!("[Warn] Failed to run ffmpeg list_devices: {}", e);
            return Ok(vec![default_device]);
        }
    };

    let stderr = String::from_utf8_lossy(&output.stderr);

    // 即使 ffmpeg 回傳 error (因為 -i "" 失敗)，我們仍然嘗試解析 stderr 中的設備列表
    // 只有當真的解析不出東西時，才當作失敗

    let mut devices = Vec::new();
    let mut is_audio_section = false;

    for line in stderr.lines() {
        // 只處理包含 AVFoundation 的行，過濾掉最後的 Error opening input 等錯誤訊息
        if !line.contains("AVFoundation") {
            continue;
        }

        if line.contains("AVFoundation audio devices:") {
            is_audio_section = true;
            continue;
        }
        if is_audio_section && line.contains("AVFoundation video devices:") {
            break;
        }

        // 解析格式如: [AVFoundation indev @ 0x...] [0] MacBook Pro Microphone
        if is_audio_section && line.contains('[') && line.contains(']') {
            let parts: Vec<&str> = line.split(']').collect();
            // 預期至少有三個部分：[AVFoundation...], [ID], Name
            if parts.len() >= 3 {
                let id = parts[parts.len() - 2]
                    .split('[')
                    .last()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let name = parts.last().unwrap_or(&"").trim().to_string();

                // 再次驗證 ID 是否為數字且名稱不為空
                if !id.is_empty() && id.chars().all(|c| c.is_numeric()) && !name.is_empty() {
                    devices.push(AudioDevice { id, name });
                }
            }
        }
    }

    if devices.is_empty() {
        println!("[Warn] No devices parsed. FFmpeg stderr:\n{}", stderr);
        devices.push(default_device);
    }

    Ok(devices)
}

/// Start Recording
/// Creates a unique session folder per recording and writes raw audio there.
/// Returns the session_id for tracking.
#[tauri::command(rename_all = "camelCase")]
pub async fn start_recording(
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

    let (session_id, session_dir, raw_path, _, transcript_path) = new_session_paths(&app)?;

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
            "-filter_complex",
            "[0:a]asplit=2[rec][meter];[meter]ebur128=metadata=1,anullsink",
            "-map",
            "[rec]",
            "-vn",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-f",
            "s16le",
            raw_path
                .to_str()
                .ok_or_else(|| "Invalid raw path".to_string())?,
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

                // --- 1. Ready Check ---
                if msg.contains("size=") && !is_ready {
                    is_ready = true;
                    let _ = app_clone.emit("recording-ready", "ready");
                }

                // --- 2. Volume Check (from ebur128) ---
                if let Some(m_pos) = msg.find("M:") {
                    // Extract the part after "M:"
                    let after_m = &msg[m_pos + 2..];

                    // Find the start of the number (skip spaces)
                    if let Some(start_offset) = after_m.find(|c: char| c == '-' || c.is_numeric()) {
                        let rest = &after_m[start_offset..];

                        // Find the end of the number
                        let end_pos = rest
                            .find(|c: char| !c.is_numeric() && c != '.' && c != '-')
                            .unwrap_or(rest.len());

                        let val_str = &rest[..end_pos];

                        if let Ok(lufs) = val_str.parse::<f32>() {
                            // Mapping: -70 (Silence) -> -10 (Max)
                            let normalized = ((lufs + 70.0) / 50.0).clamp(0.0, 1.8);
                            let _ = app_clone.emit("audio-level", normalized * 1.5);
                        }
                    }
                }
            }
        }
    });

    // Populate the session state
    *guard = Some(RecordingSession {
        id: session_id.clone(),
        dir: session_dir,
        raw_path,
        wav_path: transcript_path.with_file_name("input_16k.wav"), // reconstruct for consistency
        transcript_path,
        child,
    });

    Ok(session_id)
}

/// Stop & Transcribe
/// Stops the active ffmpeg process, converts raw -> wav, runs Whisper, and persists transcript.txt.
/// Returns transcript text (and session tag).
#[tauri::command(rename_all = "camelCase")]
pub async fn stop_and_transcribe(
    app: AppHandle,
    state: State<'_, AppState>,
    model_type: String,
    language: String,
    prompt: String,
) -> Result<String, String> {
    println!("--- [Debug] Stop requested (Lang: {}) ---", language);

    // Take session atomically (releases the lock quickly)
    let session = {
        let mut guard = state.session.lock().unwrap();
        guard.take()
    };

    let session = match session {
        Some(s) => s,
        None => return Err("No active recording session".into()),
    };

    let pid = session.child.pid();
    println!("Sending SIGINT to FFmpeg PID: {}...", pid);

    // Stop gracefully and wait until it actually exits
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
            &language,
            "-nt", // No timestamps for quick dictation
            "--prompt",
            &prompt,
        ])
        .output()
        .await
        .map_err(|e| format!("Whisper failed: {}", e))?;

    let transcript_text = String::from_utf8_lossy(&whisper_output.stdout)
        .trim()
        .to_string();
    let whisper_stderr = String::from_utf8_lossy(&whisper_output.stderr).to_string();

    // Persist transcript.txt
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
        // Auto-Copy (Backend is more reliable than Frontend writeText)
        let _ = app.clipboard().write_text(transcript_text.clone());

        #[cfg(target_os = "macos")]
        {
            // Auto-Paste: Simulate Cmd+V
            // Small delay to ensure clipboard is ready
            thread::spawn(|| {
                thread::sleep(std::time::Duration::from_millis(50));
                simulate_paste();
            });
        }

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

    Ok(transcript_text)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn transcribe_external_file(
    app: AppHandle,
    file_path: String,
    model_type: String,
    language: String,
    with_timestamps: bool,
    prompt: String,
) -> Result<String, String> {
    println!(
        "--- [Debug] Processing external file: {} (Lang: {}, Timestamps: {}) ---",
        file_path, language, with_timestamps
    );

    // 1. Create a new Session folder
    let (_, _, _, wav_path, transcript_path) = new_session_paths(&app)?;

    // 2. Use FFmpeg to convert input (MP4/MP3/etc) to 16kHz WAV
    println!("Converting to WAV...");
    let convert_result = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args([
            "-y",
            "-i",
            &file_path,
            "-vn",
            "-ar",
            "16000",
            "-ac",
            "1",
            wav_path
                .to_str()
                .ok_or_else(|| "Invalid wav path".to_string())?,
        ])
        .output()
        .await
        .map_err(|e| format!("FFmpeg execution failed: {}", e))?;

    if !convert_result.status.success() {
        let stderr = String::from_utf8_lossy(&convert_result.stderr);
        return Err(format!("FFmpeg conversion failed: {}", stderr));
    }

    // 3. Prepare Whisper parameters
    println!("Running Whisper...");
    let (model_path, _) = get_model_info(&app, &model_type)?;

    let mut whisper_args = vec![
        "-m".to_string(),
        model_path.to_str().unwrap().to_string(),
        "-f".to_string(),
        wav_path.to_str().unwrap().to_string(),
        "-t".to_string(),
        "8".to_string(),
        "-l".to_string(),
        language.clone(),
        "--prompt".to_string(),
        prompt.clone(),
    ];

    // Toggle between timestamps (SRT) and plain text
    if with_timestamps {
        // -osrt outputs a .srt file.
        // whisper.cpp convention: input.wav -> input.wav.srt
        whisper_args.push("-osrt".to_string());
    } else {
        // -nt means No Timestamps (plain text to stdout)
        whisper_args.push("-nt".to_string());
    }

    // 4. Run Whisper
    let whisper_output = app
        .shell()
        .sidecar("whisper-cli")
        .map_err(|e| e.to_string())?
        .args(whisper_args)
        .output()
        .await
        .map_err(|e| format!("Whisper failed: {}", e))?;

    let final_text: String;

    if with_timestamps {
        // Attempt to read the generated .srt file
        // Since input was `.../input_16k.wav`, output should be `.../input_16k.wav.srt`
        let srt_path = wav_path.with_extension("wav.srt");

        if srt_path.exists() {
            println!("Reading generated SRT file: {:?}", srt_path);
            final_text = tokio::fs::read_to_string(&srt_path)
                .await
                .map_err(|e| format!("Failed to read SRT file: {}", e))?;
        } else {
            // Fallback to stdout if SRT file generation failed
            println!("Warning: SRT file not found, falling back to stdout");
            final_text = String::from_utf8_lossy(&whisper_output.stdout)
                .trim()
                .to_string();
        }
    } else {
        // Plain text mode: read directly from stdout
        final_text = String::from_utf8_lossy(&whisper_output.stdout)
            .trim()
            .to_string();
    }

    let whisper_stderr = String::from_utf8_lossy(&whisper_output.stderr).to_string();

    // 5. Persist and return
    let transcript_body = if !final_text.is_empty() {
        final_text.clone()
    } else {
        format!("(empty)\n\nstderr:\n{}", whisper_stderr)
    };

    tokio::fs::write(&transcript_path, transcript_body)
        .await
        .map_err(|e| format!("Failed to write transcript: {}", e))?;

    // Success sound & Auto-copy
    if !final_text.is_empty() {
        let _ = app.clipboard().write_text(final_text.clone());
        thread::spawn(|| {
            let _ = Command::new("afplay")
                .arg("/System/Library/Sounds/Glass.aiff")
                .output();
        });
    }

    Ok(final_text)
}
