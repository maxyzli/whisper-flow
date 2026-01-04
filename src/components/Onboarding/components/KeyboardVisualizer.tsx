import React from "react";

interface KeyboardVisualizerProps {
    isFnPressed: boolean;
}

export const KeyboardVisualizer = ({ isFnPressed }: KeyboardVisualizerProps) => {
    return (
        <div className="keyboard-visualizer">
            <div className="keyboard-row">
                <div className="key tab">tab</div>
                <div className="key">Q</div>
                <div className="key">W</div>
            </div>
            <div className="keyboard-row">
                <div className="key caps">caps lock</div>
                <div className="key">A</div>
                <div className="key">S</div>
            </div>
            <div className="keyboard-row">
                <div className="key shift">shift</div>
                <div className="key">Z</div>
                <div className="key">X</div>
            </div>
            <div className="keyboard-row bottom">
                <div className={`key fn-key ${isFnPressed ? 'active' : ''}`}>
                    <div className="fn-top">fn</div>
                    <svg className="globe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                <div className="key control">
                    <div className="key-inner">
                        <span className="key-symbol">^</span>
                        <span>control</span>
                    </div>
                </div>
                <div className="key option">
                    <div className="key-inner">
                        <span className="key-symbol">⌥</span>
                        <span>option</span>
                    </div>
                </div>
                <div className="key command">
                    <div className="key-inner">
                        <span className="key-symbol">⌘</span>
                        <span>command</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
