import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import logoWhite from "../assets/logo_white.png";

interface PermissionScreenProps {
  onRetry: () => void;
}

type Step = "welcome" | "permissions" | "test-mic" | "test-hotkey";

export function PermissionScreen({
  onRetry,
}: PermissionScreenProps) {
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
            // If we were just starting (e.g. state was 'fn' or empty), replace or append
            // For recording, we usually want to start fresh on first keydown 
            // but keep accumulating for the combination.
            // Let's use a trick: if it's the first keydown in this recording session, start fresh.
            // But we don't have a "first" flag easily. 
            // Let's just append if it's not there.
            return [...prev, key];
          }
          return prev;
        });
        return;
      }

      // Normal Fn key visual state
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
        // Commit on ANY key release
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

  // --- Auto Detection ---
  useEffect(() => {
    let interval: number;
    if (step === "permissions" && !accGranted) {
      // Poll for accessibility permission
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

  // --- Actions ---
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

  // --- Components ---

  const CheckIcon = () => (
    <div className="check-icon">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  );

  const ShieldIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  );

  const MonitorIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  );

  const SlashCircleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
  );

  const MicVisualizer = ({ deviceId }: { deviceId: string }) => {
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

  const KeyboardVisualizer = () => {
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

  const getProgressWidth = () => {
    switch (step) {
      case "welcome": return "20%";
      case "permissions": return "45%";
      case "test-mic": return "70%";
      case "test-hotkey": return "90%";
      default: return "0%";
    }
  };

  // --- Render ---

  return (
    <div className="onboarding-container">
      <header className="onboarding-header" data-tauri-drag-region>
        <div className="header-progress-bar" style={{ width: getProgressWidth() }}></div>
        <div className="nav-steps">
          <div className={step === "welcome" ? "nav-step active" : "nav-step"}>Sign up</div>
          <div className="nav-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div className={step === "permissions" ? "nav-step active" : "nav-step"}>Permissions</div>
          <div className="nav-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div className={step === "test-mic" || step === "test-hotkey" ? "nav-step active" : "nav-step"}>Set up</div>
          <div className="nav-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div className="nav-step">Try it</div>
        </div>
      </header>

      <div className="onboarding-content">
        {step === "welcome" && (
          <div className="welcome-step">
            <div className="logo-large">
              <img src={logoWhite} alt="Whisper Flow Logo" className="logo-img" />
            </div>
            <h1>Welcome to Whisper Flow</h1>
            <p>Smart dictation that understands you</p>
            <button className="btn-large" onClick={() => setStep("permissions")}>
              Get Started
            </button>
          </div>
        )}

        {step === "permissions" && (
          <div className="split-layout">
            <div className="split-left">
              <div className="split-left-content">
                <h2 className="step-title">
                  {accGranted && micGranted
                    ? "Thanks for trusting us, we value your privacy"
                    : "Set up Whisper Flow on your computer"}
                </h2>
                <div className="permission-cards">
                  {/* Accessibility Card */}
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
                          <button className="btn-black" onClick={handleAccessibilityPrompt}>Allow</button>
                          <div className="info-circle" title="Enables the global shortcut and auto-paste feature">i</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Microphone Card */}
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
                            onClick={handleRequestMic}
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
                  <button className="btn-black continue-pill fade-in" onClick={() => setStep("test-mic")}>
                    Continue
                  </button>
                </div>
              )}
            </div>

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
                      <button className="mac-btn primary" onClick={handleRequestMic}>Allow</button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {step === "test-mic" && (
          <div className="split-layout test-mic-step">
            <div className="split-left">
              <div className="back-link" onClick={() => setStep("permissions")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                <span>Back</span>
              </div>
              <div className="split-left-content">
                <h2 className="step-title">Speak to test your microphone</h2>
                <p className="step-subtitle">Your computer&apos;s built-in mic will ensure optimal transcription.</p>
                <div className="test-mic-prompt">
                  <p>Do you see the blue bars moving while you speak?</p>
                </div>
              </div>

              <div className="mic-test-footer">
                <button className="btn-white-pill" onClick={handleOpenMicModal}>
                  No, change microphone
                </button>
                <button className="btn-black continue-pill" onClick={() => setStep("test-hotkey")}>
                  Yes, continue
                </button>
              </div>
            </div>

            <div className="split-right">
              <div className="visualizer-wrapper">
                <MicVisualizer deviceId={selectedDeviceId} />
              </div>
            </div>
          </div>
        )}

        {step === "test-hotkey" && (
          <div className="split-layout test-hotkey-step">
            <div className="split-left">
              <div className="back-link" onClick={() => setStep("test-mic")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                <span>Back</span>
              </div>
              <div className="split-left-content">
                <h2 className="step-title">Press to test your voice dictation hotkey</h2>
                <p className="step-subtitle">
                  We recommend the <span className="key-inline">fn</span> key at the bottom left of the keyboard.
                </p>
                <div className="test-mic-prompt">
                  <p>Do you see the button turning blue while pressing?</p>
                </div>
              </div>

              <div className="mic-test-footer">
                <button className="btn-white-pill" onClick={() => setShowHotkeyModal(true)}>
                  No, change keyboard shortcut
                </button>
                <button className="btn-black continue-pill" onClick={onRetry}>
                  Yes, continue
                </button>
              </div>
            </div>

            <div className="split-right">
              <div className="visualizer-wrapper">
                <KeyboardVisualizer />
              </div>
            </div>
          </div>
        )}

        {showMicModal && (
          <div className="mic-select-overlay" onClick={() => setShowMicModal(false)}>
            <div className="mic-select-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Select a different microphone</h3>
                <button className="modal-close" onClick={() => setShowMicModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="device-list">
                <div
                  className={selectedDeviceId === 'default' ? 'device-item active' : 'device-item'}
                  onClick={() => { setSelectedDeviceId('default'); setShowMicModal(false); }}
                >
                  <span className="device-name">Auto-detect</span>
                  <span className="device-desc">Uses system default microphone</span>
                  {selectedDeviceId === 'default' && <div className="device-check">✓</div>}
                </div>
                {devices.map(device => (
                  <div
                    key={device.deviceId}
                    className={selectedDeviceId === device.deviceId ? 'device-item active' : 'device-item'}
                    onClick={() => { setSelectedDeviceId(device.deviceId); setShowMicModal(false); }}
                  >
                    <span className="device-name">{device.label || `Microphone ${device.deviceId.slice(0, 4)}`}</span>
                    {device.label.toLowerCase().includes('built-in') && <span className="device-desc" style={{ color: '#007aff' }}>Recommended</span>}
                    {selectedDeviceId === device.deviceId && <div className="device-check">✓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showHotkeyModal && (
          <div className="mic-select-overlay" onClick={() => setShowHotkeyModal(false)}>
            <div className="hotkey-select-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Change keyboard shortcut</h3>
                <button className="modal-close" onClick={() => setShowHotkeyModal(false)}>
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
                    onClick={() => {
                      setSelectedHotkey([]); // Clear current to start fresh
                      setIsRecordingHotkey(true);
                    }}
                  >
                    {isRecordingHotkey ? (
                      <span className="hotkey-pill recording-text">Record New...</span>
                    ) : (
                      <div className="hotkey-pills">
                        {selectedHotkey.map(k => (
                          <span key={k} className="hotkey-pill">
                            {k === 'cmd' ? '⌘' :
                              k === 'shift' ? '⇧' :
                                k === 'option' ? '⌥' :
                                  k === 'control' ? '⌃' :
                                    k.length === 1 ? k.toUpperCase() : k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}