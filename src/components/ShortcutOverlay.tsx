interface ShortcutOverlayProps {
  onClose: () => void;
  t: any;
}

export function ShortcutOverlay({ onClose, t }: ShortcutOverlayProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-msg">{t.shortcutOverlayMsg}</div>
    </div>
  );
}
