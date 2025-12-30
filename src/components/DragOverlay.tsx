interface DragOverlayProps {
  withTimestamps: boolean;
  t: any;
}

export function DragOverlay({ withTimestamps, t }: DragOverlayProps) {
  return (
    <div className="drag-overlay">
      <div className="drag-content">
        <div className="drag-icon">📂</div>
        <div className="drag-text">{t.dragText}</div>
        <div className="drag-subtext">
          {withTimestamps ? t.dragSubtextSRT : t.dragSubtextText}
        </div>
      </div>
    </div>
  );
}
