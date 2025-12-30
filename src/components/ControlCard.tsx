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
  isRecording,
  isLoading,
  isStarting,
  handleToggleLogic,
}: Omit<ControlCardProps, "devices" | "selectedDevice" | "setSelectedDevice" | "fetchDevices">) {
  return (
    <section className="card control-card minimalist">
      <button
        className={`record-main-btn ${isRecording ? "recording" : ""} ${isLoading ? "loading" : ""
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
