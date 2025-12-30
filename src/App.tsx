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
    return <div className="loading-screen">初始化系統中...</div>;

  return (
    <main className="container">
      <Header
        isRecording={isRecording}
        isLoading={isLoading}
        view={currentView}
        onToggleSettings={() => setCurrentView(v => v === "recorder" ? "settings" : "recorder")}
      />

      {currentView === "settings" ? (
        <SettingsCard
          devices={devices}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          fetchDevices={fetchDevices}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
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
            />
          )}

          {/* 結果顯示區 */}
          <ResultSection transcription={transcription} />
        </>
      )}

      {error && <div className="error-toast">{error}</div>}

      {/* 錄製快捷鍵時的遮罩 */}
      {isRecordingShortcut && (
        <ShortcutOverlay onClose={() => setIsRecordingShortcut(false)} />
      )}

      {/* 拖拽檔案時的遮罩 */}
      {isDragging && <DragOverlay withTimestamps={withTimestamps} />}
    </main>
  );
}

export default App;
