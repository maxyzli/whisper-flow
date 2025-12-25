import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface PermissionScreenProps {
  onOpenSettings: () => void;
  onRetry: () => void;
  shortcutKey: string;
}

type Step = "welcome" | "accessibility" | "microphone";

export function PermissionScreen({
  onOpenSettings,
  onRetry,
  shortcutKey,
}: PermissionScreenProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [showDetails, setShowDetails] = useState(false);
  const [micLoading, setMicLoading] = useState(false);

  // --- Actions ---
  const handleAccessibilityOpen = async () => {
    // 嘗試觸發系統彈窗
    await invoke("prompt_accessibility_permission");
    // 同時打開設定面板，方便使用者操作
    onOpenSettings();
  };

  const handleRequestMic = async () => {
    setMicLoading(true);
    try {
      const granted = await invoke("request_microphone_permission");
      if (granted) {
        onRetry();
      }
    } catch (error) {
      console.error("Failed to request mic permission:", error);
    } finally {
      setMicLoading(false);
    }
  };

  // --- Render Steps ---
  
  // 0. Welcome
  if (step === "welcome") {
    return (
      <div className="permission-container fade-in">
        <div className="permission-content">
          <div className="permission-icon float-anim">👋</div>
          <h1 className="title-lg">歡迎使用 Whisper Flow</h1>
          <p className="subtitle">
            您的個人 AI 語音助理。
            <br />
            無需連網、隱私安全、隨處可用。
          </p>

          <div className="feature-grid">
            <div className="feature-card">
              <span className="feature-icon">🚀</span>
              <h3>極速啟動</h3>
              <p>按下快捷鍵，立即開始錄音</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🔒</span>
              <h3>隱私優先</h3>
              <p>本地運算，資料絕不外傳</p>
            </div>
          </div>

          <div className="permission-actions-col">
            <button 
              className="btn-primary large glow-effect" 
              onClick={() => setStep("accessibility")}
            >
              開始設定 (約 30 秒)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. Accessibility
  if (step === "accessibility") {
    return (
      <div className="permission-container fade-in">
        <div className="permission-content">
          <div className="step-indicator">步驟 1 / 2</div>
          <div className="permission-icon">⌨️</div>
          <h1>啟用快捷鍵</h1>
          <p className="permission-desc">
            為了讓您能透過
            <span className="hotkey-badge">
              {shortcutKey.replace("Super", "Cmd").replace("Alt", "Opt")}
            </span>
            隨時喚醒錄音，<br/>macOS 需要您授權「輔助使用」權限。
          </p>

          <div className="permission-actions-col">
            <button className="btn-primary large" onClick={handleAccessibilityOpen}>
              前往系統設定授權
            </button>
            <button 
              className="btn-text" 
              onClick={() => setStep("microphone")}
            >
              我已完成設定，下一步
            </button>
          </div>

          <div className="permission-details-wrapper">
            <button
              className="link-btn"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "收起詳細說明 ▴" : "為什麼需要此權限？ ▾"}
            </button>

            {showDetails && (
              <div className="card permission-card slide-up">
                <h4>🛡️ 隱私承諾</h4>
                <ul>
                  <li><strong>僅監聽特定按鍵：</strong>程式只會對您設定的快捷鍵做出反應。</li>
                  <li><strong>標準機制：</strong>這與 Alfred、Raycast 等工具所需的權限相同。</li>
                </ul>
                <div className="permission-footer">
                  路徑：系統設定 {'>'} 隱私權與安全性 {'>'} 輔助使用
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Microphone
  return (
    <div className="permission-container fade-in">
      <div className="permission-content">
        <div className="step-indicator">步驟 2 / 2</div>
        <div className="permission-icon">🎤</div>
        <h1>啟用麥克風</h1>
        <p className="permission-desc">
          最後一步！<br/>
          我們需要麥克風權限來聽取您的語音指令。
        </p>

        <div className="permission-actions-col">
          <button 
            className="btn-primary large" 
            onClick={handleRequestMic}
            disabled={micLoading}
          >
            {micLoading ? "偵測中..." : "授權麥克風"}
          </button>
          
          <button className="btn-text" onClick={onRetry}>
            我已授權，開始使用
          </button>
        </div>

        <div className="permission-details-wrapper">
          <div className="card permission-card slide-up">
            <h4>💡 沒看到彈窗？</h4>
            <ul>
              <li>請檢查 <strong>系統設定 {'>'} 隱私權與安全性 {'>'} 麥克風</strong></li>
              <li>確保您的終端機或 Whisper Flow 已被勾選。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}