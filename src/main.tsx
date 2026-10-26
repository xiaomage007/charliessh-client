import React from "react";
import ReactDOM from "react-dom/client";

import "@xterm/xterm/css/xterm.css";

import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/app.css";
import "./components/common/common.css";
import "./components/servers/servers.css";
import "./components/terminal/terminal.css";
import "./components/chat/chat.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
