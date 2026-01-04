import { HistoryItem } from "../constants";

interface DashboardHomeProps {
    history: HistoryItem[];
    shortcutKey: string;
}

export function DashboardHome({ history, shortcutKey }: DashboardHomeProps) {
    // Calculate basic stats
    const totalWords = history.reduce((sum, item) => sum + (item.text.trim().split(/\s+/).length || 0), 0);

    // Estimate time saved: average typing speed 40 wpm. Time saved = total words / 40.
    // Result in minutes.
    const timeSavedMin = Math.round(totalWords / 40);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Speak naturally, write perfectly</h1>
                <p className="page-subtitle">
                    Hold down on the <span style={{ fontWeight: 600, color: '#1d1d1f' }}>
                        {shortcutKey || "Hot Key"}
                    </span> key, speak, and let go to insert spoken text.
                </p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        {/* Simple Clock Icon */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{timeSavedMin} <span style={{ fontSize: '16px', fontWeight: 500, color: '#86868b' }}>min</span></span>
                        <span className="stat-label">Total time saved</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{totalWords}</span>
                        <span className="stat-label">Words dictated</span>
                    </div>
                </div>
            </div>

            <div className="info-banner-grid">
                <div className="info-banner banner-blue">
                    <div>
                        <h3 className="banner-title">Tips & Tricks</h3>
                        <p className="banner-text">Did you know you can use Whisper Flow in any application? Just hold your hotkey.</p>
                    </div>
                    {/* <button className="banner-btn btn-blue">Learn more</button> */}
                </div>

                <div className="info-banner banner-orange">
                    <div>
                        <h3 className="banner-title">Give Feedback</h3>
                        <p className="banner-text">We are constantly improving. Let us know what feature you want next.</p>
                    </div>
                    <button className="banner-btn btn-black" onClick={() => window.open('mailto:support@whisperflow.app')}>Contact Us</button>
                </div>
            </div>
        </div>
    );
}
