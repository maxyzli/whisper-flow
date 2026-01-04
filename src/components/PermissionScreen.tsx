import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface PermissionScreenProps {
  onRetry: () => void;
}

type Step = "welcome" | "permissions" | "privacy";

export function PermissionScreen({
  onRetry,
}: PermissionScreenProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [accGranted, setAccGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [micLoading, setMicLoading] = useState(false);
  const [activeCard, setActiveCard] = useState<"acc" | "mic">("acc");

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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  );

  const ShieldIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  );

  const LockIcon = () => (
    <svg className="point-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
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

  // --- Render ---

  return (
    <div className="onboarding-container fade-in">
      <header className="onboarding-header">
        <div className="nav-steps">
          <div className={step === 'welcome' ? 'nav-step active' : 'nav-step'}>Sign up</div>
          <div className="nav-step">›</div>
          <div className={step === 'permissions' ? 'nav-step active' : 'nav-step'}>Permissions</div>
          <div className="nav-step">›</div>
          <div className={step === 'privacy' ? 'nav-step active' : 'nav-step'}>Set up</div>
          <div className="nav-step">›</div>
          <div className="nav-step">Try it</div>
        </div>
      </header>

      <div className="onboarding-content">
        {step === "welcome" && (
          <div className="welcome-step">
            <div className="logo-large">
              <svg className="logo-icon-svg" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
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
                  <button className="btn-black continue-pill fade-in" onClick={onRetry}>
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
                      <span style={{ fontSize: '12px', color: '#86868b', marginLeft: '8px' }}>Accessibility</span>
                    </div>
                    <div className="mac-dialog-embed">
                      <p style={{ fontSize: '13px', color: '#86868b', marginBottom: '16px' }}>
                        Allow the applications below to control your computer.
                      </p>
                      <div className="item">
                        <div className="logo-small-mac">
                          <svg className="logo-icon-svg" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>Whisper Flow</span>
                        <div className={accGranted ? 'toggle on' : 'toggle'}></div>
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

        {step === "privacy" && (
          <div className="split-layout privacy-step">
            <div className="split-left">
              <h2 className="step-title" style={{ maxWidth: '400px' }}>Thanks for trusting us, we value your privacy</h2>
              <div className="permission-cards">
                <div className="perm-card granted">
                  <div className="perm-header">
                    <h3>Allow Whisper Flow to paste text into any textbox</h3>
                    <CheckIcon />
                  </div>
                </div>
                <div className="perm-card granted">
                  <div className="perm-header">
                    <h3>Allow Whisper Flow to use your microphone</h3>
                    <CheckIcon />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <button className="btn-large" onClick={onRetry}>
                  Complete Setup
                </button>
              </div>
            </div>

            <div className="split-right">
              <div className="privacy-points">
                <div className="privacy-point">
                  <ShieldIcon />
                  <div className="point-content">
                    <h4>Zero data retention</h4>
                    <p>Your voice dictations are private with zero data retention.</p>
                  </div>
                </div>
                <div className="privacy-point">
                  <LockIcon />
                  <div className="point-content">
                    <h4>Never store or train on your data</h4>
                    <p>None of your dictation data will be stored or used for model training by us or third parties.</p>
                  </div>
                </div>
                <div className="privacy-point">
                  <MonitorIcon />
                  <div className="point-content">
                    <h4>Everything stays local</h4>
                    <p>Process happens directly on your device. Your voice never leaves your computer.</p>
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