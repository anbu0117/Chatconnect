import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In dev we point at the Vite dev server; in a packaged build we load the
// static frontend/dist build that was produced by `npm run build:frontend`.
const isDev = !app.isPackaged;
const DEV_URL = process.env.CHATCONNECT_DEV_URL || "http://localhost:5173";

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: "#fafafa",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../frontend/dist/index.html"));
  }

  // Open links clicked inside the app (e.g. shared image URLs) in the
  // user's default browser instead of a second Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
