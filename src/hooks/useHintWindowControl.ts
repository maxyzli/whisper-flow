import { useEffect } from "react";
import { getAllWindows, LogicalSize, LogicalPosition, currentMonitor, primaryMonitor, availableMonitors } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

interface UseHintWindowControlProps {
  isRecording: boolean;
  isLoading: boolean;
  windowLabel: string;
  uiLanguage: string;
}

export function useHintWindowControl({ isRecording, isLoading, windowLabel, uiLanguage }: UseHintWindowControlProps) {

  useEffect(() => {
    // 只有主視窗負責控制提示視窗
    if (windowLabel !== "main") return;

    let showTimer: ReturnType<typeof setTimeout> | undefined;


    const updateHintWindow = async () => {
      try {
        const windows = await getAllWindows();
        const hintWin = windows.find((w) => w.label === "recording-hint");

        if (!hintWin) return;

        if (isRecording || isLoading) {
          // 1. Get Mouse Position
          const mousePos = await invoke<{ x: number; y: number }>("get_mouse_position");
          console.log("Mouse Pos:", mousePos);

          // 2. Find target monitor
          const monitors = await availableMonitors();
          let targetMonitor = monitors.find(m => {
            const { x, y } = m.position;
            const { width, height } = m.size;
            // Check if mouse is within this monitor's bounds
            return (
              mousePos.x >= x &&
              mousePos.x < x + width &&
              mousePos.y >= y &&
              mousePos.y < y + height
            );
          });

          // Fallback to current/primary if not found
          if (!targetMonitor) {
            targetMonitor = await currentMonitor() || await primaryMonitor() || monitors[0];
          }

          if (targetMonitor) {
            const { width: screenWidth, height: screenHeight } = targetMonitor.size;
            const { x: monitorX, y: monitorY } = targetMonitor.position;
            const scaleFactor = targetMonitor.scaleFactor; // Logical to Physical ratio

            const winWidth = 100;
            const winHeight = 42;

            // Calculate centered X relative to the monitor
            // We rely on LogicalPosition but we need to convert monitor bounds to logical.
            const logicalWidth = screenWidth / scaleFactor;
            const logicalHeight = screenHeight / scaleFactor;
            const logicalMonitorX = monitorX / scaleFactor;
            const logicalMonitorY = monitorY / scaleFactor;

            const x = logicalMonitorX + (logicalWidth - winWidth) / 2;
            const y = logicalMonitorY + logicalHeight - winHeight - 5;

            // 逐一嘗試設定，失敗也不要卡死
            try { await hintWin.setDecorations(false); } catch (e) { }
            try { await hintWin.setShadow(false); } catch (e) { }
            try { await hintWin.setSize(new LogicalSize(winWidth, winHeight)); } catch (e) { }
            try { await hintWin.setPosition(new LogicalPosition(x, y)); } catch (e) { }
            try { await hintWin.setAlwaysOnTop(true); } catch (e) { }

            // 清除舊的 timer
            if (showTimer) clearTimeout(showTimer);

            // 延遲顯示，確保渲染準備就緒
            showTimer = setTimeout(async () => {
              console.log("Hint Window: Showing...");
              // 當轉錄中 (isLoading) 時，不忽略滑鼠事件，以便用戶點擊取消
              // 當錄音中 (isRecording) 時，維持忽略事件以避免干擾操作
              try { await hintWin.setIgnoreCursorEvents(!isLoading); } catch (e) { }
              await hintWin.show();
              // 再次同步狀態，防止 hint 視窗剛啟動沒收到
              emit("sync-recording-status", isRecording);
              emit("sync-loading-status", isLoading);
              emit("sync-language", uiLanguage);
            }, 50);
          } else {
            console.error("Hint Window: No monitor found.");
          }
        } else {
          // Clear timer to prevent showing during hide animation
          if (showTimer) clearTimeout(showTimer);

          console.log("Hint Window: Hiding...");

          try { await hintWin.setIgnoreCursorEvents(false); } catch (e) { }

          // 延遲一點點再隱藏，給予 UI 反應時間
          setTimeout(async () => {
            try { await hintWin.hide(); } catch (e) { }

            // 強制發送同步訊號多次，確保狀態更新
            // Move inside setTimeout to prevent UI glitch before hiding
            emit("sync-recording-status", false);
            emit("sync-loading-status", false);
          }, 50);
        }
      } catch (err) {
        console.error("Hint Window Control Error:", err);
      }
    };

    updateHintWindow();

    return () => {
      if (showTimer) clearTimeout(showTimer);
    };
  }, [isRecording, isLoading, windowLabel]);
}
