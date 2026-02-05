const { app, BrowserWindow, ipcMain, powerMonitor, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const log = require('electron-log');
const screenshot = require('screenshot-desktop');
const Database = require('better-sqlite3');

const DEFAULT_API_URL = 'http://localhost:4000';
const IDLE_THRESHOLD_SECONDS = 180;
const ACTIVITY_POLL_MS = 5000;
const MAX_ACTIVITY_SEGMENT_MS = 60000;
const FLUSH_INTERVAL_MS = 30000;
const SCREEN_FLUSH_INTERVAL_MS = 60000;

let mainWindow = null;
let tray = null;
let isQuitting = false;
let tracking = false;
let activityTimer = null;
let flushTimer = null;
let screenshotTimer = null;
let screenFlushTimer = null;
let latestBrowserInfo = null;
let activeWinFn = null;
let db = null;
let autoUpdater = null;

const configPath = () => path.join(app.getPath('userData'), 'config.json');
const screenshotsDir = () => path.join(app.getPath('userData'), 'screens');
const dbPath = () => path.join(app.getPath('userData'), 'agent.db');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadConfig() {
  return loadJson(configPath(), {
    apiUrl: DEFAULT_API_URL,
    accessToken: null,
    refreshToken: null,
    tenantId: null,
    userId: null,
    deviceId: null,
    autoStart: false,
  });
}

function saveConfig(config) {
  saveJson(configPath(), config);
}

function initDb() {
  ensureDir(app.getPath('userData'));
  db = new Database(dbPath());
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      app_name TEXT NOT NULL,
      window_title TEXT,
      url TEXT,
      idle INTEGER NOT NULL,
      device_id TEXT
    );
    CREATE TABLE IF NOT EXISTS screen_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      device_id TEXT,
      attempts INTEGER DEFAULT 0
    );
  `);
}

function enqueueActivity(event) {
  const stmt = db.prepare(
    `INSERT INTO activity_queue (started_at, ended_at, app_name, window_title, url, idle, device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    event.startedAt,
    event.endedAt,
    event.appName,
    event.windowTitle || null,
    event.url || null,
    event.idle ? 1 : 0,
    event.deviceId || null,
  );
}

function dequeueActivities(limit = 200) {
  const rows = db.prepare(`SELECT * FROM activity_queue ORDER BY id ASC LIMIT ?`).all(limit);
  return rows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    appName: row.app_name,
    windowTitle: row.window_title || undefined,
    url: row.url || undefined,
    idle: !!row.idle,
    deviceId: row.device_id || undefined,
  }));
}

function deleteActivities(ids) {
  if (!ids.length) return;
  const stmt = db.prepare(`DELETE FROM activity_queue WHERE id = ?`);
  const transaction = db.transaction((toDelete) => {
    toDelete.forEach((id) => stmt.run(id));
  });
  transaction(ids);
}

function enqueueScreen(filePath, takenAt, deviceId) {
  const stmt = db.prepare(
    `INSERT INTO screen_queue (file_path, taken_at, device_id, attempts)
     VALUES (?, ?, ?, 0)`
  );
  stmt.run(filePath, takenAt, deviceId || null);
}

function getPendingScreens(limit = 20) {
  return db.prepare(`SELECT * FROM screen_queue ORDER BY id ASC LIMIT ?`).all(limit);
}

function deleteScreens(ids) {
  if (!ids.length) return;
  const stmt = db.prepare(`DELETE FROM screen_queue WHERE id = ?`);
  const tx = db.transaction((toDelete) => {
    toDelete.forEach((id) => stmt.run(id));
  });
  tx(ids);
}

function incrementScreenAttempt(id) {
  db.prepare(`UPDATE screen_queue SET attempts = attempts + 1 WHERE id = ?`).run(id);
}

async function apiFetch(pathname, options = {}) {
  const config = loadConfig();
  const headers = Object.assign({}, options.headers || {});
  if (config.accessToken) {
    headers.Authorization = `Bearer ${config.accessToken}`;
  }
  headers['Content-Type'] = 'application/json';

  let res = await fetch(`${config.apiUrl}${pathname}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && config.refreshToken) {
    try {
      const refreshRes = await fetch(`${config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: config.refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        saveConfig({ ...config, accessToken: data.accessToken, refreshToken: data.refreshToken });
        res = await fetch(`${config.apiUrl}${pathname}`, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${data.accessToken}`,
          },
        });
      }
    } catch {
      // ignore refresh errors
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function registerDevice() {
  const config = loadConfig();
  if (!config.accessToken) return null;
  const deviceName = os.hostname();
  const platform = process.platform;
  const res = await apiFetch('/devices/register', {
    method: 'POST',
    body: JSON.stringify({ deviceName, platform }),
  });
  saveConfig({ ...config, deviceId: res.id });
  return res.id;
}

function isBrowser(appName = '') {
  const name = appName.toLowerCase();
  return name.includes('chrome') || name.includes('edge') || name.includes('firefox');
}

function getLatestUrl() {
  if (!latestBrowserInfo) return null;
  const age = Date.now() - latestBrowserInfo.timestamp;
  if (age > 15000) return null;
  return latestBrowserInfo.url || null;
}

async function getActiveWindow() {
  if (!activeWinFn) {
    const mod = await import('active-win');
    activeWinFn = mod.default || mod;
  }
  return activeWinFn();
}

async function pollActivity() {
  if (!tracking) return;
  let windowInfo = null;
  try {
    windowInfo = await getActiveWindow();
  } catch (err) {
    console.warn('Activity poll error', err.message);
  }

  const idle = powerMonitor.getSystemIdleTime() >= IDLE_THRESHOLD_SECONDS;
  const appName = windowInfo?.owner?.name || 'Unknown';
  const windowTitle = windowInfo?.title || '';
  const url = isBrowser(appName) ? getLatestUrl() : null;
  const now = new Date();

  if (!pollActivity.current) {
    pollActivity.current = { appName, windowTitle, url, idle, startedAt: now };
    return;
  }

  const current = pollActivity.current;
  const changed =
    current.appName !== appName ||
    current.windowTitle !== windowTitle ||
    current.url !== url ||
    current.idle !== idle;

  const segmentTooLong = now.getTime() - current.startedAt.getTime() >= MAX_ACTIVITY_SEGMENT_MS;

  if (changed || segmentTooLong) {
    const event = {
      startedAt: current.startedAt.toISOString(),
      endedAt: now.toISOString(),
      appName: current.appName,
      windowTitle: current.windowTitle,
      url: current.url,
      idle: current.idle,
      deviceId: loadConfig().deviceId,
    };
    enqueueActivity(event);
    pollActivity.current = { appName, windowTitle, url, idle, startedAt: now };
  }
}

function finalizeCurrentActivity() {
  if (!pollActivity.current) return;
  const current = pollActivity.current;
  const now = new Date();
  enqueueActivity({
    startedAt: current.startedAt.toISOString(),
    endedAt: now.toISOString(),
    appName: current.appName,
    windowTitle: current.windowTitle,
    url: current.url,
    idle: current.idle,
    deviceId: loadConfig().deviceId,
  });
  pollActivity.current = null;
}

async function flushQueue() {
  if (!tracking) return;
  const events = dequeueActivities(300);
  if (!events.length) return;
  try {
    await apiFetch('/activity/batch', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
    deleteActivities(events.map((e) => e.id));
  } catch (err) {
    console.warn('Failed to flush activity', err.message);
  }
}

async function captureScreenshot() {
  if (!tracking) return;
  const config = loadConfig();
  if (!config.deviceId) return;

  ensureDir(screenshotsDir());
  const takenAt = new Date().toISOString();
  const filePath = path.join(screenshotsDir(), `${Date.now()}.jpg`);

  try {
    const image = await screenshot({ format: 'jpg' });
    fs.writeFileSync(filePath, image);

    const presign = await apiFetch('/screenshots/presign', {
      method: 'POST',
      body: JSON.stringify({ deviceId: config.deviceId, takenAt }),
    });

    const uploadRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: fs.readFileSync(filePath),
    });

    if (!uploadRes.ok) {
      throw new Error('Upload failed');
    }

    await apiFetch(`/screenshots/complete/${presign.screenshotId}`, {
      method: 'POST',
      body: JSON.stringify({ sizeBytes: image.length }),
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Screenshot failed', err.message);
    enqueueScreen(filePath, takenAt, config.deviceId);
  }
}

async function flushScreenshots() {
  if (!tracking) return;
  const pending = getPendingScreens(10);
  if (!pending.length) return;

  for (const shot of pending) {
    try {
      const presign = await apiFetch('/screenshots/presign', {
        method: 'POST',
        body: JSON.stringify({ deviceId: shot.device_id, takenAt: shot.taken_at }),
      });

      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: fs.readFileSync(shot.file_path),
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      await apiFetch(`/screenshots/complete/${presign.screenshotId}`, {
        method: 'POST',
        body: JSON.stringify({ sizeBytes: fs.statSync(shot.file_path).size }),
      });

      fs.unlinkSync(shot.file_path);
      deleteScreens([shot.id]);
    } catch (err) {
      console.warn('Retry screenshot failed', err.message);
      incrementScreenAttempt(shot.id);
    }
  }
}

async function startScreenshotTimer() {
  const config = loadConfig();
  let intervalSeconds = 600;
  try {
    const policy = await apiFetch(`/policies/capture/${config.userId}`);
    if (policy?.intervalSeconds) intervalSeconds = policy.intervalSeconds;
  } catch {
    // keep default
  }
  if (screenshotTimer) clearInterval(screenshotTimer);
  screenshotTimer = setInterval(captureScreenshot, intervalSeconds * 1000);
}

function startTracking() {
  tracking = true;
  pollActivity.current = null;
  if (activityTimer) clearInterval(activityTimer);
  activityTimer = setInterval(pollActivity, ACTIVITY_POLL_MS);
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(flushQueue, FLUSH_INTERVAL_MS);
  if (screenFlushTimer) clearInterval(screenFlushTimer);
  screenFlushTimer = setInterval(flushScreenshots, SCREEN_FLUSH_INTERVAL_MS);
  startScreenshotTimer();
}

function stopTracking() {
  finalizeCurrentActivity();
  tracking = false;
  if (activityTimer) clearInterval(activityTimer);
  if (flushTimer) clearInterval(flushTimer);
  if (screenshotTimer) clearInterval(screenshotTimer);
  if (screenFlushTimer) clearInterval(screenFlushTimer);
}

function getIconPath() {
  return path.join(__dirname, 'assets', 'icon.png');
}

function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(getIconPath());
  tray = new Tray(icon);
  tray.setToolTip('JobTracker Agent');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer.html'));

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function startLocalServer() {
  const http = require('http');
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/active') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          latestBrowserInfo = {
            url: payload.url,
            title: payload.title,
            timestamp: Date.now(),
          };
          res.writeHead(200);
          res.end('ok');
        } catch {
          res.writeHead(400);
          res.end('bad');
        }
      });
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });

  server.listen(17330, '127.0.0.1');
}

function configureAutoUpdater() {
  if (!app.isPackaged) {
    return;
  }
  const { autoUpdater: updater } = require('electron-updater');
  autoUpdater = updater;
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdateStatus('Buscando actualizaciones...'));
  autoUpdater.on('update-available', () => sendUpdateStatus('ActualizaciÃ³n disponible.'));
  autoUpdater.on('update-not-available', () => sendUpdateStatus('Sin actualizaciones.'));
  autoUpdater.on('error', (err) => sendUpdateStatus(`Error actualizaciÃ³n: ${err.message}`));
  autoUpdater.on('download-progress', (p) =>
    sendUpdateStatus(`Descargando ${Math.round(p.percent)}%`)
  );
  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus('ActualizaciÃ³n descargada. Reinicia para instalar.');
  });
}

function sendUpdateStatus(message) {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', message);
  }
}

ipcMain.handle('get-status', () => {
  const config = loadConfig();
  return { tracking, ...config };
});

ipcMain.handle('set-api-url', (_event, apiUrl) => {
  const config = loadConfig();
  saveConfig({ ...config, apiUrl });
  return { ok: true };
});

ipcMain.handle('set-auto-start', (_event, value) => {
  const config = loadConfig();
  app.setLoginItemSettings({ openAtLogin: !!value });
  saveConfig({ ...config, autoStart: !!value });
  return { ok: true };
});

ipcMain.handle('check-updates', () => {
  if (!app.isPackaged) {
    sendUpdateStatus('Las actualizaciones solo funcionan en builds empaquetados.');
    return { ok: false };
  }
  if (!autoUpdater) {
    configureAutoUpdater();
  }
  autoUpdater.checkForUpdates();
  return { ok: true };
});

ipcMain.handle('login', async (_event, payload) => {
  const { email, password, tenantId } = payload;
  const config = loadConfig();
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, tenantId }),
  });
  saveConfig({
    ...config,
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    tenantId: res.tenantId,
    userId: res.user.id,
  });
  await registerDevice();
  return res;
});

ipcMain.handle('logout', () => {
  const config = loadConfig();
  saveConfig({ ...config, accessToken: null, refreshToken: null, tenantId: null, userId: null, deviceId: null });
  stopTracking();
  return { ok: true };
});

ipcMain.handle('start-tracking', async () => {
  const config = loadConfig();
  if (!config.accessToken) throw new Error('Not logged in');
  await apiFetch('/time/start', {
    method: 'POST',
    body: JSON.stringify({ deviceId: config.deviceId }),
  });
  startTracking();
  return { ok: true };
});

ipcMain.handle('stop-tracking', async () => {
  await apiFetch('/time/stop', { method: 'POST', body: JSON.stringify({}) });
  stopTracking();
  return { ok: true };
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  ensureDir(app.getPath('userData'));
  initDb();
  createWindow();
  createTray();
  startLocalServer();
  configureAutoUpdater();
  if (app.isPackaged && autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
