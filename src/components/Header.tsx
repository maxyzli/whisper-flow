interface HeaderProps {
  isRecording: boolean;
  isLoading: boolean;
  view: "recorder" | "settings";
  onToggleSettings: () => void;
}

export function Header({ isRecording, isLoading, view, onToggleSettings }: HeaderProps) {
  return (
    <header className="main-header">
      <div className="header-left">
        {view === "settings" && (
          <button className="back-btn" onClick={onToggleSettings} title="返回">
            ←
          </button>
        )}
        <h1>{view === "settings" ? "設定" : "Whisper Flow"}</h1>
      </div>

      <div className="header-right">
        <div className="status-bar">
          {isRecording ? (
            <span className="tag recording">REC</span>
          ) : isLoading ? (
            <span className="tag processing">AI 分析中...</span>
          ) : (
            <span className="tag idle">就緒</span>
          )}
        </div>

        {view === "recorder" && (
          <button
            className="settings-toggle-btn"
            onClick={onToggleSettings}
            title="開啟設定"
          >
            ⚙️
          </button>
        )}
      </div>
    </header>
  );
}
