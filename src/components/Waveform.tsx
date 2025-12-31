import React, { useEffect, useRef } from 'react';
import { listen } from "@tauri-apps/api/event";

interface WaveformProps {
    isRecording: boolean;
    color?: string;
    width?: number;
    height?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
    isRecording,
    color = '#ffffff',
    width = 120,
    height = 32
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);
    const volumeRef = useRef<number>(0.1); // 當前音量緩衝
    const targetVolumeRef = useRef<number>(0.1);

    useEffect(() => {
        if (!isRecording) {
            cancelAnimate();
            return;
        }

        const setupListener = async () => {
            const unlisten = await listen<number>("audio-level", (event) => {
                targetVolumeRef.current = event.payload;
            });
            return unlisten;
        };

        const unlistenPromise = setupListener();
        animate();

        return () => {
            unlistenPromise.then(f => f());
            cancelAnimate();
        };
    }, [isRecording]);

    const cancelAnimate = () => {
        if (requestRef.current !== null) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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
        ctx.lineWidth = 2.5;

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
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 平滑音量變化
        volumeRef.current += (targetVolumeRef.current - volumeRef.current) * 0.4;

        // 稍微調高基礎起伏，並大幅增加波形振幅比例
        const effectiveVolume = Math.max(volumeRef.current, 0.1);
        const baseAmplitude = effectiveVolume * (canvas.height * 0.95);
        const time = Date.now() / 1000;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 繪製等多層波形，增加層次感
        drawWave(ctx, canvas.width, canvas.height, baseAmplitude * 1.0, time * 12, 0.08, 0.9);
        drawWave(ctx, canvas.width, canvas.height, baseAmplitude * 0.75, time * -10, 0.05, 0.6);
        drawWave(ctx, canvas.width, canvas.height, baseAmplitude * 0.5, time * 15, 0.12, 0.4);
        drawWave(ctx, canvas.width, canvas.height, baseAmplitude * 0.3, time * -20, 0.18, 0.2);

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
