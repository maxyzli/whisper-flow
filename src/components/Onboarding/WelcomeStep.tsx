import React from "react";
import logoWhite from "../../assets/logo_white.png";

interface WelcomeStepProps {
    onStart: () => void;
}

export const WelcomeStep = ({ onStart }: WelcomeStepProps) => {
    return (
        <div className="welcome-step">
            <div className="logo-large">
                <img src={logoWhite} alt="Whisper Flow Logo" className="logo-img" />
            </div>
            <h1>Welcome to Whisper Flow</h1>
            <p>Smart dictation that understands you</p>
            <button className="btn-large" onClick={onStart}>
                Get Started
            </button>
        </div>
    );
};
