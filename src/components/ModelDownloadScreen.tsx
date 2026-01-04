

interface ModelDownloadScreenProps {
    downloadProgress: number;
    downloading: boolean;
    onDownload: () => void;
    t: any;
}

export function ModelDownloadScreen({
    downloadProgress,
    downloading,
    onDownload,
    t,
}: ModelDownloadScreenProps) {

    const ShieldIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
    );

    return (
        <div className="onboarding-container">
            <div className="split-layout model-download-screen-standalone">
                <div className="split-left">
                    <div className="split-left-content">
                        <h2 className="step-title">{t.screenDownloadTitle || "Initializing Intelligent System"}</h2>
                        <p className="step-subtitle">
                            {t.screenDownloadMsg || "Whisper Flow is downloading the AI model to run 100% locally on your device."}
                        </p>

                        <div className="model-info-list" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="model-point" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <ShieldIcon />
                                <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1d1d1f' }}>Runs Offline & Private</span>
                            </div>
                            <div className="model-point" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                                </div>
                                <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1d1d1f' }}>Zero Latency Response</span>
                            </div>
                        </div>
                    </div>
                    <div className="mic-test-footer">
                        {!downloading && downloadProgress === 0 ? (
                            <button className="btn-black continue-pill" onClick={onDownload}>
                                Start Download
                            </button>
                        ) : (
                            <button className="btn-black continue-pill" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                                {downloadProgress >= 100 ? "Download Complete" : "Downloading..."}
                            </button>
                        )}
                    </div>
                </div>

                <div className="split-right" style={{ backgroundColor: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="download-visual" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                        <div className="progress-circle-container" style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Ring */}
                            <svg width="160" height="160" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" r="70" fill="none" stroke="#E5E5EA" strokeWidth="8" />
                                <circle cx="80" cy="80" r="70" fill="none" stroke="#007AFF" strokeWidth="8"
                                    strokeDasharray="440"
                                    strokeDashoffset={440 - (440 * downloadProgress) / 100}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                                    transform="rotate(-90 80 80)"
                                />
                            </svg>
                            <div className="percentage" style={{ position: 'absolute', fontSize: '2.5rem', fontWeight: 700, color: '#007AFF' }}>
                                {Math.round(downloadProgress)}%
                            </div>
                        </div>
                        <div className="download-label" style={{ fontSize: '1rem', color: '#1d1d1f', fontWeight: 600 }}>Large-v3-Turbo Model</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
