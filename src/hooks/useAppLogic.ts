import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { ModelStatus, AudioDevice, HistoryItem } from "../constants";
import { UILanguage } from "../i18n";

export function useAppLogic() {
  // --- 狀態定義 ---
  const [hasPermission, setHasPermission] = useState(true);

  // 持久化設定
  const [selectedModel] = useState("large-v3-turbo");
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => localStorage.getItem("wf_language") || "auto"
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
  const [customPrompt, setCustomPrompt] = useState(
    () => localStorage.getItem("wf_custom_prompt") || "技術術語：API, Rust, React, Python, SDE, Amazon, Google, Debug, Implementation, Frontend, Backend. 語言風：中英混雜、技術語言、繁體中文。"
  );
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(
    () => (localStorage.getItem("wf_ui_language") as UILanguage) || "zh"
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
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Refs (用於解決 Event Listener 閉包陷阱)
  const recordStartTime = useRef<number>(0);
  const isProcessingRef = useRef(false); // 原子鎖：防止快捷鍵連發產生的競態條件
  const stateRef = useRef({
    isRecording,
    isStarting,
    isLoading,
    downloading,
    selectedDevice,
    selectedModel,
    selectedLanguage,
    withTimestamps, // 加入 Ref 同步
    customPrompt,
    uiLanguage,
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
      customPrompt,
      uiLanguage,
    };
    // 同步儲存到 LocalStorage
    localStorage.setItem("wf_language", selectedLanguage);
    localStorage.setItem("wf_device", selectedDevice);
    localStorage.setItem("wf_shortcut", shortcutKey);
    localStorage.setItem("wf_timestamps", String(withTimestamps));
    localStorage.setItem("wf_custom_prompt", customPrompt);
    localStorage.setItem("wf_ui_language", uiLanguage);
  }, [
    isRecording,
    isStarting,
    isLoading,
    downloading,
    selectedDevice,
    selectedLanguage,
    shortcutKey,
    withTimestamps,
    customPrompt,
    uiLanguage,
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
      console.error("檢查模型狀態失敗:", e);
      // 如果失敗，給一個預設狀態避免畫面卡死
      setModelStatus({ exists: false, path: "" });
      setError(`系統檢查失敗: ${e}`);
    }
  };

  const fetchHistory = async () => {
    try {
      const list = await invoke<HistoryItem[]>("get_history");
      setHistory(list);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await invoke("delete_history_item", { id });
      await fetchHistory();
    } catch (e) {
      setError(`刪除失敗: ${e}`);
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

      // 取得歷史紀錄
      fetchHistory();

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
    // 1. 原子鎖：防止極短時間內的重複觸發 (例如快捷鍵連發)
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const current = stateRef.current;

      // 如果系統正在轉錄或下載模型，則直接忽略任何動作
      if (current.isLoading || current.downloading) {
        return;
      }

      if (!current.isRecording) {
        // ---> 嘗試開始錄制
        // 如果已經在啟動中，則不重複操作
        if (current.isStarting) return;

        setError(null);
        setTranscription("");

        // 立即更新狀態與 Ref，不等待 React 的異步渲染
        setIsStarting(true);
        stateRef.current.isStarting = true;

        try {
          await invoke("start_recording", { deviceId: current.selectedDevice });
        } catch (err) {
          setIsStarting(false);
          stateRef.current.isStarting = false;
          if (err !== "Already Recording") setError(`啟動失敗: ${err}`);
        }
      } else {
        // ---> 嘗試停止錄制
        const duration = Date.now() - recordStartTime.current;
        if (duration < 500) {
          console.warn("錄音過短，忽略");
          return;
        }

        // 立即標記為非錄音中 & 轉錄中，並更新 Ref 防止重複觸發
        setIsRecording(false);
        stateRef.current.isRecording = false;
        setIsLoading(true);
        stateRef.current.isLoading = true;

        try {
          const result = await invoke<string>("stop_and_transcribe", {
            modelType: current.selectedModel,
            language: current.selectedLanguage,
            prompt: current.customPrompt,
          });
          setTranscription(result);
          fetchHistory(); // 轉錄完成後更新歷史
        } catch (err) {
          if (!String(err).includes("No active recording session")) {
            setError(`轉錄錯誤: ${err}`);
          }
        } finally {
          setIsLoading(false);
          stateRef.current.isLoading = false;
        }
      }
    } finally {
      // 延遲一段時間釋放「進入鎖」，確保系統狀態已充分轉換
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
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
        prompt: current.customPrompt,
      });

      setTranscription(result);
      fetchHistory(); // 檔案處理完成後更新歷史
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
    selectedModel,
    selectedLanguage, setSelectedLanguage,
    selectedDevice, setSelectedDevice,
    shortcutKey, setIsRecordingShortcut, isRecordingShortcut,
    withTimestamps, setWithTimestamps,
    customPrompt, setCustomPrompt,
    uiLanguage, setUiLanguage,
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
    history, fetchHistory, deleteHistoryItem,

    // Actions
    handleToggleLogic,
    handleImportFile,
    handleDownload,
    openSystemSettings,
    openRecordingsFolder,
    checkCurrentModelStatus,
  };
}
