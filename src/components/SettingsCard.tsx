import { LANGUAGE_OPTIONS, ModelStatus } from "../constants";

interface SettingsCardProps {
  selectedModel: string;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  isRecording: boolean;
  isStarting: boolean;
  isLoading: boolean;
  shortcutKey: string;
  isRecordingShortcut: boolean;
  setIsRecordingShortcut: (isRecording: boolean) => void;
  withTimestamps: boolean;
  setWithTimestamps: (withTimestamps: boolean) => void;
  modelStatus: ModelStatus;
  downloading: boolean;
  downloadProgress: number;
  handleDownload: () => void;
  handleImportFile: () => void;
  recordingsDir: string;
  openRecordingsFolder: () => void;
}

export function SettingsCard({
  selectedModel,
  selectedLanguage,
  setSelectedLanguage,
  isRecording,
  isStarting,
  isLoading,
  shortcutKey,
  isRecordingShortcut,
  setIsRecordingShortcut,
  withTimestamps,
  setWithTimestamps,
  modelStatus,
  downloading,
  downloadProgress,
  handleDownload,
  handleImportFile,
  recordingsDir,
  openRecordingsFolder,
}: SettingsCardProps) {
  return (
    <section className="card settings-card">
      {/* 第一排：語言 & 快捷鍵 */}
      <div className="grid-row">
        <div className="input-group">
          <label>辨識語言</label>
          <select
            className="modern-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording || isStarting || isLoading}
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label>快捷鍵</label>
          <button
            className={`shortcut-btn ${isRecordingShortcut ? "active" : ""}`}
            onClick={() => setIsRecordingShortcut(true)}
            disabled={isRecording || isStarting}
          >
            {isRecordingShortcut
              ? "按下按鍵..."
              : shortcutKey.replace("Super", "Cmd").replace("Alt", "Opt")}
          </button>
        </div>
      </div>

      {/* 第三排：檔案匯入設定 (時間戳) */}
      <div
        className="input-group checkbox-wrapper"
        style={{ marginTop: "12px" }}
      >
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={withTimestamps}
            onChange={(e) => setWithTimestamps(e.target.checked)}
            disabled={isRecording || isStarting || isLoading}
          />
          <span className="checkmark"></span>
          匯入檔案時包含時間戳 (SRT 字幕格式)
        </label>
      </div>

      {/* 模型下載與檔案匯入按鈕 */}
      <div className="action-row" style={{ marginTop: "16px" }}>
        {!modelStatus.exists ? (
          downloading ? (
            <div className="progress-bar">
              <div
                className="fill"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          ) : (
            <button
              className="btn-primary full-width"
              onClick={handleDownload}
            >
              下載模型 ({selectedModel})
            </button>
          )
        ) : (
          <button
            className="btn-secondary full-width"
            onClick={handleImportFile}
            disabled={isRecording || isStarting || isLoading}
          >
            📂 匯入 影片/音訊 轉文字
          </button>
        )}
      </div>

      {/* Folder Info */}
      <div className="folder-row">
        <div className="folder-meta">
          <div className="folder-label">Recordings Folder</div>
          <div className="folder-path" title={recordingsDir || ""}>
            {recordingsDir || "讀取中..."}
          </div>
        </div>

        <div className="folder-actions">
          <button
            className="btn-secondary small"
            onClick={openRecordingsFolder}
            disabled={!recordingsDir}
            title="在 Finder 打開"
          >
            Open
          </button>
        </div>
      </div>
    </section>
  );
}