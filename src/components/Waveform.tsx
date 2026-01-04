import React, { useEffect, useState, useRef } from 'react';
import { listen } from "@tauri-apps/api/event";

interface WaveformProps {
    isRecording: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ isRecording }) => {
    const [level, setLevel] = useState(0);
    const targetLevelRef = useRef(0);
    const currentLevelRef = useRef(0);
    const lastUpdateRef = useRef(Date.now());
    const rafRef = useRef<number | null>(null);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!isRecording) {
            setLevel(0);
            targetLevelRef.current = 0;
            currentLevelRef.current = 0;
            return;
        }

        const setupListener = async () => {
            return await listen<number>("audio-level", (event) => {
                targetLevelRef.current = event.payload;
                lastUpdateRef.current = Date.now();
            });
        };

        const unlistenPromise = setupListener();

        const animate = () => {
            const now = Date.now();

            // Watchdog: If no update for 300ms, force level to 0
            if (now - lastUpdateRef.current > 300) {
                targetLevelRef.current = 0;
            }

            // Smoothly move towards target
            const lerpFactor = targetLevelRef.current > currentLevelRef.current ? 0.2 : 0.15;
            currentLevelRef.current += (targetLevelRef.current - currentLevelRef.current) * lerpFactor;

            setLevel(currentLevelRef.current);
            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            unlistenPromise.then(f => f());
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isRecording]);

    const barCount = 5;
    const time = (Date.now() - startTimeRef.current) / 150;

    return (
        <div className="voice-bars-container">
            {[...Array(barCount)].map((_, i) => {
                const multipliers = [0.8, 1.1, 1.4, 1.1, 0.8];

                // Base 3px + responsive level + subtle organic "breathing"
                const breathing = Math.sin(time + i * 0.8) * 2 * (level > 0.01 ? 1 : 0.5);
                const reactive = level * 12 * multipliers[i];
                const finalHeight = Math.min(24, Math.max(3, 4 + reactive + breathing));

                return (
                    <div
                        key={i}
                        className="voice-bar"
                        style={{
                            height: `${finalHeight}px`,
                            backgroundColor: '#ffffff',
                            opacity: level > 0.05 ? 1 : 0.4,
                            transition: 'opacity 0.2s ease',
                        }}
                    />
                );
            })}
        </div>
    );
};
