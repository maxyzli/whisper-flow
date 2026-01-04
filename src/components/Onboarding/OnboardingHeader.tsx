import { Step } from "./types";

interface OnboardingHeaderProps {
    step: Step;
    progress: string;
}

export const OnboardingHeader = ({ step, progress }: OnboardingHeaderProps) => {
    return (
        <header className="onboarding-header" data-tauri-drag-region>
            <div className="header-progress-bar" style={{ width: progress }}></div>
            <div className="nav-steps">
                <div className={step === "welcome" ? "nav-step active" : "nav-step"}>Sign up</div>
                <div className="nav-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
                <div className={step === "permissions" ? "nav-step active" : "nav-step"}>Permissions</div>
                <div className="nav-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
                <div className={step === "test-mic" || step === "test-hotkey" ? "nav-step active" : "nav-step"}>Set up</div>
                <div className="nav-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
                <div className={step === "model-download" ? "nav-step active" : "nav-step"}>Download</div>
                <div className="nav-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
                <div className={step === "try-it" || step === "try-it-samples" ? "nav-step active" : "nav-step"}>Try it</div>
            </div>
        </header>
    );
};
