import { useState, useEffect } from "react";
import "./App.css";
import { useAppLogic } from "./hooks/useAppLogic";
import { useHintWindowControl } from "./hooks/useHintWindowControl";
import { PermissionScreen } from "./components/PermissionScreen";
import { Header } from "./components/Header";
import { SettingsCard } from "./components/SettingsCard";
import { ControlCard } from "./components/ControlCard";
import { HistorySection } from "./components/HistorySection";
import { DragOverlay } from "./components/DragOverlay";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { ModelDownloadScreen } from "./components/ModelDownloadScreen";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { translations } from "./i18n";

function App() {
  const [windowLabel, setWindowLabel] = useState("");
  const [currentView, setCurrentView] = useState<"recorder" | "settings">("recorder");

  const {
    // State
    hasPermission,
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
    error,
    recordingsDir,
    history,
    deleteHistoryItem,

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
  useHintWindowControl({ isRecording, isLoading, windowLabel, uiLanguage });

  if (windowLabel === "recording-hint") {
    return null;
  }

  const t = translations[uiLanguage];

  // --- Onboarding Window Resize ---
  useEffect(() => {
    const win = getCurrentWindow();
    if (windowLabel !== "main") return;

    if (!hasPermission) {
      // Scale up for onboarding (Fine-tuned rectangular look)
      win.setSize({ type: 'Logical', width: 1080, height: 760 } as any);
      win.center();
    } else {
      // Scale down for main recorder (Fine-tuned base size)
      win.setSize({ type: 'Logical', width: 480, height: 820 } as any);
    }
  }, [hasPermission, windowLabel]);

  // --- 渲染 UI ---
  if (!hasPermission)
    return (
      <PermissionScreen
        onRetry={() => {
          // Note: we don't necessarily need to reload, the logic will update hasPermission
          // but if the user wants a fresh start:
          window.location.reload();
        }}
      />
    );

  // 1. Loading State
  if (!modelStatus)
    return <div className="loading-screen">{uiLanguage === 'zh' ? '初始化系統中...' : 'Initializing...'}</div>;

  // 2. Blocking Download Screen
  if (!modelStatus.exists) {
    return (
      <ModelDownloadScreen
        downloadProgress={downloadProgress}
        downloading={downloading}
        onDownload={handleDownload}
        t={t}
      />
    )
  }

  // 3. Main App
  return (
    <main className="container">
      <Header
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

          recordingsDir={recordingsDir}
          openRecordingsFolder={openRecordingsFolder}
          t={t}
        />
      ) : (
        <>
          {/* 錄音控制區 (僅在模型存在時顯示) */}
          {modelStatus.exists && (
            <div className="home-controls">
              <ControlCard
                isRecording={isRecording}
                isLoading={isLoading}
                isStarting={isStarting}
                handleToggleLogic={handleToggleLogic}
                t={t}
              />
              <button
                className="btn-secondary full-width"
                onClick={handleImportFile}
                disabled={isRecording || isStarting || isLoading}
              >
                {t.btnImport}
              </button>
            </div>
          )}

          {/* 歷史紀錄區 */}
          <HistorySection
            history={history}
            onDelete={deleteHistoryItem}
            t={t}
          />
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
