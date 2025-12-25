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
