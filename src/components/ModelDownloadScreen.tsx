import React from 'react';

interface ModelDownloadScreenProps {
    downloadProgress: number;
    downloading: boolean;
    onDownload: () => void;
    t: any;
}

export const ModelDownloadScreen: React.FC<ModelDownloadScreenProps> = ({
    downloadProgress,
    downloading,
    onDownload,
    t
}) => {
    return (
        <div className="download-screen-container">
            <div className="download-card">
                <div className="icon">🧠</div>
                <h2>{t.screenDownloadTitle || "System Init"}</h2>
                <p>{t.screenDownloadMsg || "Model download required."}</p>

                {downloading ? (
                    <div className="progress-section">
                        <div className="progress-bar">
                            <div
                                className="fill"
                                style={{ width: `${downloadProgress}%` }}
                            ></div>
                        </div>
                        <span className="progress-text">{downloadProgress}%</span>
                    </div>
                ) : (
                    <div className="action-section">
                        <button className="btn-primary large" onClick={onDownload}>
                            {t.screenDownloadBtn || "Download"}
                        </button>
                        <span className="note">{t.screenDownloadNote || "~1.5GB"}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
