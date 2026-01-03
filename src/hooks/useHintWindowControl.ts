import { useEffect } from "react";
import { getAllWindows, LogicalSize, LogicalPosition, currentMonitor, primaryMonitor } from "@tauri-apps/api/window";
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

    emit("sync-recording-status", isRecording);
    emit("sync-loading-status", isLoading);
    emit("sync-language", uiLanguage);

    const updateHintWindow = async () => {
      try {
        const windows = await getAllWindows();
        const hintWin = windows.find((w) => w.label === "recording-hint");

        if (!hintWin) return;

        if (isRecording || isLoading) {
          let monitor = await currentMonitor();
          if (!monitor) {
            monitor = await primaryMonitor();
          }

          if (monitor) {
            const { width: screenWidth, height: screenHeight } = monitor.size;
            const scaleFactor = monitor.scaleFactor;

            const winWidth = 240;
            const winHeight = 60;
            // 計算位置：螢幕下方中間偏上 (原本是 -120，改為 -60 讓它更靠下)
            const x = (screenWidth / scaleFactor - winWidth) / 2;
            const y = screenHeight / scaleFactor - winHeight - 10;

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
          // 清除 timer，防止在隱藏過程中突然顯示
          if (showTimer) clearTimeout(showTimer);

          console.log("Hint Window: Hiding...");
          // 狀態結束，隱藏視窗
          emit("sync-recording-status", false);
          emit("sync-loading-status", false);
          try { await hintWin.setIgnoreCursorEvents(false); } catch (e) { }
          await hintWin.hide();
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
