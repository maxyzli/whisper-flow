import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface ResultSectionProps {
  transcription: string;
}

export function ResultSection({ transcription }: ResultSectionProps) {
  return (
    <section className="result-section">
      <div className="result-header">
        <label>轉錄結果</label>
        <button className="copy-btn" onClick={() => writeText(transcription)}>
          複製
        </button>
      </div>
      <textarea
        className="transcript-box"
        value={transcription}
        readOnly
        placeholder="等待錄音 或 拖入檔案..."
      />
    </section>
  );
}
