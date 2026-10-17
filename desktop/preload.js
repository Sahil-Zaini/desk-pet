"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deskpet", {
  // overlay
  onConfig: (fn) => ipcRenderer.on("config", (_e, c) => fn(c)),
  onPlatforms: (fn) => ipcRenderer.on("platforms", (_e, p) => fn(p)),
  onCommand: (fn) => ipcRenderer.on("cmd", (_e, c) => fn(c)),
  hover: (over) => ipcRenderer.send("overlay:hover", !!over),
  // break screen
  breakDone: () => ipcRenderer.send("break:done"),
  breakSkip: () => ipcRenderer.send("break:skip"),
  breakSnooze: () => ipcRenderer.send("break:snooze"),
  // settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (s) => ipcRenderer.invoke("settings:save", s),
  openUrl: (u) => ipcRenderer.send("open:url", u)
});
