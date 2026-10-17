// Desk Pet desktop — main process.
// A transparent, click-through, always-on-top window covers the primary screen; the pet lives in it.
// MIT © Sahil Zaini / Zaini Developers
"use strict";

const { app, BrowserWindow, Tray, Menu, ipcMain, screen, powerMonitor, nativeImage, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
app.setAppUserModelId && app.setAppUserModelId("com.zainidevelopers.deskpet");
if (process.platform === "linux") app.commandLine.appendSwitch("enable-transparent-visuals");

// ------------------------------------------------------------------ settings
const DEFAULTS = {
  pet: "cat", color: "ginger", name: "Mishmish", size: 3, outfit: "auto",
  climbWindows: true,
  breaks: { enabled: true, every: 50, length: 5, mode: "soft", snooze: 5 },
  water: { enabled: true, every: 60 },
  eyes: { enabled: true, every: 20 },
  focus: { work: 25, rest: 5 },
  sleepWhenIdle: true,
  autostart: false,
  hidden: false
};
const SETTINGS_FILE = () => path.join(app.getPath("userData"), "settings.json");
let S = JSON.parse(JSON.stringify(DEFAULTS));
function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE(), "utf8"));
    S = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), saved);
  } catch (e) { /* first run */ }
}
function saveSettings() { try { fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(S, null, 2)); } catch (e) {} }
function deepMerge(a, b) {
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object") deepMerge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}

// ------------------------------------------------------------------ windows
let overlay = null, tray = null, settingsWin = null;
let breakWins = [], breakState = null;      // { kind, strict, endsAt }
let focusState = null;                      // { endsAt, timer }
const asset = (...p) => path.join(__dirname, ...p).replace("app.asar", "app.asar.unpacked");

function primary() { return screen.getPrimaryDisplay(); }

function createOverlay() {
  const d = primary();
  overlay = new BrowserWindow({
    x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height,
    transparent: true, frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, hasShadow: false, focusable: false, alwaysOnTop: true,
    backgroundColor: "#00000000",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.loadFile(path.join(__dirname, "renderer", "overlay.html"));
  overlay.webContents.on("did-finish-load", () => sendOverlay("config", overlayConfig()));
  if (S.hidden) overlay.hide();
}

function overlayConfig() {
  const d = primary();
  return {
    pet: S.pet, color: S.color, name: S.name, size: S.size, outfit: S.outfit,
    floor: d.workArea.y + d.workArea.height - d.bounds.y,      // top of the taskbar / dock
    left: d.workArea.x - d.bounds.x, right: d.workArea.x - d.bounds.x + d.workArea.width
  };
}
function sendOverlay(ch, data) { if (overlay && !overlay.isDestroyed()) overlay.webContents.send(ch, data); }

ipcMain.on("overlay:hover", (_e, over) => { if (overlay && !overlay.isDestroyed()) overlay.setIgnoreMouseEvents(!over, { forward: true }); });
ipcMain.handle("settings:get", () => S);
ipcMain.handle("settings:save", (_e, next) => {
  const petChanged = ["pet", "color", "name", "size", "outfit"].some(k => next[k] !== S[k]);
  S = deepMerge(S, next); saveSettings();
  applyAutostart(); scheduleAll(); buildTray();
  if (petChanged) sendOverlay("config", overlayConfig());
  if (!S.climbWindows) sendOverlay("platforms", []);
  return S;
});
ipcMain.on("open:url", (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

// ------------------------------------------------------------------ windows as platforms (Windows only)
// A PowerShell helper lists visible windows in z-order; we send the visible part of each window's top edge.
let scanner = null;
function startWindowScanner() {
  if (process.platform !== "win32" || scanner) return;
  try {
    scanner = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
      "-File", asset("assets", "windows.ps1"), String(process.pid)], { windowsHide: true });
  } catch (e) { scanner = null; return; }
  let buf = "";
  scanner.stdout.on("data", chunk => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("[")) continue;
      try { handleWindows(JSON.parse(line)); } catch (e) {}
    }
  });
  scanner.on("exit", () => { scanner = null; });
}
function handleWindows(list) {
  if (!S.climbWindows || breakState) return;
  const d = primary();
  const rects = list.map(([h, l, t, r, b, max]) => {
    let rc = { x: l, y: t, width: r - l, height: b - t };
    try { rc = screen.screenToDipRect(null, rc); } catch (e) {}
    return { id: String(h), l: rc.x, t: rc.y, r: rc.x + rc.width, b: rc.y + rc.height, max: !!max };
  });
  const out = [];
  rects.forEach((w, i) => {
    if (w.max) return;
    // visible part of this window's top edge = edge minus windows above it in the z-order
    let segs = [[w.l, w.r]];
    for (let j = 0; j < i && segs.length; j++) {
      const o = rects[j];
      if (o.t <= w.t && o.b >= w.t) {
        segs = segs.flatMap(([a, b]) => (o.r <= a || o.l >= b) ? [[a, b]] : [[a, Math.max(a, o.l)], [Math.min(b, o.r), b]].filter(([x, y]) => y - x > 1));
      }
    }
    segs.forEach(([a, b], k) => {
      if (b - a < 90) return;
      out.push({ id: w.id + ":" + k, x1: a - d.bounds.x, x2: b - d.bounds.x, y: w.t - d.bounds.y });
    });
  });
  sendOverlay("platforms", out);
}

// ------------------------------------------------------------------ reminders & breaks
let timers = [];
let nextBreakAt = 0, warned = false, idleSleeping = false;
function scheduleAll() {
  timers.forEach(clearInterval); timers = [];
  nextBreakAt = Date.now() + S.breaks.every * 60000; warned = false;
  let lastWater = Date.now(), lastEyes = Date.now();
  timers.push(setInterval(() => {
    const now = Date.now();
    let idle = 0; try { idle = powerMonitor.getSystemIdleTime(); } catch (e) {}
    // the pet naps while you're away
    if (S.sleepWhenIdle && !breakState) {
      if (idle >= 60 && !idleSleeping) { idleSleeping = true; sendOverlay("cmd", { type: "sleep" }); }
      if (idle < 3 && idleSleeping) { idleSleeping = false; sendOverlay("cmd", { type: "wake", say: "oh, you're back! 👋" }); }
    }
    if (breakState || focusState) return;
    // a long idle counts as a break
    if (idle >= S.breaks.length * 60) { nextBreakAt = now + S.breaks.every * 60000; warned = false; lastWater = now; lastEyes = now; return; }
    if (S.breaks.enabled) {
      if (!warned && now >= nextBreakAt - 60000) { warned = true; sendOverlay("cmd", { type: "say", text: "⏸️ break in 1 minute", ms: 5000 }); }
      if (now >= nextBreakAt) startBreak(S.breaks.length, "break", S.breaks.mode === "strict");
    }
    if (S.water.enabled && now - lastWater >= S.water.every * 60000) { lastWater = now; sendOverlay("cmd", { type: "center", say: "💧 Time to drink some water!", ms: 8000 }); }
    if (S.eyes.enabled && now - lastEyes >= S.eyes.every * 60000) { lastEyes = now; sendOverlay("cmd", { type: "center", say: "👀 20-20-20: look at something far away for 20 seconds", ms: 20000 }); }
  }, 5000));
}

function startBreak(minutes, kind, strict) {
  if (breakState) return;
  breakState = { kind, strict: !!strict, endsAt: Date.now() + minutes * 60000, minutes };
  if (overlay) overlay.hide();
  for (const d of screen.getAllDisplays()) {
    const w = new BrowserWindow({
      x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height,
      frame: false, transparent: true, backgroundColor: "#00000000", resizable: false, movable: false, minimizable: false,
      maximizable: false, fullscreenable: false, skipTaskbar: true, alwaysOnTop: true, closable: !strict, focusable: true, show: false,
      webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false }
    });
    w.setAlwaysOnTop(true, "screen-saver");
    w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    w.on("close", e => { if (breakState && breakState.strict && Date.now() < breakState.endsAt) e.preventDefault(); });
    if (strict) w.on("blur", () => { if (breakState && !w.isDestroyed()) setTimeout(() => !w.isDestroyed() && w.focus(), 50); });
    w.loadFile(path.join(__dirname, "renderer", "break.html"), {
      query: { kind, strict: strict ? "1" : "0", ends: String(breakState.endsAt), pet: S.pet, color: S.color, name: S.name || "", main: d.id === primary().id ? "1" : "0", outfit: S.outfit }
    });
    w.once("ready-to-show", () => { w.show(); if (d.id === primary().id) w.focus(); });
    breakWins.push(w);
  }
  buildTray();
}
function endBreak(reason) {
  if (!breakState) return;
  const st = breakState;
  breakState = null;
  breakWins.forEach(w => { if (!w.isDestroyed()) { w.setClosable(true); w.destroy(); } });
  breakWins = [];
  if (overlay && !S.hidden) overlay.showInactive();
  if (reason === "snooze") nextBreakAt = Date.now() + S.breaks.snooze * 60000;
  else nextBreakAt = Date.now() + S.breaks.every * 60000;
  warned = false;
  if (reason === "done") sendOverlay("cmd", { type: "celebrate", say: st.kind === "focus-rest" ? "back to work! 💪" : "welcome back! ✨" });
  buildTray();
}
ipcMain.on("break:done", () => endBreak("done"));
ipcMain.on("break:skip", () => { if (breakState && !breakState.strict) endBreak("skip"); });
ipcMain.on("break:snooze", () => { if (breakState && !breakState.strict) endBreak("snooze"); });

// Pomodoro focus sessions
function startFocus() {
  if (focusState || breakState) return;
  focusState = { endsAt: Date.now() + S.focus.work * 60000 };
  sendOverlay("cmd", { type: "focus", say: "🍅 focus time, I'll be quiet", minutes: S.focus.work });
  focusState.timer = setInterval(() => {
    const left = focusState.endsAt - Date.now();
    if (tray) tray.setToolTip("Desk Pet · focus " + Math.max(0, Math.ceil(left / 60000)) + " min left");
    if (left <= 0) { stopFocus(true); startBreak(S.focus.rest, "focus-rest", false); }
  }, 5000);
  buildTray();
}
function stopFocus(finished) {
  if (!focusState) return;
  clearInterval(focusState.timer); focusState = null;
  if (tray) tray.setToolTip("Desk Pet");
  if (!finished) sendOverlay("cmd", { type: "wake", say: "focus stopped" });
  buildTray();
}

// ------------------------------------------------------------------ tray
const PETS = [["Cat · ginger", "cat", "ginger"], ["Cat · black", "cat", "black"], ["Cat · white", "cat", "white"], ["Cat · grey", "cat", "grey"],
  ["Camel 🐪", "camel", "sand"], ["Dog · brown", "dog", "brown"], ["Dog · golden", "dog", "golden"], ["Dog · husky", "dog", "husky"]];
const NAMES = { cat: "Mishmish", camel: "Habibi", dog: "Biscuit" };

function buildTray() {
  if (!tray) {
    let img = nativeImage.createFromPath(path.join(__dirname, "build", "tray.png"));
    if (process.platform === "darwin") img = img.resize({ width: 18, height: 18 });
    tray = new Tray(img);
    tray.setToolTip("Desk Pet");
    tray.on("click", () => openSettings());
  }
  const inBreak = !!breakState, strict = inBreak && breakState.strict;
  const menu = Menu.buildFromTemplate([
    { label: S.hidden ? "Show pet" : "Hide pet", enabled: !inBreak, click: () => { S.hidden = !S.hidden; saveSettings(); S.hidden ? overlay.hide() : overlay.showInactive(); buildTray(); } },
    { label: "Choose pet", submenu: PETS.map(([label, pet, color]) => ({
      label, type: "radio", checked: S.pet === pet && S.color === color,
      click: () => { const rename = !S.name || Object.values(NAMES).includes(S.name); S.pet = pet; S.color = color; if (rename) S.name = NAMES[pet]; saveSettings(); sendOverlay("config", overlayConfig()); buildTray(); }
    })) },
    { label: "Feed", enabled: !inBreak, click: () => sendOverlay("cmd", { type: "feed" }) },
    { type: "separator" },
    { label: "Take a break now", enabled: !inBreak, click: () => startBreak(S.breaks.length, "break", S.breaks.mode === "strict") },
    focusState
      ? { label: "Stop focus session", click: () => stopFocus(false) }
      : { label: `Start focus session (${S.focus.work} min)`, enabled: !inBreak, click: () => startFocus() },
    { label: "Breaks every " + S.breaks.every + " min" + (S.breaks.enabled ? "" : " (off)"), enabled: false },
    { type: "separator" },
    { label: "Settings…", click: () => openSettings() },
    { label: "Start with " + (process.platform === "darwin" ? "macOS" : "Windows"), type: "checkbox", checked: !!S.autostart, visible: process.platform !== "linux",
      click: (m) => { S.autostart = m.checked; saveSettings(); applyAutostart(); } },
    { label: "Get Desk Pet for your website", click: () => shell.openExternal("https://sahil-zaini.github.io/desk-pet/") },
    { type: "separator" },
    { label: strict ? "Quit (after the break)" : "Quit Desk Pet", enabled: !strict, click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.show(); settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 560, height: 760, resizable: true, minWidth: 420, minHeight: 520, title: "Desk Pet settings", autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false }
  });
  settingsWin.loadFile(path.join(__dirname, "renderer", "settings.html"));
}

function applyAutostart() {
  if (process.platform === "linux") return;
  try { app.setLoginItemSettings({ openAtLogin: !!S.autostart, openAsHidden: true }); } catch (e) {}
}

// ------------------------------------------------------------------ lifecycle
app.on("second-instance", () => openSettings());
app.on("before-quit", e => { if (breakState && breakState.strict && Date.now() < breakState.endsAt) e.preventDefault(); });
app.on("window-all-closed", e => { /* keep running in the tray */ });
app.on("will-quit", () => { if (scanner) try { scanner.kill(); } catch (e) {} });

app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) app.dock.hide();
  loadSettings();
  createOverlay();
  buildTray();
  scheduleAll();
  applyAutostart();
  startWindowScanner();
  screen.on("display-metrics-changed", () => {
    const d = primary();
    if (overlay && !overlay.isDestroyed()) { overlay.setBounds(d.bounds); sendOverlay("config", overlayConfig()); }
  });
  if (process.env.DESKPET_TEST) global.__deskpet = { startBreak, endBreak, startFocus, stopFocus, state: () => ({ breakState, focusState }), handleWindows };
});
