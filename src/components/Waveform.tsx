import React, { useEffect, useRef } from 'react';

interface WaveformProps {
    isRecording: boolean;
    color?: string;
    width?: number;
    height?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
    isRecording,
    color = '#ffffff',
    width = 100,
    height = 24
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const requestRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (isRecording) {
            startAudio();
        } else {
            stopAudio();
        }

        return () => stopAudio();
    }, [isRecording]);

    const startAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            animate();
        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    };

    const stopAudio = () => {
        if (requestRef.current !== null) {
            cancelAnimationFrame(requestRef.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        // Clear canvas when stopped
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const drawWave = (
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        amplitude: number,
        phase: number,
        frequency: number,
        opacity: number
    ) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 2; // Keep line width or thin it out? 1.5 maybe

        for (let x = 0; x <= w; x += 1) {
            // 漸變邊緣，讓波形在左右兩側消失
            const normalization = 1 - Math.pow((x - w / 2) / (w / 2), 2);
            const y = h / 2 + Math.sin(x * frequency + phase) * amplitude * normalization;

            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    };

    const animate = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // 計算平均音量
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const baseAmplitude = (average / 128) * (canvas.height / 2.5); // Adjust amplitude for smaller height

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const time = Date.now() / 1000;

        // 繪製多層波形
        drawWave(ctx, canvas.width, canvas.height, baseAmplitude * 1.2, time * 10, 0.06, 0.8);
        drawWave(ctx, canvas.width, canvas.height, baseAmplitude * 0.8, time * -8, 0.04, 0.5);
        drawWave(ctx, canvas.width, canvas.height, baseAmplitude * 0.5, time * 12, 0.09, 0.3);

        requestRef.current = requestAnimationFrame(animate);
    };

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width: `${width}px`, height: `${height}px` }}
        />
    );
};
