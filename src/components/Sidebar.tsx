import logoWhite from "../assets/logo_white.png";

type Tab = "home" | "history" | "settings";

interface SidebarProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    return (
        <div className="sidebar">
            <div>
                <div className="sidebar-brand">
                    <div className="brand-icon">
                        <img src={logoWhite} alt="Logo" style={{ width: '16px', height: '16px' }} />
                    </div>
                    <span className="brand-name">Whisper Flow</span>
                </div>

                <nav className="nav-list">
                    <div
                        className={`nav-item ${activeTab === "home" ? "active" : ""}`}
                        onClick={() => onTabChange("home")}
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        <span>Home</span>
                    </div>

                    <div
                        className={`nav-item ${activeTab === "history" ? "active" : ""}`}
                        onClick={() => onTabChange("history")}
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>History</span>
                    </div>

                    <div
                        className={`nav-item ${activeTab === "settings" ? "active" : ""}`} // Added Dictionary placeholder if needed later
                        onClick={() => onTabChange("settings")}
                        style={{ display: 'none' }} // Hidden for now as it's at bottom
                    >
                        {/* Dictionary or other future items */}
                    </div>
                </nav>
            </div>

            <div className="nav-list">
                <div
                    className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
                    onClick={() => onTabChange("settings")}
                >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    <span>Settings</span>
                </div>
            </div>
        </div>
    );
}
