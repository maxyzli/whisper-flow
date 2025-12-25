interface HeaderProps {
  isRecording: boolean;
  isLoading: boolean;
}

export function Header({ isRecording, isLoading }: HeaderProps) {
  return (
    <header>
      <h1>Whisper Flow</h1>
      <div className="status-bar">
        {isRecording ? (
          <span className="tag recording">REC</span>
        ) : isLoading ? (
          <span className="tag processing">AI 分析中...</span>
        ) : (
          <span className="tag idle">就緒</span>
        )}
      </div>
    </header>
  );
}
