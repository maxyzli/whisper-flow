import React from "react";
import { SplitLayout } from "./components/SplitLayout";
import { MicVisualizer } from "./components/MicVisualizer";

interface MicTestStepProps {
    selectedDeviceId: string;
    onBack: () => void;
    onOpenMicModal: () => void;
    onContinue: () => void;
}

export const MicTestStep = ({
    selectedDeviceId,
    onBack,
    onOpenMicModal,
    onContinue,
}: MicTestStepProps) => {
    return (
        <SplitLayout
            className="test-mic-step"
            left={
                <div className="split-left">
                    <div className="back-link" onClick={onBack}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        <span>Back</span>
                    </div>
                    <div className="split-left-content">
                        <h2 className="step-title">Speak to test your microphone</h2>
                        <p className="step-subtitle">Your computer&apos;s built-in mic will ensure optimal transcription.</p>
                        <div className="test-mic-prompt">
                            <p>Do you see the blue bars moving while you speak?</p>
                        </div>
                    </div>

                    <div className="mic-test-footer">
                        <button className="btn-white-pill" onClick={onOpenMicModal}>
                            No, change microphone
                        </button>
                        <button className="btn-black continue-pill" onClick={onContinue}>
                            Yes, continue
                        </button>
                    </div>
                </div>
            }
            right={
                <div className="split-right">
                    <div className="visualizer-wrapper">
                        <MicVisualizer deviceId={selectedDeviceId} />
                    </div>
                </div>
            }
        />
    );
};
