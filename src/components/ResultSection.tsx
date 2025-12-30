import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface ResultSectionProps {
  transcription: string;
  t: any;
}

export function ResultSection({ transcription, t }: ResultSectionProps) {
  return (
    <section className="result-section">
      <div className="result-header">
        <label>{t.resultTitle}</label>
        <button className="copy-btn" onClick={() => writeText(transcription)}>
          {t.copyBtn}
        </button>
      </div>
      <textarea
        className="transcript-box"
        value={transcription}
        readOnly
        placeholder={t.resultPlaceholder}
      />
    </section>
  );
}
