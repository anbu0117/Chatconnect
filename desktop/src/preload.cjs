const { contextBridge } = require("electron");

// Nothing privileged is exposed today — the app works purely over
// HTTPS/WebSocket to the ChatConnect backend, same as in a browser.
// This bridge exists so future native features (native notifications,
// tray icon, deep links) have a safe place to be added without
// enabling nodeIntegration in the renderer.
contextBridge.exposeInMainWorld("chatConnectDesktop", {
  platform: process.platform,
});
