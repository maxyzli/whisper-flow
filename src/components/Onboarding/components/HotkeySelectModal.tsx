import React from "react";

interface HotkeySelectModalProps {
    selectedHotkey: string[];
    isRecordingHotkey: boolean;
    onStartRecording: () => void;
    onClose: () => void;
}

export const HotkeySelectModal = ({
    selectedHotkey,
    isRecordingHotkey,
    onStartRecording,
    onClose
}: HotkeySelectModalProps) => {
    return (
        <div className="mic-select-overlay" onClick={onClose}>
            <div className="hotkey-select-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Change keyboard shortcut</h3>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="modal-body hotkey-setting-row">
                    <div className="hotkey-info">
                        <h4>Voice dictation hotkey</h4>
                        <p>Hold down to speak. Double-press for hands-free mode.</p>
                    </div>
                    <div className="hotkey-input-wrapper">
                        <div
                            className={`hotkey-pill-box ${isRecordingHotkey ? 'recording' : ''}`}
                            onClick={onStartRecording}
                        >
                            {isRecordingHotkey ? (
                                <span className="hotkey-pill recording-text">Record New...</span>
                            ) : (
                                <div className="hotkey-pills">
                                    {selectedHotkey.map((key, i) => (
                                        <span key={i} className="hotkey-pill">
                                            {key === 'cmd' ? '⌘' : key === 'shift' ? '⇧' : key === 'option' ? '⌥' : key === 'control' ? '⌃' : key.toUpperCase()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
