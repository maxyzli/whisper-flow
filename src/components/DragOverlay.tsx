interface DragOverlayProps {
    withTimestamps: boolean;
}

export function DragOverlay({ withTimestamps }: DragOverlayProps) {
  return (
    <div className="drag-overlay">
      <div className="drag-content">
        <div className="drag-icon">📂</div>
        <div className="drag-text">釋放以匯入檔案</div>
        <div className="drag-subtext">
          {withTimestamps ? "將生成 SRT 字幕" : "純文字模式"}
        </div>
      </div>
    </div>
  );
}
