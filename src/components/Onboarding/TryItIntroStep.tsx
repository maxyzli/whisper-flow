import React from "react";

interface TryItIntroStepProps {
    onBack: () => void;
    onStartDemo: () => void;
    modelDownloading: boolean;
    downloadProgress: number;
}

export const TryItIntroStep = ({
    onBack,
    onStartDemo,
    modelDownloading,
    downloadProgress,
}: TryItIntroStepProps) => {
    return (
        <div className="try-it-intro-step">
            <div className="back-link-top" onClick={onBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                <span>Back</span>
            </div>
            <div className="centered-content">
                <h1 className="magic-title">Now, experience the magic</h1>
                <p className="magic-subtitle">You will be asked to read some brief samples.</p>
                <button
                    className="btn-black continue-pill large-pill"
                    onClick={onStartDemo}
                    disabled={modelDownloading}
                >
                    {modelDownloading ? `Downloading Model (${downloadProgress}%)` : "Start Demo"}
                </button>
            </div>
        </div>
    );
};
