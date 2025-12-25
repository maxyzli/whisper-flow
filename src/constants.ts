export const MODEL_OPTIONS = [
  { id: "tiny", label: "Tiny (極速)", desc: "適合簡單指令" },
  { id: "base", label: "Base (平衡)", desc: "日常使用推薦" },
  { id: "small", label: "Small (精準)", desc: "技術術語較佳" },
  { id: "medium", label: "Medium (最強)", desc: "適合長語音" },
];

export const LANGUAGE_OPTIONS = [
  { id: "auto", label: "Auto (自動判定)" },
  { id: "zh", label: "Chinese (中文)" },
  { id: "en", label: "English (英文)" },
];

export interface ModelStatus {
  exists: boolean;
  path: string;
}

export interface AudioDevice {
  id: string;
  name: string;
}
