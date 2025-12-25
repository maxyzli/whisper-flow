use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use std::process::Command;
use std::str::FromStr;
use macos_accessibility_client::accessibility;
use crate::utils::get_recordings_dir;

#[tauri::command]
pub fn check_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        // 這一行做兩件事：
        // 1. 回傳目前的權限狀態 (true/false)
        // 2. 如果是 false，它會告訴 macOS 跳出那個「拒絕/打開系統設定」的原生對話框
        return accessibility::application_is_trusted_with_prompt();
    }

    #[cfg(not(target_os = "macos"))]
    true // 非 macOS 預設回傳 true
}

#[tauri::command]
pub fn update_global_shortcut(app: AppHandle, shortcut_str: String) -> Result<(), String> {
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

#[tauri::command]
pub fn get_recordings_dir_cmd(app: AppHandle) -> Result<String, String> {
    let dir = get_recordings_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_recordings_dir(app: AppHandle) -> Result<(), String> {
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

#[tauri::command]
pub fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        // 這個指令會直接打開 macOS 的「安全性與隱私 -> 輔助使用」分頁
        Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .expect("Failed to open system settings");
    }
}
