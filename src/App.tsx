import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import "./App.css";

// --- 設定常數 ---
const MODEL_OPTIONS = [
  { id: "tiny", label: "Tiny (極速)", desc: "適合簡單指令" },
  { id: "base", label: "Base (平衡)", desc: "日常使用推薦" },
  { id: "small", label: "Small (精準)", desc: "技術術語較佳" },
  { id: "medium", label: "Medium (最強)", desc: "適合長語音" },
];

interface ModelStatus {
  exists: boolean;
  path: string;
}
interface AudioDevice {
  id: string;
  name: string;
}

function App() {
  // --- 狀態定義 ---
  const [hasPermission, setHasPermission] = useState(true);

  // 持久化設定
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem("wf_model") || "small"
  );
  const [selectedDevice, setSelectedDevice] = useState(
    () => localStorage.getItem("wf_device") || "0"
  );
  const [shortcutKey, setShortcutKey] = useState(
    () => localStorage.getItem("wf_shortcut") || "Alt+Space"
  );

  // UI 狀態
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false); // 正在錄製快捷鍵

  // 運作流程狀態
  const [isStarting, setIsStarting] = useState(false); // FFmpeg 啟動中
  const [isRecording, setIsRecording] = useState(false); // 正在錄音
  const [isLoading, setIsLoading] = useState(false); // 轉錄中 (Whisper)
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // 結果與錯誤
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 新增：recordings folder path
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
    };
    // 同步儲存到 LocalStorage
    localStorage.setItem("wf_model", selectedModel);
    localStorage.setItem("wf_device", selectedDevice);
    localStorage.setItem("wf_shortcut", shortcutKey);
  }, [
    isRecording,
    isStarting,
    isLoading,
    downloading,
    selectedDevice,
    selectedModel,
    shortcutKey,
  ]);

  // --- 2. 初始化與事件監聽 ---
  useEffect(() => {
    let unlistenShortcut: (() => void) | undefined;
    let unlistenDownload: (() => void) | undefined;
    let unlistenReady: (() => void) | undefined;

    const init = async () => {
      // 檢查權限
      const granted = await checkPermissions();
      if (granted) fetchDevices();

      // 註冊初始快捷鍵
      updateRustShortcut(shortcutKey);

      // 新增：取得 recordings parent dir
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
    };

    init();

    return () => {
      if (unlistenShortcut) unlistenShortcut();
      if (unlistenDownload) unlistenDownload();
      if (unlistenReady) unlistenReady();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只執行一次

  // 當模型改變時，檢查該模型是否存在
  useEffect(() => {
    checkCurrentModelStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  // --- 3. 核心功能邏輯 ---

  // 快捷鍵錄製邏輯 (修復版：監聽 Window)
  useEffect(() => {
    if (!isRecordingShortcut) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 忽略單獨按下修飾鍵
      if (["Control", "Shift", "Alt", "Meta", "Command"].includes(e.key)) return;

      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.shiftKey) modifiers.push("Shift");
      if (e.altKey) modifiers.push("Alt");
      if (e.metaKey) modifiers.push("Super"); // Rust 端通常識別 Super 為 Command

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

  const handleToggleLogic = async () => {
    const current = stateRef.current;

    // 忙碌狀態防護
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

      // UI 立即響應停止，進入 Loading
      setIsRecording(false);
      setIsLoading(true);

      try {
        const result = await invoke<string>("stop_and_transcribe", {
          modelType: current.selectedModel,
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
      // 確保選中的設備還在列表內
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
    await invoke("check_accessibility_permission");
    alert("請至「系統設定 -> 隱私權與安全性 -> 輔助使用」開啟權限。");
  };

  // 新增：打開 recordings folder
  const openRecordingsFolder = async () => {
    try {
      await invoke("open_recordings_dir");
    } catch (e) {
      setError(`打開資料夾失敗: ${e}`);
    }
  };

  // --- 5. 渲染 UI ---
  if (!hasPermission)
    return (
      <div className="container permission-screen">
        <h1>🔐 需要權限</h1>
        <p>Whisper Flow 需要「輔助使用」權限來監聽全域快捷鍵。</p>
        <button className="btn-primary" onClick={openSystemSettings}>
          打開設定
        </button>
        <button className="btn-text" onClick={() => window.location.reload()}>
          我已開啟，重試
        </button>
      </div>
    );

  if (!modelStatus) return <div className="loading-screen">初始化系統中...</div>;

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

        {/* 模型下載提示 */}
        {!modelStatus.exists && (
          <div className="download-area">
            {downloading ? (
              <div className="progress-bar">
                <div
                  className="fill"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            ) : (
              <button className="btn-primary" onClick={handleDownload}>
                下載模型 ({selectedModel})
              </button>
            )}
          </div>
        )}

        {/* 新增：Recordings Folder */}
        <div className="folder-row">
          <div className="folder-meta">
            <div className="folder-label">Recordings Folder</div>
            <div className="folder-path" title={recordingsDir || ""}>
              {recordingsDir || "讀取中..."}
            </div>
          </div>

          <div className="folder-actions">
            <button
              className="btn-secondary"
              onClick={openRecordingsFolder}
              disabled={!recordingsDir}
              title="在 Finder 打開"
            >
              Open
            </button>
            <button
              className="btn-secondary"
              onClick={() => writeText(recordingsDir)}
              disabled={!recordingsDir}
              title="複製路徑"
            >
              Copy
            </button>
          </div>
        </div>
      </section>

      {/* 錄音控制區 */}
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
            <button className="icon-btn" onClick={fetchDevices} title="重新整理設備">
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
          placeholder="等待錄音..."
        />
      </section>

      {error && <div className="error-toast">{error}</div>}

      {/* 錄製快捷鍵時的遮罩 */}
      {isRecordingShortcut && (
        <div className="overlay" onClick={() => setIsRecordingShortcut(false)}>
          <div className="overlay-msg">請按下新的組合鍵...</div>
        </div>
      )}
    </main>
  );
}

export default App;
