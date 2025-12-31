import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Waveform } from "./Waveform";

interface RecordingHintProps {
  isRecording?: boolean;
  isLoading?: boolean;
  standalone?: boolean;
}

export function RecordingHint({
  isRecording: initialRecording = false,
  isLoading: initialLoading = false,
  standalone = false
}: RecordingHintProps) {
  const [isRecording, setIsRecording] = useState(initialRecording);
  const [isLoading, setIsLoading] = useState(initialLoading);

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
      console.log("Hint Window: Received recording status", event.payload);
      setIsRecording(event.payload);
    }).then(u => unlistens.push(u));

    listen<boolean>("sync-loading-status", (event) => {
      console.log("Hint Window: Received loading status", event.payload);
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
            <span className="hint-dot"></span>
            <span className="hint-text">
              {isLoading ? "AI 正在轉錄中..." : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
