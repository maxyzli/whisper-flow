use crate::types::HistoryItem;
use crate::utils::get_recordings_dir;
use std::fs;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_history(app: AppHandle) -> Result<Vec<HistoryItem>, String> {
    let recordings_dir = get_recordings_dir(&app)?;
    if !recordings_dir.exists() {
        return Ok(vec![]);
    }

    let mut history = Vec::new();

    let entries = fs::read_dir(recordings_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_dir() {
            let session_id = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            let transcript_path = path.join("transcript.txt");
            if transcript_path.exists() {
                let text = fs::read_to_string(&transcript_path).unwrap_or_default();

                // session_id is "YYYY-MM-DD_HH-MM-SS"
                history.push(HistoryItem {
                    id: session_id.clone(),
                    text,
                    timestamp: session_id,
                });
            }
        }
    }

    // Sort by session_id descending (newest first)
    history.sort_by(|a, b| b.id.cmp(&a.id));

    Ok(history)
}

#[tauri::command]
pub async fn delete_history_item(app: AppHandle, id: String) -> Result<(), String> {
    let recordings_dir = get_recordings_dir(&app)?;
    let item_dir = recordings_dir.join(id);

    if item_dir.exists() && item_dir.is_dir() {
        fs::remove_dir_all(item_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}
