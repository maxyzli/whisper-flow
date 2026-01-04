import { useState, useEffect } from "react";

interface MicVisualizerProps {
    deviceId: string;
}

export const MicVisualizer = ({ deviceId }: MicVisualizerProps) => {
    const [level, setLevel] = useState(0);

    useEffect(() => {
        let audioContext: AudioContext;
        let analyser: AnalyserNode;
        let microphone: MediaStreamAudioSourceNode;
        let rafId: number;
        let stream: MediaStream;

        async function setup() {
            try {
                const constraints = {
                    audio: deviceId === 'default' ? true : { deviceId: { exact: deviceId } }
                };
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                microphone = audioContext.createMediaStreamSource(stream);
                microphone.connect(analyser);
                analyser.fftSize = 64;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const update = () => {
                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArray[i];
                    }
                    const avg = sum / bufferLength;
                    setLevel(avg / 150);
                    rafId = requestAnimationFrame(update);
                };
                update();
            } catch (err) {
                console.error("Mic test error:", err);
            }
        }

        setup();
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (audioContext) audioContext.close();
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [deviceId]);

    const barCount = 14;
    return (
        <div className="mic-test-visualizer">
            <div className="visualizer-bars">
                {[...Array(barCount)].map((_, i) => {
                    const h = Math.max(32, 32 + level * 25 * (0.4 + Math.random() * 0.4));
                    return (
                        <div
                            key={i}
                            className="visualizer-bar"
                            style={{
                                height: `${h}px`,
                                backgroundColor: level > 0.05 ? '#007aff' : '#f2f2f3'
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};
