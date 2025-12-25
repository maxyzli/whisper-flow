import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open } from "@tauri-apps/plugin-dialog";
import { ModelStatus, AudioDevice } from "../constants";

export function useAppLogic() {
  // --- 狀態定義 ---
  const [hasPermission, setHasPermission] = useState(true);

  // 持久化設定
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem("wf_model") || "small"
  );
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => localStorage.getItem("wf_language") || "zh"
  );
  const [selectedDevice, setSelectedDevice] = useState(
    () => localStorage.getItem("wf_device") || "0"
  );
  const [shortcutKey, setShortcutKey] = useState(
    () => localStorage.getItem("wf_shortcut") || "Alt+Space"
  );
  // 新增：是否包含時間戳 (SRT)
  const [withTimestamps, setWithTimestamps] = useState(
    () => localStorage.getItem("wf_timestamps") === "true"
  );

  // UI 狀態
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false); // 正在錄製快捷鍵
  const [isDragging, setIsDragging] = useState(false); // 拖拽狀態

  // 運作流程狀態
  const [isStarting, setIsStarting] = useState(false); // FFmpeg 啟動中
  const [isRecording, setIsRecording] = useState(false); // 正在錄音
  const [isLoading, setIsLoading] = useState(false); // 轉錄中 (Whisper)
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // 結果與錯誤
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // recordings folder path
  const [recordingsDir, setRecordingsDir] = useState<string>("");

  // Refs (用於解決 Event Listener 閉包陷阱)
  const recordStartTime = useRef<number>(0);
  const stateRef = useRef({
    isRecording,
    isStarting,
    isLoading,
    downloading,
    selectedDevice,
    selectedModel,
    selectedLanguage,
    withTimestamps, // 加入 Ref 同步
  });

  // --- 1. 狀態同步 (Ref Pattern) ---
  useEffect(() => {
    stateRef.current = {
      isRecording,
      isStarting,
      isLoading,
      downloading,
      selectedDevice,
      selectedModel,
      selectedLanguage,
      withTimestamps,
    };
    // 同步儲存到 LocalStorage
    localStorage.setItem("wf_model", selectedModel);
    localStorage.setItem("wf_language", selectedLanguage);
    localStorage.setItem("wf_device", selectedDevice);
    localStorage.setItem("wf_shortcut", shortcutKey);
    localStorage.setItem("wf_timestamps", String(withTimestamps));
  }, [
    isRecording,
    isStarting,
    isLoading,
    downloading,
    selectedDevice,
    selectedModel,
    selectedLanguage,
    shortcutKey,
    withTimestamps,
  ]);

  // --- 輔助功能定義 (需要在 init 之前定義，或 hoisting) ---
  const checkPermissions = async () => {
    try {
      const granted = await invoke<boolean>("check_accessibility_permission");
      setHasPermission(granted);
      return granted;
    } catch {
      return true;
    }
  };

  const fetchDevices = async () => {
    try {
      const list = await invoke<AudioDevice[]>("get_audio_devices");
      setDevices(list);
      if (list.length > 0 && !list.find((d) => d.id === selectedDevice)) {
        setSelectedDevice(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateRustShortcut = async (keyStr: string) => {
    try {
      await invoke("update_global_shortcut", { shortcutStr: keyStr });
    } catch (e) {
      setError(`快捷鍵註冊失敗: ${e}`);
    }
  };

  const checkCurrentModelStatus = async () => {
    try {
      const status = await invoke<ModelStatus>("check_model_status", {
        modelType: selectedModel,
      });
      setModelStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  // --- 2. 初始化與事件監聽 ---
  useEffect(() => {
    let unlistenShortcut: (() => void) | undefined;
    let unlistenDownload: (() => void) | undefined;
    let unlistenReady: (() => void) | undefined;
    
    // Drag events
    let unlistenDragEnter: (() => void) | undefined;
    let unlistenDragLeave: (() => void) | undefined;
    let unlistenDragDrop: (() => void) | undefined;

    const init = async () => {
      // 檢查權限
      const granted = await checkPermissions();
      if (granted) fetchDevices();

      // 註冊初始快捷鍵
      updateRustShortcut(shortcutKey);

      // 取得 recordings parent dir
      try {
        const dir = await invoke<string>("get_recordings_dir_cmd");
        setRecordingsDir(dir);
      } catch (e) {
        console.error("Failed to get recordings dir:", e);
      }

      // 監聽 Rust 發出的快捷鍵觸發事件
      unlistenShortcut = await listen<string>("shortcut-event", (event) => {
        if (event.payload === "toggle-recording") {
          console.log("⚡️ [Shortcut Triggered]");
          handleToggleLogic();
        }
      });

      // 監聽下載進度
      unlistenDownload = await listen<any>("download-progress", (e) =>
        setDownloadProgress(e.payload.progress)
      );

      // 監聽錄音就緒 (FFmpeg 已經開始寫入檔案)
      unlistenReady = await listen("recording-ready", () => {
        setIsStarting(false);
        setIsRecording(true);
        recordStartTime.current = Date.now();
      });

      // --- Drag & Drop Listeners ---
      unlistenDragEnter = await listen("tauri://drag-enter", () => {
        setIsDragging(true);
      });

      unlistenDragLeave = await listen("tauri://drag-leave", () => {
        setIsDragging(false);
      });

      unlistenDragDrop = await listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
        setIsDragging(false);
        const files = event.payload.paths;
        if (files && files.length > 0) {
          handleFileProcess(files[0]);
        }
      });
    };

    init();

    return () => {
      if (unlistenShortcut) unlistenShortcut();
      if (unlistenDownload) unlistenDownload();
      if (unlistenReady) unlistenReady();
      if (unlistenDragEnter) unlistenDragEnter();
      if (unlistenDragLeave) unlistenDragLeave();
      if (unlistenDragDrop) unlistenDragDrop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 當模型改變時，檢查該模型是否存在
  useEffect(() => {
    checkCurrentModelStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  // 快捷鍵錄製邏輯
  useEffect(() => {
    if (!isRecordingShortcut) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (["Control", "Shift", "Alt", "Meta", "Command"].includes(e.key))
        return;

      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.shiftKey) modifiers.push("Shift");
      if (e.altKey) modifiers.push("Alt");
      if (e.metaKey) modifiers.push("Super");

      let key = e.key.toUpperCase();
      if (key === " ") key = "Space";

      const newShortcut = [...modifiers, key].join("+");
      console.log("捕獲新快捷鍵:", newShortcut);

      setShortcutKey(newShortcut);
      setIsRecordingShortcut(false);
      updateRustShortcut(newShortcut);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isRecordingShortcut]);

  // --- 核心邏輯 ---
  const handleToggleLogic = async () => {
    const current = stateRef.current;

    if (current.isLoading || current.downloading || current.isStarting) return;

    if (!current.isRecording) {
      // ---> 開始錄音
      setError(null);
      setTranscription("");
      setIsStarting(true);
      try {
        await invoke("start_recording", { deviceId: current.selectedDevice });
      } catch (err) {
        setIsStarting(false);
        if (err !== "Already Recording") setError(`啟動失敗: ${err}`);
      }
    } else {
      // ---> 停止並轉錄
      const duration = Date.now() - recordStartTime.current;
      if (duration < 500) {
        console.warn("錄音過短，忽略");
        return;
      }

      setIsRecording(false);
      setIsLoading(true);

      try {
        const result = await invoke<string>("stop_and_transcribe", {
          modelType: current.selectedModel,
          language: current.selectedLanguage,
        });
        setTranscription(result);
        await writeText(result); // 自動複製
      } catch (err) {
        if (!String(err).includes("No active recording session")) {
          setError(`轉錄錯誤: ${err}`);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFileProcess = async (filePath: string) => {
    const current = stateRef.current;
    
    // 檢查系統狀態
    if (current.isRecording || current.isStarting || current.isLoading) {
      setError("系統忙碌中，請稍後再試");
      return;
    }

    // 簡單副檔名檢查
    const validExts = ["mp4", "mp3", "m4a", "wav", "mov", "mkv"];
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (!ext || !validExts.includes(ext)) {
      setError("不支援的檔案格式");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranscription("");
    console.log("Processing file:", filePath);

    try {
      // 呼叫 Rust (帶入 withTimestamps)
      const result = await invoke<string>("transcribe_external_file", {
        filePath: filePath,
        modelType: current.selectedModel,
        language: current.selectedLanguage,
        withTimestamps: current.withTimestamps, // 🔥 傳遞時間戳設定
      });

      setTranscription(result);
      await writeText(result); // Auto copy
    } catch (err) {
      setError(`檔案處理失敗: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Media",
            extensions: ["mp4", "mp3", "m4a", "wav", "mov", "mkv"],
          },
        ],
      });

      if (selected === null) return; // User cancelled
      handleFileProcess(selected as string);
    } catch (err) {
      setError(`開啟檔案失敗: ${err}`);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      await invoke("download_model", { modelType: selectedModel });
      await checkCurrentModelStatus();
    } catch (err) {
      setError(`下載失敗: ${err}`);
    } finally {
      setDownloading(false);
    }
  };

  const openSystemSettings = async () => {
      try {
          await invoke("open_accessibility_settings");
      } catch (e) {
          console.error("無法打開系統設定:", e);
      }
  };

  const openRecordingsFolder = async () => {
    try {
      await invoke("open_recordings_dir");
    } catch (e) {
      setError(`打開資料夾失敗: ${e}`);
    }
  };

  return {
    // State
    hasPermission,
    selectedModel, setSelectedModel,
    selectedLanguage, setSelectedLanguage,
    selectedDevice, setSelectedDevice,
    shortcutKey, setIsRecordingShortcut, isRecordingShortcut,
    withTimestamps, setWithTimestamps,
    modelStatus,
    devices, fetchDevices,
    isDragging, setIsDragging,
    isStarting,
    isRecording,
    isLoading,
    downloading,
    downloadProgress,
    transcription, setTranscription,
    error, setError,
    recordingsDir,
    
    // Actions
    handleToggleLogic,
    handleImportFile,
    handleDownload,
    openSystemSettings,
    openRecordingsFolder,
    checkCurrentModelStatus,
  };
}
