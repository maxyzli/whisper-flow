import { HistoryItem } from "../constants";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface HistorySectionProps {
    history: HistoryItem[];
    onDelete: (id: string) => void;
    t: any;
}

export function HistorySection({ history, onDelete, t }: HistorySectionProps) {
    if (history.length === 0) {
        return (
            <div className="history-empty">
                <p>{t.historyEmpty}</p>
            </div>
        );
    }

    return (
        <section className="history-section">
            <div className="history-header">
                <label>{t.historyTitle}</label>
            </div>
            <div className="history-list">
                {history.map((item) => (
                    <div key={item.id} className="history-item">
                        <div className="item-meta">
                            <span className="item-time">{item.timestamp.replace('_', ' ')}</span>
                            <div className="item-actions">
                                <button
                                    className="copy-btn-sm"
                                    onClick={() => writeText(item.text)}
                                    title={t.copyBtn}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                                <button
                                    className="delete-btn-sm"
                                    onClick={() => onDelete(item.id)}
                                    title="Delete"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="item-text">
                            {item.text || "(Empty)"}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
