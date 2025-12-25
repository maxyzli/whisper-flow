import { useState } from "react";

interface PermissionScreenProps {
  onOpenSettings: () => void;
  onRetry: () => void;
  shortcutKey: string;
}

export function PermissionScreen({
  onOpenSettings,
  onRetry,
  shortcutKey,
}: PermissionScreenProps) {
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
