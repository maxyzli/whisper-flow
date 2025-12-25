import { useEffect } from "react";
import { getAllWindows, LogicalSize, LogicalPosition, currentMonitor } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";

interface UseHintWindowControlProps {
  isRecording: boolean;
  isLoading: boolean;
  windowLabel: string;
}

export function useHintWindowControl({ isRecording, isLoading, windowLabel }: UseHintWindowControlProps) {
  
  useEffect(() => {
    // 只有主視窗負責控制提示視窗
    if (windowLabel !== "main") return;

    // 發送狀態同步事件 (確保 hint 視窗內的 React 狀態更新)
    emit("sync-recording-status", isRecording);
    emit("sync-loading-status", isLoading);

    const updateHintWindow = async () => {
      try {
        const windows = await getAllWindows();
        const hintWin = windows.find((w) => w.label === "recording-hint");

        if (!hintWin) return;

        if (isRecording || isLoading) {
          const monitor = await currentMonitor();
          if (monitor) {
            const { width: screenWidth, height: screenHeight } = monitor.size;
            const scaleFactor = monitor.scaleFactor;

            const winWidth = 240;
            const winHeight = 60;
            // 計算位置：螢幕下方中間偏上
            const x = (screenWidth / scaleFactor - winWidth) / 2;
            const y = screenHeight / scaleFactor - winHeight - 120;

            // 逐一嘗試設定，失敗也不要卡死
            try { await hintWin.setDecorations(false); } catch (e) {}
            try { await hintWin.setShadow(false); } catch (e) {}
            try { await hintWin.setSize(new LogicalSize(winWidth, winHeight)); } catch (e) {}
            try { await hintWin.setPosition(new LogicalPosition(x, y)); } catch (e) {}
            try { await hintWin.setAlwaysOnTop(true); } catch (e) {}

            // 延遲顯示，確保渲染準備就緒
            setTimeout(async () => {
              try { await hintWin.setIgnoreCursorEvents(true); } catch (e) {}
              await hintWin.show();
              // 再次同步狀態，防止 hint 視窗剛啟動沒收到
              emit("sync-recording-status", isRecording);
              emit("sync-loading-status", isLoading);
            }, 50);
          }
        } else {
          // 狀態結束，隱藏視窗
          emit("sync-recording-status", false);
          emit("sync-loading-status", false);
          await hintWin.hide();
        }
      } catch (err) {
        console.error("Hint Window Control Error:", err);
      }
    };

    updateHintWindow();
  }, [isRecording, isLoading, windowLabel]);
}
