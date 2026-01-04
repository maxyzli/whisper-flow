import React from "react";
import { SplitLayout } from "./components/SplitLayout";
import { CheckIcon, ShieldIcon, SlashCircleIcon, MonitorIcon } from "./components/Icons";

interface PermissionsStepProps {
    accGranted: boolean;
    micGranted: boolean;
    micLoading: boolean;
    activeCard: "acc" | "mic";
    setActiveCard: (card: "acc" | "mic") => void;
    onAccessibilityPrompt: () => void;
    onRequestMic: () => void;
    onContinue: () => void;
}

export const PermissionsStep = ({
    accGranted,
    micGranted,
    micLoading,
    activeCard,
    setActiveCard,
    onAccessibilityPrompt,
    onRequestMic,
    onContinue,
}: PermissionsStepProps) => {
    return (
        <SplitLayout
            left={
                <div className="split-left">
                    <div className="split-left-content">
                        <h2 className="step-title">
                            {accGranted && micGranted
                                ? "Thanks for trusting us, we value your privacy"
                                : "Set up Whisper Flow on your computer"}
                        </h2>
                        <div className="permission-cards">
                            <div
                                className={(accGranted && micGranted) ? "perm-card granted summary" : (activeCard === 'acc' ? 'perm-card active' : (accGranted ? 'perm-card granted' : 'perm-card'))}
                                onClick={() => setActiveCard("acc")}
                            >
                                <div className="perm-header">
                                    <h3>Allow Whisper Flow to paste text into any textbox</h3>
                                    {accGranted && <CheckIcon />}
                                </div>
                                {activeCard === 'acc' && !accGranted && (
                                    <>
                                        <p className="perm-desc">This lets Whisper Flow put your spoken words in the right textbox.</p>
                                        <div className="perm-actions">
                                            <button className="btn-black" onClick={onAccessibilityPrompt}>Allow</button>
                                            <div className="info-circle" title="Enables the global shortcut and auto-paste feature">i</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div
                                className={(accGranted && micGranted) ? "perm-card granted summary" : (activeCard === 'mic' ? 'perm-card active' : (micGranted ? 'perm-card granted' : 'perm-card'))}
                                onClick={() => setActiveCard("mic")}
                            >
                                <div className="perm-header">
                                    <h3>Allow Whisper Flow to use your microphone</h3>
                                    {micGranted && <CheckIcon />}
                                </div>
                                {activeCard === 'mic' && !micGranted && (
                                    <>
                                        <p className="perm-desc">Whisper Flow will only access the mic when you are actively using it.</p>
                                        <div className="perm-actions">
                                            <button
                                                className="btn-black"
                                                onClick={onRequestMic}
                                                disabled={micLoading}
                                            >
                                                {micLoading ? "Detecting..." : "Allow"}
                                            </button>
                                            <div className="info-circle" title="Required to record your voice for transcription">i</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {accGranted && micGranted && (
                        <div className="continue-footer">
                            <button className="btn-black continue-pill fade-in" onClick={onContinue}>
                                Continue
                            </button>
                        </div>
                    )}
                </div>
            }
            right={
                <div className="split-right">
                    {accGranted && micGranted ? (
                        <div className="privacy-card-wide fade-in">
                            <div className="privacy-points">
                                <div className="privacy-point">
                                    <ShieldIcon />
                                    <div className="point-content">
                                        <h4>Zero data retention</h4>
                                        <p>Your voice dictations are private with zero data retention.</p>
                                    </div>
                                </div>
                                <div className="privacy-point">
                                    <SlashCircleIcon />
                                    <div className="point-content">
                                        <h4>Never store or train on your data</h4>
                                        <p>None of your dictation data will be stored or used for model training by us or third party.</p>
                                    </div>
                                </div>
                                <div className="privacy-point">
                                    <MonitorIcon />
                                    <div className="point-content">
                                        <h4>Everything stays local</h4>
                                        <p>All history stays local on your device.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        activeCard === "acc" ? (
                            <div className="mockup-container accessibility-mockup">
                                <div className="mockup-header">
                                    <div className="mockup-dot red"></div>
                                    <div className="mockup-dot yellow"></div>
                                    <div className="mockup-dot green"></div>
                                    <span className="mockup-title">Accessibility</span>
                                </div>
                                <div className="mac-dialog-embed">
                                    <p className="mockup-desc">
                                        Allow the applications below to control your computer.
                                    </p>
                                    <div className="mockup-list">
                                        <div className="item">
                                            <span className="mockup-item-name">HazeOver</span>
                                            <div className="toggle on"></div>
                                        </div>
                                        <div className="item">
                                            <span className="mockup-item-name">Alfred 5</span>
                                            <div className="toggle on"></div>
                                        </div>
                                        <div className="item">
                                            <span className="mockup-item-name">Whisper Flow</span>
                                            <div className={accGranted ? 'toggle on' : 'toggle'}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mac-dialog">
                                <div className="mac-dialog-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                        <line x1="12" y1="19" x2="12" y2="23"></line>
                                        <line x1="8" y1="23" x2="16" y2="23"></line>
                                    </svg>
                                </div>
                                <h4>&quot;Whisper Flow&quot; would like to access the microphone.</h4>
                                <p>Whisper Flow requires access to your microphone for voice transcription.</p>
                                <div className="mac-dialog-buttons">
                                    <button className="mac-btn secondary">Don&apos;t Allow</button>
                                    <button className="mac-btn primary" onClick={onRequestMic}>Allow</button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            }
        />
    );
};
