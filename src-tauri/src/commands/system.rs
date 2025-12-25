use tauri::AppHandle;
use std::process::Command;
use macos_accessibility_client::accessibility;
use cpal::traits::{HostTrait, DeviceTrait, StreamTrait};

#[tauri::command]
pub fn check_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        return accessibility::application_is_trusted();
    }

    #[cfg(not(target_os = "macos"))]
    true
}

#[tauri::command]
pub fn prompt_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        return accessibility::application_is_trusted_with_prompt();
    }

    #[cfg(not(target_os = "macos"))]
    true
}

#[tauri::command]
pub fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .expect("Failed to open system settings");
    }
}

#[tauri::command]
pub async fn request_microphone_permission(_app: AppHandle) -> bool {
    // 使用 cpal 嘗試建立一個 input stream，這是觸發 macOS 麥克風權限最可靠的方法
    let host = cpal::default_host();
    
    // 1. 嘗試取得預設輸入裝置
    let device = match host.default_input_device() {
        Some(d) => d,
        None => return false, // 連裝置都找不到，可能是沒權限或真的沒裝置
    };

    // 2. 嘗試取得預設輸入設定
    let config = match device.default_input_config() {
        Ok(c) => c,
        Err(_) => return false,
    };

    // 3. 嘗試建立 Stream。這一步是關鍵，macOS 會在這裡攔截並詢問權限。
    // 我們不需要真的錄音，只要建立 stream 成功，或因權限錯誤失敗即可。
    let err_fn = move |err| {
        eprintln!("an error occurred on stream: {}", err);
    };

    let stream = device.build_input_stream(
        &config.into(),
        move |_data: &[f32], _: &_| {}, // dummy callback
        err_fn,
        None,
    );

    match stream {
        Ok(s) => {
            // Stream 建立成功，代表有權限
            // 我們可以稍微 play 一下再 drop，確保系統註冊到狀態
            let _ = s.play(); 
            std::thread::sleep(std::time::Duration::from_millis(200));
            true
        },
        Err(e) => {
            eprintln!("Failed to build input stream: {}", e);
            // 如果是因為權限錯誤，這裡會失敗。
            // 但有趣的是，在 macOS 上，第一次呼叫通常會導致 App 被暫停等待使用者回應，
            // 或者直接失敗。
            // 由於我們無法從這裡得知使用者點了什麼（那是 OS 的 UI），
            // 我們只能回傳 false，讓前端引導使用者去系統設定檢查。
            false
        }
    }
}

#[tauri::command]
pub fn update_global_shortcut(app: AppHandle, shortcut_str: String) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
    use std::str::FromStr;

    println!("Updating shortcut to: {}", shortcut_str);

    let _ = app.global_shortcut().unregister_all();

    let shortcut = Shortcut::from_str(&shortcut_str).map_err(|e| e.to_string())?;
    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_recordings_dir_cmd(app: AppHandle) -> Result<String, String> {
    use crate::utils::get_recordings_dir;
    let dir = get_recordings_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_recordings_dir(app: AppHandle) -> Result<(), String> {
    use crate::utils::get_recordings_dir;
    let dir = get_recordings_dir(&app)?;
    if !dir.exists() {
        return Err(format!("Recordings dir does not exist: {}", dir.display()));
    }

    Command::new("open")
        .arg(&dir)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok(())
}
