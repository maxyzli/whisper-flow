import { ModelStatus, AudioDevice } from "../constants";
import { UILanguage } from "../i18n";

interface SettingsCardProps {
  // Audio Devices
  devices: AudioDevice[];
  selectedDevice: string;
  setSelectedDevice: (id: string) => void;
  fetchDevices: () => void;

  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  uiLanguage: UILanguage;
  setUiLanguage: (lang: UILanguage) => void;
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
  t: any;
}

export function SettingsCard({
  devices,
  selectedDevice,
  setSelectedDevice,
  fetchDevices,
  selectedLanguage,
  setSelectedLanguage,
  uiLanguage,
  setUiLanguage,
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
  t,
}: SettingsCardProps) {
  return (
    <section className="settings-page-content">
      {/* 1. 錄音設定 */}
      <div className="settings-group">
        <h3>{t.groupRecording}</h3>
        <div className="input-group">
          <label>{t.labelDevice}</label>
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
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </div>

        <div className="grid-row">
          <div className="input-group">
            <label>{t.labelLanguage}</label>
            <select
              className="modern-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isRecording || isStarting || isLoading}
            >
              <option value="auto">{t.langAuto}</option>
              <option value="zh">{t.langZh}</option>
              <option value="en">{t.langEn}</option>
            </select>
          </div>

          <div className="input-group">
            <label>{t.labelShortcut}</label>
            <button
              className={`shortcut-btn ${isRecordingShortcut ? "active" : ""}`}
              onClick={() => setIsRecordingShortcut(true)}
              disabled={isRecording || isStarting}
            >
              {isRecordingShortcut
                ? t.btnShortcutActive
                : shortcutKey.replace("Super", "Cmd").replace("Alt", "Opt")}
            </button>
          </div>
        </div>
      </div>

      {/* 2. AI 模型與提示詞 */}
      <div className="settings-group">
        <h3>{t.groupModel}</h3>

        <div className="input-group">
          <label>{t.labelCustomPrompt}</label>
          <textarea
            className="modern-textarea"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={t.placeholderPrompt}
            disabled={isRecording || isStarting || isLoading}
            style={{ minHeight: "80px" }}
          />
          <p className="helper-text">
            {t.helperPrompt}
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
              {t.btnDownloadModel}
            </button>
          )
        ) : (
          <div className="model-status-tag">
            <span>{t.statusModelInstalled}</span>
          </div>
        )}
      </div>

      {/* 3. 檔案與匯出 */}
      <div className="settings-group">
        <h3>{t.groupFile}</h3>
        <button
          className="btn-secondary full-width"
          onClick={handleImportFile}
          disabled={isRecording || isStarting || isLoading}
          style={{ marginBottom: "12px" }}
        >
          {t.btnImport}
        </button>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={withTimestamps}
            onChange={(e) => setWithTimestamps(e.target.checked)}
            disabled={isRecording || isStarting || isLoading}
          />
          <span className="checkmark"></span>
          {t.labelTimestamps}
        </label>

        <div className="folder-row" style={{ marginTop: "16px" }}>
          <div className="folder-info">
            <span className="folder-label">{t.labelFolder}</span>
            <span className="folder-path">{recordingsDir || "..."}</span>
          </div>
          <button
            className="btn-secondary small"
            onClick={openRecordingsFolder}
            disabled={!recordingsDir}
          >
            {t.btnOpenFolder}
          </button>
        </div>
      </div>

      {/* 4. 介面設定 */}
      <div className="settings-group">
        <h3>🌐 {t.labelInterfaceLang}</h3>
        <div className="input-group">
          <select
            className="modern-select"
            value={uiLanguage}
            onChange={(e) => setUiLanguage(e.target.value as UILanguage)}
          >
            <option value="en">English</option>
            <option value="zh">繁體中文</option>
            <option value="zh_cn">简体中文</option>
          </select>
        </div>
      </div>
    </section>
  );
}