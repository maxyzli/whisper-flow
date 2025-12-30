import { LANGUAGE_OPTIONS, ModelStatus, AudioDevice } from "../constants";

interface SettingsCardProps {
  // Audio Devices
  devices: AudioDevice[];
  selectedDevice: string;
  setSelectedDevice: (id: string) => void;
  fetchDevices: () => void;

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
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  modelStatus: ModelStatus;
  downloading: boolean;
  downloadProgress: number;
  handleDownload: () => void;
  handleImportFile: () => void;
  recordingsDir: string;
  openRecordingsFolder: () => void;
}

export function SettingsCard({
  devices,
  selectedDevice,
  setSelectedDevice,
  fetchDevices,
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
  customPrompt,
  setCustomPrompt,
  modelStatus,
  downloading,
  downloadProgress,
  handleDownload,
  handleImportFile,
  recordingsDir,
  openRecordingsFolder,
}: SettingsCardProps) {
  return (
    <section className="settings-page-content">
      {/* 1. 錄音設定 */}
      <div className="settings-group">
        <h3>🎙️ 錄音設定</h3>
        <div className="input-group">
          <label>輸入設備</label>
          <div className="device-select-row">
            <select
              className="modern-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={isRecording}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              className="icon-btn"
              onClick={fetchDevices}
              title="重新整理設備"
            >
              ↻
            </button>
          </div>
        </div>

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
      </div>

      {/* 2. AI 模型與提示詞 */}
      <div className="settings-group">
        <h3>🧠 AI 模型與上下文</h3>

        <div className="input-group">
          <label>自定義提示詞 (提高專有名詞辨識率)</label>
          <textarea
            className="modern-textarea"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="例如：術語：API, Rust, React. 語言：中英混雜。"
            disabled={isRecording || isStarting || isLoading}
            style={{ minHeight: "80px" }}
          />
          <p className="helper-text">
            在此輸入你常用的專有名詞，Whisper 會優先參考這些詞彙。
          </p>
        </div>

        {!modelStatus.exists ? (
          downloading ? (
            <div className="download-container full-width">
              <div className="progress-label">
                <span>正在初始化 AI 模型...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="fill"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <button
              className="btn-primary full-width"
              onClick={handleDownload}
            >
              下載 AI 語音辨識模型 (約 1.5GB)
            </button>
          )
        ) : (
          <div className="model-status-tag">
            <span>✅ 已安裝 Medium 模型</span>
          </div>
        )}
      </div>

      {/* 3. 檔案與匯出 */}
      <div className="settings-group">
        <h3>📂 檔案與匯入</h3>
        <button
          className="btn-secondary full-width"
          onClick={handleImportFile}
          disabled={isRecording || isStarting || isLoading}
          style={{ marginBottom: "12px" }}
        >
          📂 匯入 影片/音訊 轉文字
        </button>

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

        <div className="folder-row" style={{ marginTop: "16px" }}>
          <div className="folder-info">
            <span className="folder-label">錄音存檔目錄</span>
            <span className="folder-path">{recordingsDir || "讀取中..."}</span>
          </div>
          <button
            className="btn-secondary small"
            onClick={openRecordingsFolder}
            disabled={!recordingsDir}
          >
            開啟 Finder
          </button>
        </div>
      </div>
    </section>
  );
}