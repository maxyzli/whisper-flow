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
  t,
}: Omit<ControlCardProps, "devices" | "selectedDevice" | "setSelectedDevice" | "fetchDevices"> & { t: any }) {
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
            ? t.btnProcessing
            : isStarting
              ? t.btnStarting
              : isRecording
                ? t.btnStop
                : t.btnStart}
        </span>
      </button>
    </section>
  );
}
