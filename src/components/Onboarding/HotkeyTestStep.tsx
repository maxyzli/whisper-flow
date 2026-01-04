import React from "react";
import { SplitLayout } from "./components/SplitLayout";
import { KeyboardVisualizer } from "./components/KeyboardVisualizer";

interface HotkeyTestStepProps {
    isFnPressed: boolean;
    onBack: () => void;
    onOpenHotkeyModal: () => void;
    onContinue: () => void;
}

export const HotkeyTestStep = ({
    isFnPressed,
    onBack,
    onOpenHotkeyModal,
    onContinue,
}: HotkeyTestStepProps) => {
    return (
        <SplitLayout
            className="test-hotkey-step"
            left={
                <div className="split-left">
                    <div className="back-link" onClick={onBack}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        <span>Back</span>
                    </div>
                    <div className="split-left-content">
                        <h2 className="step-title">Press to test your voice dictation hotkey</h2>
                        <p className="step-subtitle">
                            We recommend the <span className="key-inline">fn</span> key at the bottom left of the keyboard.
                        </p>
                        <div className="test-mic-prompt">
                            <p>Do you see the button turning blue while pressing?</p>
                        </div>
                    </div>

                    <div className="mic-test-footer">
                        <button className="btn-white-pill" onClick={onOpenHotkeyModal}>
                            No, change keyboard shortcut
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
                        <KeyboardVisualizer isFnPressed={isFnPressed} />
                    </div>
                </div>
            }
        />
    );
};
