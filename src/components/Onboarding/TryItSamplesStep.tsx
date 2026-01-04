import { SplitLayout } from "./components/SplitLayout";
import { GoogleDocsIcon } from "./components/Icons";

interface TryItSamplesStepProps {
    selectedHotkey: string[];
    testTranscription: string;
    isTranscribing: boolean;
    isRecordingVisual: boolean;
    demoFinished: boolean;
    showDocHint: boolean;
    isMockupFocused: boolean;
    setIsMockupFocused: (focused: boolean) => void;
    onBack: () => void;
    onComplete: () => void;
}

export const TryItSamplesStep = ({
    selectedHotkey,
    testTranscription,
    isTranscribing,
    isRecordingVisual,
    demoFinished,
    showDocHint,
    isMockupFocused,
    setIsMockupFocused,
    onBack,
    onComplete,
}: TryItSamplesStepProps) => {
    return (
        <SplitLayout
            className="try-it-samples-step"
            left={
                <div className="split-left">
                    <div className="back-link" onClick={onBack}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        <span>Back</span>
                    </div>
                    <div className="split-left-content">
                        <h2 className="step-title">Dictate the message into the textbox</h2>

                        <div className="instruction-card">
                            <div className="instruction-header">
                                <div className="mic-dot-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                        <line x1="12" y1="19" x2="12" y2="23"></line>
                                        <line x1="8" y1="23" x2="16" y2="23"></line>
                                    </svg>
                                </div>
                                <span>Hold the {selectedHotkey.map(k => (
                                    <span key={k} className="key-hint">
                                        {k === 'cmd' ? '⌘' : k === 'shift' ? '⇧' : k === 'option' ? '⌥' : k === 'control' ? '⌃' : k.toUpperCase()}
                                    </span>
                                ))} key, read the message below, and release to insert spoken text.</span>
                            </div>
                            <div className="sample-text-box">
                                <p className="sample-text">My shopping list, bananas, oat milk, dark chocolate</p>
                            </div>
                        </div>
                    </div>

                    <div className="continue-footer-fixed">
                        <button
                            className={`btn-black continue-pill ${demoFinished ? '' : 'disabled'}`}
                            onClick={onComplete}
                            disabled={!demoFinished}
                            style={{ opacity: demoFinished ? 1 : 0.5, cursor: demoFinished ? 'pointer' : 'not-allowed' }}
                        >
                            Complete Onboarding
                        </button>
                    </div>
                </div>
            }
            right={
                <div className="split-right gray-bg">
                    <div className="docs-mockup-wrapper">
                        <div
                            className={`docs-mockup ${isMockupFocused ? 'focused' : ''}`}
                            onClick={() => setIsMockupFocused(true)}
                        >
                            <div className="docs-header">
                                <GoogleDocsIcon />
                                <span>Google Docs</span>
                            </div>
                            <div className="docs-content">
                                {showDocHint && (
                                    <div className="docs-placeholder">
                                        {isMockupFocused ? (
                                            <div className="transcribing-cursor-line">
                                                <div className="cursor-blink"></div>
                                                <span style={{ color: '#d2d2d7', marginLeft: '4px' }}>
                                                    Hold down on the {selectedHotkey.map(k => (
                                                        <span key={k}>[{k === 'cmd' ? '⌘' : k === 'shift' ? '⇧' : k === 'option' ? '⌥' : k === 'control' ? '⌃' : k.toUpperCase()}]</span>
                                                    ))} key and start speaking...
                                                </span>
                                            </div>
                                        ) : (
                                            <span>Click to focus and start dictating...</span>
                                        )}
                                    </div>
                                )}

                                {isRecordingVisual && (
                                    <div className="transcribing-cursor-line" style={{ opacity: 0.7 }}>
                                        <span style={{ color: '#007AFF', fontWeight: 600 }}>[Recording...]</span>
                                        <div className="cursor-blink" style={{ backgroundColor: '#007AFF' }}></div>
                                    </div>
                                )}

                                {isTranscribing && (
                                    <div className="transcribing-cursor-line">
                                        <span className="transcribing-text">{testTranscription}</span>
                                        <div className="cursor-blink"></div>
                                    </div>
                                )}
                                {!isTranscribing && testTranscription && (
                                    <div className="transcribing-cursor-line">
                                        <span className="transcribing-text">{testTranscription}</span>
                                        <div className="cursor-blink"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            }
        />
    );
};
