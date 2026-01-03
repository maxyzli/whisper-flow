import React, { useEffect, useState, useRef } from 'react';
import { listen } from "@tauri-apps/api/event";

interface WaveformProps {
    isRecording: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ isRecording }) => {
    const [level, setLevel] = useState(0);
    const targetLevelRef = useRef(0);
    const currentLevelRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isRecording) {
            setLevel(0);
            return;
        }

        const setupListener = async () => {
            return await listen<number>("audio-level", (event) => {
                // event.payload is typically 0.0 to 1.8
                targetLevelRef.current = event.payload;
            });
        };

        const unlistenPromise = setupListener();

        const animate = () => {
            currentLevelRef.current += (targetLevelRef.current - currentLevelRef.current) * 0.3;
            // 限制一下範圍並稍微放大感官效果
            const displayLevel = Math.max(0, currentLevelRef.current);
            setLevel(displayLevel);
            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            unlistenPromise.then(f => f());
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isRecording]);

    const barCount = 5;

    return (
        <div className="voice-bars-container">
            {[...Array(barCount)].map((_, i) => {
                // 為不同位置的 Bar 增加一些靈動的縮放比例
                const multipliers = [0.6, 1.0, 1.4, 1.0, 0.6];
                const height = Math.min(24, 4 + level * 15 * multipliers[i]);

                return (
                    <div
                        key={i}
                        className="voice-bar"
                        style={{
                            height: `${height}px`,
                            backgroundColor: level > 0.05 ? '#ff453a' : '#ffffff',
                            opacity: level > 0.05 ? 1 : 0.5,
                        }}
                    />
                );
            })}
        </div>
    );
};
