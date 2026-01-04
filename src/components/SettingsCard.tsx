import { AudioDevice } from "../constants";
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
  recordingsDir,
  openRecordingsFolder,
  t,
}: SettingsCardProps) {
  return (
    <section className="settings-page-content">
      {/* 1. 錄音與辨識 (Recording & Recognition) */}
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
      </div>

      {/* 2. 控制 (Controls) */}
      <div className="settings-group">
        <h3>{t.labelShortcut}</h3>
        <div className="input-group">
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

      {/* 3. AI 智力與提示詞 (AI Personalization) */}

      {/* 4. 檔案與字幕 (Files & Output) */}
      <div className="settings-group">
        <h3>{t.groupFile}</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={withTimestamps}
            onChange={(e) => setWithTimestamps(e.target.checked)}
            disabled={isRecording || isStarting || isLoading}
          />
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

      {/* 5. 介面設定 (Interface) */}
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