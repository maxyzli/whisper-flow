use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;
use crate::types::{ModelStatus, DownloadProgress};
use crate::utils::{get_model_info, ensure_dir};

#[tauri::command]
pub async fn check_model_status(app: AppHandle, model_type: String) -> Result<ModelStatus, String> {
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
pub async fn download_model(app: AppHandle, model_type: String) -> Result<String, String> {
    let (model_path, url) = get_model_info(&app, &model_type)?;
    let model_dir = model_path
        .parent()
        .ok_or_else(|| "Invalid model path".to_string())?;

    ensure_dir(model_dir)?;

    let tmp_path = model_path.with_extension("tmp");
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;

    // Note: Some networks might not provide Content-Length; default to 0.
    let total_size = response.content_length().unwrap_or(0);

    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;

    // Optimization: Track last progress to prevent spamming the frontend event loop
    let mut last_progress: u8 = 0;

    while let Some(chunk) = stream.next().await {
        let data = chunk.map_err(|e| e.to_string())?;
        file.write_all(&data).await.map_err(|e| e.to_string())?;
        downloaded += data.len() as u64;

        if total_size > 0 {
            let progress = ((downloaded as f64 / total_size as f64) * 100.0) as u8;

            // Only emit event if integer progress percentage changed
            if progress > last_progress {
                last_progress = progress;
                let _ = app.emit(
                    "download-progress",
                    DownloadProgress {
                        progress,
                        total_bytes: total_size,
                    },
                );
            }
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    tokio::fs::rename(tmp_path, model_path)
        .await
        .map_err(|e| e.to_string())?;

    Ok("Download Successful".into())
}
