interface ShortcutOverlayProps {
    onClose: () => void;
}

export function ShortcutOverlay({ onClose }: ShortcutOverlayProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-msg">請按下新的組合鍵...</div>
    </div>
  );
}
