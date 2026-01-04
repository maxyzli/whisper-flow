interface HeaderProps {
  view: "recorder" | "settings";
  onToggleSettings: () => void;
  t: any;
}

export function Header({ view, onToggleSettings, t }: HeaderProps) {
  return (
    <header className="main-header" data-tauri-drag-region>
      <div className="header-left">
        {view === "settings" && (
          <button className="back-btn" onClick={onToggleSettings} title={t.backBtn}>
            ←
          </button>
        )}
        <h1>{view === "settings" ? t.headerSettings : t.headerTitle}</h1>
      </div>

      <div className="header-right">


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
