import React from "react";

interface MicSelectModalProps {
    devices: MediaDeviceInfo[];
    selectedDeviceId: string;
    onSelect: (id: string) => void;
    onClose: () => void;
}

export const MicSelectModal = ({
    devices,
    selectedDeviceId,
    onSelect,
    onClose
}: MicSelectModalProps) => {
    return (
        <div className="mic-select-overlay" onClick={onClose}>
            <div className="mic-select-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Select a different microphone</h3>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="device-list">
                    <div
                        className={selectedDeviceId === 'default' ? 'device-item active' : 'device-item'}
                        onClick={() => {
                            onSelect('default');
                            localStorage.setItem("wf_device", "0");
                            onClose();
                        }}
                    >
                        <span className="device-name">Auto-detect</span>
                        <span className="device-desc">Uses system default microphone</span>
                        {selectedDeviceId === 'default' && <div className="device-check">✓</div>}
                    </div>
                    {devices.map(device => (
                        <div
                            key={device.deviceId}
                            className={selectedDeviceId === device.deviceId ? 'device-item active' : 'device-item'}
                            onClick={() => {
                                onSelect(device.deviceId);
                                localStorage.setItem("wf_device", device.deviceId);
                                onClose();
                            }}
                        >
                            <span className="device-name">{device.label || `Microphone ${device.deviceId.slice(0, 4)}`}</span>
                            {device.label.toLowerCase().includes('built-in') && <span className="device-desc" style={{ color: '#007aff' }}>Recommended</span>}
                            {selectedDeviceId === device.deviceId && <div className="device-check">✓</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
