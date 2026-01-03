import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Waveform } from "./Waveform";

import { UILanguage } from "../i18n";

interface RecordingHintProps {
  isRecording?: boolean;
  isLoading?: boolean;
  standalone?: boolean;
  uiLanguage?: UILanguage;
}

export function RecordingHint({
  isRecording: initialRecording = false,
  isLoading: initialLoading = false,
  standalone = false,
}: RecordingHintProps) {
  const [isRecording, setIsRecording] = useState(initialRecording);
  const [isLoading, setIsLoading] = useState(initialLoading);

  const handleAbort = async () => {
    try {
      await invoke("abort_transcription");
    } catch (err) {
      console.error("Failed to abort:", err);
    }
  };

  // 同步初始狀態 (僅在非獨立模式下有效，由 Props 驅動)
  useEffect(() => {
    if (!standalone) {
      setIsRecording(initialRecording);
      setIsLoading(initialLoading);
    }
  }, [initialRecording, initialLoading, standalone]);

  // 監聽來自全域的狀態事件 (獨立視窗模式使用)
  useEffect(() => {
    if (!standalone) return;

    const unlistens: (() => void)[] = [];

    listen<boolean>("sync-recording-status", (event) => {
      setIsRecording(event.payload);
    }).then(u => unlistens.push(u));

    listen<boolean>("sync-loading-status", (event) => {
      setIsLoading(event.payload);
    }).then(u => unlistens.push(u));

    return () => {
      unlistens.forEach(u => u());
    };
  }, [standalone]);

  // 在獨立模式下，我們由主視窗控制視窗顯隱，所以這裡永遠渲染內容
  // 在主視窗模式下，才根據狀態判斷是否回傳 null
  if (!standalone && !isRecording && !isLoading) return null;

  return (
    <div className={standalone ? "standalone-hint-container" : "recording-hint"}>
      <div className={`hint-pill ${isLoading ? "processing" : ""} ${isRecording ? "recording" : ""}`}>
        {isRecording ? (
          <div className="waveform-container">
            <Waveform isRecording={isRecording} />
          </div>
        ) : (
          <>
            {isLoading ? (
              <div className="spinner-container" onClick={handleAbort} title="Cancel Processing">
                <div className="spinner"></div>
                <div className="stop-icon"></div>
              </div>
            ) : (
              <span className="hint-dot"></span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
