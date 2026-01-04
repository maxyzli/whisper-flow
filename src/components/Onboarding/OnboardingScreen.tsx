import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { Step } from "./types";
import { OnboardingHeader } from "./OnboardingHeader";
import { WelcomeStep } from "./WelcomeStep";
import { PermissionsStep } from "./PermissionsStep";
import { MicTestStep } from "./MicTestStep";
import { HotkeyTestStep } from "./HotkeyTestStep";
import { ModelDownloadStep } from "./ModelDownloadStep";
import { TryItIntroStep } from "./TryItIntroStep";
import { TryItSamplesStep } from "./TryItSamplesStep";
import { MicSelectModal } from "./components/MicSelectModal";
import { HotkeySelectModal } from "./components/HotkeySelectModal";

interface OnboardingScreenProps {
    onRetry: () => void;
}

export function OnboardingScreen({ onRetry }: OnboardingScreenProps) {
    const [step, setStep] = useState<Step>("welcome");
    const [accGranted, setAccGranted] = useState(false);
    const [micGranted, setMicGranted] = useState(false);
    const [micLoading, setMicLoading] = useState(false);
    const [activeCard, setActiveCard] = useState<"acc" | "mic">("acc");

    const [showMicModal, setShowMicModal] = useState(false);
    const [showHotkeyModal, setShowHotkeyModal] = useState(false);
    const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
    const [selectedHotkey, setSelectedHotkey] = useState<string[]>(["fn"]);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [isFnPressed, setIsFnPressed] = useState(false);
    const [modelDownloading, setModelDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [testTranscription, setTestTranscription] = useState("");
    const [showDocHint, setShowDocHint] = useState(true);
    const [isMockupFocused, setIsMockupFocused] = useState(false);
    const [isRecordingVisual, setIsRecordingVisual] = useState(false);
    const [demoFinished, setDemoFinished] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isRecordingHotkey) {
                e.preventDefault();

                const keyMap: Record<string, string> = {
                    'meta': 'cmd',
                    'control': 'control',
                    'alt': 'option',
                    'shift': 'shift',
                    'function': 'fn'
                };

                let key = e.key.toLowerCase();
                if (e.code === 'Function' || e.key === 'Fn') key = 'fn';
                key = keyMap[key] || key;

                setSelectedHotkey(prev => {
                    if (!prev.includes(key)) {
                        return [...prev, key];
                    }
                    return prev;
                });
                return;
            }

            if (
                e.key === 'Fn' ||
                e.key === 'Function' ||
                e.code === 'Function' ||
                e.ctrlKey ||
                e.metaKey ||
                e.altKey ||
                e.code === 'ControlLeft' ||
                e.code === 'ControlRight' ||
                e.code === 'AltLeft' ||
                e.code === 'AltRight' ||
                e.code === 'MetaLeft' ||
                e.code === 'MetaRight'
            ) {
                setIsFnPressed(true);
            }
        };

        const handleKeyUp = () => {
            if (isRecordingHotkey) {
                setIsRecordingHotkey(false);
                return;
            }
            setIsFnPressed(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isRecordingHotkey]);

    useEffect(() => {
        let interval: number;
        if (step === "permissions" && !accGranted) {
            interval = window.setInterval(async () => {
                const granted = await invoke<boolean>("check_accessibility_permission");
                if (granted) {
                    setAccGranted(true);
                    setActiveCard("mic");
                }
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [step, accGranted]);

    const handleAccessibilityPrompt = async () => {
        await invoke("prompt_accessibility_permission");
    };

    const handleOpenMicModal = async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = allDevices.filter(d => d.kind === 'audioinput');
            setDevices(audioDevices);
            setShowMicModal(true);
        } catch (err) {
            console.error("Failed to list devices:", err);
        }
    };

    const handleRequestMic = async () => {
        setMicLoading(true);
        try {
            const granted = await invoke<boolean>("request_microphone_permission");
            if (granted) {
                setMicGranted(true);
            }
        } catch (error) {
            console.error("Failed to request mic permission:", error);
        } finally {
            setMicLoading(false);
        }
    };

    const getProgressWidth = () => {
        switch (step) {
            case "welcome": return "20%";
            case "permissions": return "40%";
            case "test-mic": return "55%";
            case "test-hotkey": return "65%";
            case "model-download": return "80%";
            case "try-it": return "90%";
            case "try-it-samples": return "100%";
            default: return "0%";
        }
    };

    const handleHotkeyContinue = async () => {
        try {
            await invoke("update_global_shortcut", { shortcutStr: selectedHotkey.join('+') });
            localStorage.setItem("wf_shortcut", selectedHotkey.join('+'));
        } catch (e) {
            console.error("Failed to register shortcut:", e);
        }

        try {
            const status = await invoke<{ exists: boolean }>("check_model_status", { modelType: "large-v3-turbo" });
            if (status.exists) {
                setStep("try-it");
            } else {
                setStep("model-download");
            }
        } catch (e) {
            setStep("try-it");
        }
    };

    const handleStartDownload = () => {
        setModelDownloading(true);
        invoke("download_model", { modelType: "large-v3-turbo" });
    };

    useEffect(() => {
        let unlisten: any;
        const setup = async () => {
            unlisten = await listen<any>("download-progress", (e) => {
                setDownloadProgress(e.payload.progress);
                if (e.payload.progress >= 100) {
                    setModelDownloading(false);
                }
            });
        };
        setup();
        return () => { if (unlisten) unlisten(); };
    }, []);

    useEffect(() => {
        let unlistenReady: any;
        let unlistenResult: any;

        const setupListeners = async () => {
            unlistenReady = await listen("recording-ready", () => {
                if (step === "try-it") setStep("try-it-samples");

                setIsRecordingVisual(true);
                setIsTranscribing(false);
                setTestTranscription("");
                setShowDocHint(false);
            });

            unlistenResult = await listen<string>("transcription-result", (event) => {
                const text = event.payload;
                setIsRecordingVisual(false);
                setIsTranscribing(true);

                let i = 0;
                const interval = setInterval(() => {
                    setTestTranscription(text.slice(0, i + 1));
                    i++;
                    if (i >= text.length) {
                        clearInterval(interval);
                        setIsTranscribing(false);
                        setDemoFinished(true);
                    }
                }, 30);
            });
        };

        if (step === "try-it" || step === "try-it-samples") {
            setupListeners();
        }

        return () => {
            if (unlistenReady) unlistenReady();
            if (unlistenResult) unlistenResult();
        };
    }, [step]);

    return (
        <div className="onboarding-container">
            <OnboardingHeader step={step} progress={getProgressWidth()} />

            <div className="onboarding-content">
                {step === "welcome" && (
                    <WelcomeStep onStart={() => setStep("permissions")} />
                )}

                {step === "permissions" && (
                    <PermissionsStep
                        accGranted={accGranted}
                        micGranted={micGranted}
                        micLoading={micLoading}
                        activeCard={activeCard}
                        setActiveCard={setActiveCard}
                        onAccessibilityPrompt={handleAccessibilityPrompt}
                        onRequestMic={handleRequestMic}
                        onContinue={() => setStep("test-mic")}
                    />
                )}

                {step === "test-mic" && (
                    <MicTestStep
                        selectedDeviceId={selectedDeviceId}
                        onBack={() => setStep("permissions")}
                        onOpenMicModal={handleOpenMicModal}
                        onContinue={() => setStep("test-hotkey")}
                    />
                )}

                {step === "test-hotkey" && (
                    <HotkeyTestStep
                        isFnPressed={isFnPressed}
                        onBack={() => setStep("test-mic")}
                        onOpenHotkeyModal={() => setShowHotkeyModal(true)}
                        onContinue={handleHotkeyContinue}
                    />
                )}

                {step === "model-download" && (
                    <ModelDownloadStep
                        modelDownloading={modelDownloading}
                        downloadProgress={downloadProgress}
                        onStartDownload={handleStartDownload}
                        onContinue={() => setStep("try-it")}
                    />
                )}

                {step === "try-it" && (
                    <TryItIntroStep
                        onBack={() => setStep("test-hotkey")}
                        onStartDemo={async () => {
                            const status = await invoke<{ exists: boolean }>("check_model_status", { modelType: "large-v3-turbo" });
                            if (status.exists) {
                                setStep("try-it-samples");
                            } else {
                                setStep("model-download");
                                invoke("download_model", { modelType: "large-v3-turbo" });
                            }
                        }}
                        modelDownloading={modelDownloading}
                        downloadProgress={downloadProgress}
                    />
                )}

                {step === "try-it-samples" && (
                    <TryItSamplesStep
                        selectedHotkey={selectedHotkey}
                        testTranscription={testTranscription}
                        isTranscribing={isTranscribing}
                        isRecordingVisual={isRecordingVisual}
                        demoFinished={demoFinished}
                        showDocHint={showDocHint}
                        isMockupFocused={isMockupFocused}
                        setIsMockupFocused={setIsMockupFocused}
                        onBack={() => setStep("try-it")}
                        onComplete={onRetry}
                    />
                )}
            </div>

            {showMicModal && (
                <MicSelectModal
                    devices={devices}
                    selectedDeviceId={selectedDeviceId}
                    onSelect={setSelectedDeviceId}
                    onClose={() => setShowMicModal(false)}
                />
            )}

            {showHotkeyModal && (
                <HotkeySelectModal
                    selectedHotkey={selectedHotkey}
                    isRecordingHotkey={isRecordingHotkey}
                    onStartRecording={() => {
                        setSelectedHotkey([]);
                        setIsRecordingHotkey(true);
                    }}
                    onClose={() => setShowHotkeyModal(false)}
                />
            )}
        </div>
    );
}
