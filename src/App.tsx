import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

// --- 設定常數 ---
const MODEL_OPTIONS = [
  { id: "tiny", label: "Tiny (極速)", desc: "適合簡單指令" },
  { id: "base", label: "Base (平衡)", desc: "日常使用推薦" },
  { id: "small", label: "Small (精準)", desc: "技術術語較佳" },
  { id: "medium", label: "Medium (最強)", desc: "適合長語音" },
];

const LANGUAGE_OPTIONS = [
  { id: "auto", label: "Auto (自動判定)" },
  { id: "zh", label: "Chinese (中文)" },
  { id: "en", label: "English (英文)" },
];

interface ModelStatus {
  exists: boolean;
  path: string;
}
interface AudioDevice {
  id: string;
  name: string;
}

function PermissionScreen({
  onOpenSettings,
  onRetry,
  shortcutKey,
}: {
  onOpenSettings: () => void;
  onRetry: () => void;
  shortcutKey: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="permission-container">
      <div className="permission-icon">⌨️</div>

      <h1>啟用「隨處錄音」功能</h1>

      <p className="permission-desc">
        為了讓您在瀏覽網頁或使用其他軟體時，只需按下
        <span className="hotkey-badge">
          {shortcutKey.replace("Super", "Cmd").replace("Alt", "Opt")}
        </span>
        就能隨時喚醒錄音，macOS 需要您授權鍵盤偵測權限。
      </p>

      {/* 按鈕區 - 改用原本定義好的 CSS class */}
      <div className="permission-actions">
        <button className="btn-primary large" onClick={onOpenSettings}>
          前往系統設定授權
        </button>
        <button className="btn-secondary large" onClick={onRetry}>
          我已開啟，重試
        </button>
      </div>

      {/* 詳細說明區 */}
      <div className="permission-details-wrapper">
        <button
          className="link-btn"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "收起詳細說明 ▴" : "為什麼需要此權限？隱私安全說明 ▾"}
        </button>

        {showDetails && (
          <div className="card permission-card">
            <h4>🛡️ 隱私承諾與運作原理</h4>
            <ul>
              <li>
                <strong>門鈴理論 (The Doorbell Analogy)：</strong>
                <br />
                這個權限就像是請了一個守衛。他不會偷聽你在房間裡講什麼，他只會站在大門口，當收到特定的信號（按下快捷鍵）時通知我們。
              </li>
              <li>
                <strong>嚴格過濾：</strong>
                程式碼僅偵測您設定的組合鍵，其他輸入絕不儲存或上傳。
              </li>
              <li>
                <strong>標準機制：</strong>
                這是 macOS 針對 Raycast, Alfred 等軟體的標準要求。
              </li>
            </ul>
            <div className="permission-footer">
              設定路徑：系統設定 {'>'} 隱私權與安全性 {'>'} 輔助使用
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
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

  // --- 3. 核心功能邏輯 ---

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

  const updateRustShortcut = async (keyStr: string) => {
    try {
      await invoke("update_global_shortcut", { shortcutStr: keyStr });
    } catch (e) {
      setError(`快捷鍵註冊失敗: ${e}`);
    }
  };

  // 錄音 Toggle 邏輯
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

  // --- 共用：處理單一檔案轉錄 (用於 Dialog 與 Drop) ---
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

  // --- 處理檔案匯入 (按鈕觸發) ---
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

  // --- 4. 輔助功能 ---
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

  // --- 5. 渲染 UI ---
  // 🔥 新的權限檢查渲染邏輯
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
      <header>
        <h1>Whisper Flow</h1>
        <div className="status-bar">
          {isRecording ? (
            <span className="tag recording">REC</span>
          ) : isLoading ? (
            <span className="tag processing">AI 分析中...</span>
          ) : (
            <span className="tag idle">就緒</span>
          )}
        </div>
      </header>

      {/* 設定區塊 */}
      <section className="card settings-card">
        {/* 第一排：AI 模型 & 語言 */}
        <div className="grid-row">
          <div className="input-group">
            <label>AI 模型</label>
            <select
              className="modern-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isRecording || isStarting || isLoading}
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

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
        </div>

        {/* 第二排：快捷鍵 */}
        <div className="input-group" style={{ marginTop: "12px" }}>
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
        
        {/* 第三排：檔案匯入設定 (時間戳) */}
        <div className="input-group checkbox-wrapper" style={{ marginTop: "12px" }}>
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
            <button
              className="btn-secondary small"
              onClick={() => writeText(recordingsDir)}
              disabled={!recordingsDir}
              title="複製路徑"
            >
              Copy
            </button>
          </div>
        </div>
      </section>

      {/* 錄音控制區 (僅在模型存在時顯示) */}
      {modelStatus.exists && (
        <section className="card control-card">
          <div className="device-select-row">
            <select
              className="modern-select transparent"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={isRecording}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  🎤 {d.name}
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

          <button
            className={`record-main-btn ${isRecording ? "recording" : ""} ${
              isLoading ? "loading" : ""
            }`}
            onClick={handleToggleLogic}
            disabled={isStarting || isLoading}
          >
            <div className="inner-circle"></div>
            <span>
              {isLoading
                ? "轉錄中..."
                : isStarting
                ? "啟動中..."
                : isRecording
                ? "停止錄音"
                : "開始錄音"}
            </span>
          </button>
        </section>
      )}

      {/* 結果顯示區 */}
      <section className="result-section">
        <div className="result-header">
          <label>轉錄結果</label>
          <button className="copy-btn" onClick={() => writeText(transcription)}>
            複製
          </button>
        </div>
        <textarea
          className="transcript-box"
          value={transcription}
          readOnly
          placeholder="等待錄音 或 拖入檔案..."
        />
      </section>

      {error && <div className="error-toast">{error}</div>}

      {/* 錄製快捷鍵時的遮罩 */}
      {isRecordingShortcut && (
        <div className="overlay" onClick={() => setIsRecordingShortcut(false)}>
          <div className="overlay-msg">請按下新的組合鍵...</div>
        </div>
      )}

      {/* 拖拽檔案時的遮罩 */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-content">
            <div className="drag-icon">📂</div>
            <div className="drag-text">釋放以匯入檔案</div>
            <div className="drag-subtext">{withTimestamps ? "將生成 SRT 字幕" : "純文字模式"}</div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;