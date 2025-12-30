interface HeaderProps {
  isRecording: boolean;
  isLoading: boolean;
  view: "recorder" | "settings";
  onToggleSettings: () => void;
  t: any;
}

export function Header({ isRecording, isLoading, view, onToggleSettings, t }: HeaderProps) {
  return (
    <header className="main-header">
      <div className="header-left">
        {view === "settings" && (
          <button className="back-btn" onClick={onToggleSettings} title={t.backBtn}>
            ←
          </button>
        )}
        <h1>{view === "settings" ? t.headerSettings : t.headerTitle}</h1>
      </div>

      <div className="header-right">
        <div className="status-bar">
          {isRecording ? (
            <span className="tag recording">{t.tagRecording}</span>
          ) : isLoading ? (
            <span className="tag processing">{t.tagProcessing}</span>
          ) : (
            <span className="tag idle">{t.tagReady}</span>
          )}
        </div>

        {view === "recorder" && (
          <button
            className="settings-toggle-btn"
            onClick={onToggleSettings}
            title={t.headerSettings}
          >
            ⚙️
          </button>
        )}
      </div>
    </header>
  );
}
