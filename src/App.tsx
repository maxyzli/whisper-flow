import { useState, useEffect } from "react";
import "./App.css";
import { useAppLogic } from "./hooks/useAppLogic";
import { useHintWindowControl } from "./hooks/useHintWindowControl";
import { PermissionScreen } from "./components/PermissionScreen";
import { Header } from "./components/Header";
import { SettingsCard } from "./components/SettingsCard";
import { ControlCard } from "./components/ControlCard";
import { ResultSection } from "./components/ResultSection";
import { DragOverlay } from "./components/DragOverlay";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { translations } from "./i18n";

function App() {
  const [windowLabel, setWindowLabel] = useState("");
  const [currentView, setCurrentView] = useState<"recorder" | "settings">("recorder");

  const {
    // State
    hasPermission,
    selectedModel, setSelectedModel,
    selectedLanguage, setSelectedLanguage,
    selectedDevice, setSelectedDevice,
    shortcutKey, setIsRecordingShortcut, isRecordingShortcut,
    withTimestamps, setWithTimestamps,
    customPrompt, setCustomPrompt,
    uiLanguage, setUiLanguage,
    modelStatus,
    devices, fetchDevices,
    isDragging,
    isStarting,
    isRecording,
    isLoading,
    downloading,
    downloadProgress,
    transcription,
    error,
    recordingsDir,

    // Actions
    handleToggleLogic,
    handleImportFile,
    handleDownload,
    openSystemSettings,
    openRecordingsFolder,
  } = useAppLogic();

  // --- 視窗管理 ---
  useEffect(() => {
    const win = getCurrentWindow();
    setWindowLabel(win.label);
  }, []);

  // 使用 Custom Hook 控制懸浮窗
  useHintWindowControl({ isRecording, isLoading, windowLabel });

  if (windowLabel === "recording-hint") {
    return null;
  }

  const t = translations[uiLanguage];

  // --- 渲染 UI ---
  if (!hasPermission)
    return (
      <PermissionScreen
        onOpenSettings={openSystemSettings}
        onRetry={() => window.location.reload()}
        shortcutKey={shortcutKey}
      />
    );

  if (!modelStatus)
    return <div className="loading-screen">{uiLanguage === 'zh' ? '初始化系統中...' : 'Initializing...'}</div>;

  return (
    <main className="container">
      <Header
        isRecording={isRecording}
        isLoading={isLoading}
        view={currentView}
        onToggleSettings={() => setCurrentView(v => v === "recorder" ? "settings" : "recorder")}
        t={t}
      />

      {currentView === "settings" ? (
        <SettingsCard
          devices={devices}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}

          fetchDevices={fetchDevices}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          uiLanguage={uiLanguage}
          setUiLanguage={setUiLanguage}
          isRecording={isRecording}
          isStarting={isStarting}
          isLoading={isLoading}
          shortcutKey={shortcutKey}
          isRecordingShortcut={isRecordingShortcut}
          setIsRecordingShortcut={setIsRecordingShortcut}
          withTimestamps={withTimestamps}
          setWithTimestamps={setWithTimestamps}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
          modelStatus={modelStatus}
          downloading={downloading}
          downloadProgress={downloadProgress}
          handleDownload={handleDownload}
          handleImportFile={handleImportFile}
          recordingsDir={recordingsDir}
          openRecordingsFolder={openRecordingsFolder}
          t={t}
        />
      ) : (
        <>
          {/* 錄音控制區 (僅在模型存在時顯示) */}
          {modelStatus.exists && (
            <ControlCard
              isRecording={isRecording}
              isLoading={isLoading}
              isStarting={isStarting}
              handleToggleLogic={handleToggleLogic}
              t={t}
            />
          )}

          {/* 結果顯示區 */}
          <ResultSection transcription={transcription} t={t} />
        </>
      )}

      {error && <div className="error-toast">{error}</div>}

      {/* 錄製快捷鍵時的遮罩 */}
      {isRecordingShortcut && (
        <ShortcutOverlay onClose={() => setIsRecordingShortcut(false)} t={t} />
      )}

      {/* 拖拽檔案時的遮罩 */}
      {isDragging && <DragOverlay withTimestamps={withTimestamps} t={t} />}
    </main>
  );
}

export default App;
