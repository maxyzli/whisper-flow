import { useState, useEffect } from "react";
import "./App.css"; // Imports variables (we override them in main.css)
import { useAppLogic } from "./hooks/useAppLogic";
import { useHintWindowControl } from "./hooks/useHintWindowControl";
import { PermissionScreen } from "./components/PermissionScreen";
import { SettingsCard } from "./components/SettingsCard";
import { HistorySection } from "./components/HistorySection";
import { DragOverlay } from "./components/DragOverlay";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { ModelDownloadScreen } from "./components/ModelDownloadScreen";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { translations } from "./i18n";

// New Components
import { MainLayout } from "./components/MainLayout";
import { DashboardHome } from "./components/DashboardHome";

function App() {
  const [windowLabel, setWindowLabel] = useState("");
  // Replaced currentView with activeTab for SideBar navigation
  const [activeTab, setActiveTab] = useState<"home" | "history" | "settings">("home");

  const {
    // State
    hasPermission,
    selectedLanguage, setSelectedLanguage,
    selectedDevice, setSelectedDevice,
    shortcutKey, setIsRecordingShortcut, isRecordingShortcut,
    withTimestamps, setWithTimestamps,
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
    handleDownload,
    openRecordingsFolder,
  } = useAppLogic();

  // --- Window Management ---
  useEffect(() => {
    const win = getCurrentWindow();
    setWindowLabel(win.label);
  }, []);

  // Use Custom Hook for hint window
  useHintWindowControl({ isRecording, isLoading, windowLabel, uiLanguage });

  if (windowLabel === "recording-hint") {
    return null;
  }

  const t = translations[uiLanguage];

  // --- Window Resize Logic ---
  // Force Desktop Size on Mount/Permission Grant
  useEffect(() => {
    const win = getCurrentWindow();
    if (windowLabel !== "main") return;

    // Fix window size to 1080x760 (Desktop Dashboard Size)
    // We do this regardless of permission state to ensure consistency
    win.setSize({ type: 'Logical', width: 1080, height: 760 } as any);
    win.center();
  }, [windowLabel, hasPermission]); // Run when permission changes too just to be safe

  // --- Render UI ---
  if (!hasPermission)
    return (
      <PermissionScreen
        onRetry={() => {
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

  // 3. Main App (Dashboard Layout)
  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "home" && (
        <DashboardHome history={history} shortcutKey={shortcutKey} />
      )}

      {activeTab === "history" && (
        <div className="page-container">
          <div className="page-header">
            <h1 className="page-title">History</h1>
          </div>
          <HistorySection
            history={history}
            onDelete={deleteHistoryItem}
            t={t}
          />
        </div>
      )}

      {activeTab === "settings" && (
        <div className="page-container">
          <div className="page-header">
            <h1 className="page-title">Settings</h1>
          </div>
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

            recordingsDir={recordingsDir}
            openRecordingsFolder={openRecordingsFolder}
            t={t}
          />
        </div>
      )}

      {error && <div className="error-toast">{error}</div>}

      {/* Overlays */}
      {isRecordingShortcut && (
        <ShortcutOverlay onClose={() => setIsRecordingShortcut(false)} t={t} />
      )}

      {isDragging && <DragOverlay withTimestamps={withTimestamps} t={t} />}
    </MainLayout>
  );
}

export default App;
