import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Waveform } from "./Waveform";
import { translations, UILanguage } from "../i18n";

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
  uiLanguage: initialLanguage = "zh"
}: RecordingHintProps) {
  const [isRecording, setIsRecording] = useState(initialRecording);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [lang, setLang] = useState<UILanguage>(initialLanguage);

  // 同步初始狀態 (僅在非獨立模式下有效，由 Props 驅動)
  useEffect(() => {
    if (!standalone) {
      setIsRecording(initialRecording);
      setIsLoading(initialLoading);
      if (initialLanguage) setLang(initialLanguage);
    }
  }, [initialRecording, initialLoading, standalone, initialLanguage]);

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

    listen<UILanguage>("sync-language", (event) => {
      setLang(event.payload);
    }).then(u => unlistens.push(u));

    return () => {
      unlistens.forEach(u => u());
    };
  }, [standalone]);

  const t = translations[lang] || translations.zh;

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
              {isLoading ? t.tagProcessing : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
