import React from "react";
import ReactDOM from "react-dom/client";
import { RecordingHint } from "./components/RecordingHint";
import "./hint.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RecordingHint standalone />
  </React.StrictMode>
);
