# Whisper Flow 🎙️

A lightweight, local AI voice transcription tool built with **Tauri v2**, **React**, and **Rust**.
Whisper Flow runs OpenAI's Whisper models locally on your machine, ensuring privacy and speed without sending audio data to the cloud.

![License](https://img.shields.io/badge/license-MIT-blue)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)

## 📥 Download

> **Note**: Whisper Flow is currently available for **macOS** (Silicon/Intel) only.

[**Download the latest version from GitHub Releases**](https://github.com/maxyzli/whisper-flow/releases)

## ✨ Features

- **🔒 Local & Private**: All transcription happens on-device using quantized Whisper models (ggml).
- **👻 Native Floating Hint**: A beautiful, completely transparent floating capsule indicates recording status without blocking your workflow.
  - Built with native macOS `NSWindow` APIs for true transparency and click-through capability.
- **⚡️ Global Shortcuts**: Toggle recording instantly from anywhere (Default: `Shift + Command + A`).
- **📂 Drag & Drop**: Drag audio/video files directly into the app to transcribe them.
- **📋 Auto-Copy**: Transcribed text is automatically copied to your clipboard.
- **🎯 System Integration**:
  - Native microphone access.
  - Accessibility API integration for global input monitoring.
  - macOS "Ghost Window" mode (ignores mouse events, fully transparent background).

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Modular CSS
- **Backend**: Rust (Tauri v2), `objc2` (for macOS native window management), `cpal` (Audio), `whisper.cpp` (Model inference)
- **State Management**: React Hooks + Tauri Event System

##  Getting Started

### Prerequisites

- Node.js (v18+)
- Rust (latest stable)
- macOS (tested on Sonoma/Sequoia)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/whisper-flow.git
   cd whisper-flow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Binaries & Models**
   - **Models**: The app will automatically download the Whisper model on first run.
   - **Binaries**: You must manually place the required binaries in `src-tauri/binaries/`:
     - `ffmpeg`: Download a standalone FFmpeg binary (aarch64 for Apple Silicon, x64 for Intel).
     - `whisper-cli`: Build or download `whisper-cpp` CLI.
     - **Naming**: Ensure files are named specifically for your architecture, e.g., `ffmpeg-aarch64-apple-darwin` and `whisper-cli-aarch64-apple-darwin`.

4. **Run in Development Mode**
   ```bash
   npm run tauri dev
   ```

5. **Build for Production**
   ```bash
   npm run tauri build
   ```

## 🧩 Permissions

On the first launch, the app will request the following permissions:
1. **Microphone**: To record audio.
2. **Accessibility**: To listen for global shortcuts (e.g., `Shift+Cmd+A`) even when the app is in the background.

## 🏗️ Architecture Highlights

- **Multi-Window System**: Uses a dedicated lightweight `hint.html` entry point for the floating window to minimize resource usage.
- **Zero-Style-Leakage**: The floating window uses a separate CSS stack (`hint.css`) and Native DOM injection to prevent main window styles from affecting the transparent background.
- **Rust-Native Transparency**: Leverages `objc2` and Cocoa APIs to manipulate the underlying `NSWindow`, ensuring a "glass-like" effect that standard Webviews cannot achieve alone.

## 📝 License

MIT License