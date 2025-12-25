import { AudioDevice } from "../constants";

interface ControlCardProps {
  devices: AudioDevice[];
  selectedDevice: string;
  setSelectedDevice: (id: string) => void;
  fetchDevices: () => void;
  isRecording: boolean;
  isLoading: boolean;
  isStarting: boolean;
  handleToggleLogic: () => void;
}

export function ControlCard({
  devices,
  selectedDevice,
  setSelectedDevice,
  fetchDevices,
  isRecording,
  isLoading,
  isStarting,
  handleToggleLogic,
}: ControlCardProps) {
  return (
    <section className="card control-card">
      <div className="device-select-row">
        <select
          className="modern-select transparent"
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          disabled={isRecording}
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              🎤 {d.name}
            </option>
          ))}
        </select>
        <button
          className="icon-btn"
          onClick={fetchDevices}
          title="重新整理設備"
        >
          ↻
        </button>
      </div>

      <button
        className={`record-main-btn ${isRecording ? "recording" : ""} ${
          isLoading ? "loading" : ""
        }`}
        onClick={handleToggleLogic}
        disabled={isStarting || isLoading}
      >
        <div className="inner-circle"></div>
        <span>
          {isLoading
            ? "轉錄中..."
            : isStarting
            ? "啟動中..."
            : isRecording
            ? "停止錄音"
            : "開始錄音"}
        </span>
      </button>
    </section>
  );
}
