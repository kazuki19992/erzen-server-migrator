import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import os from "os";

const APP_TITLE = "Modpack Migrator";
const SETTINGS_FILE = "settings.json";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 720,
    height: 520,
    title: APP_TITLE,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

async function loadSettings(): Promise<{ lastTargetDir?: string }> {
  try {
    const raw = await fs.promises.readFile(getSettingsPath(), "utf8");
    return JSON.parse(raw) as { lastTargetDir?: string };
  } catch {
    return {};
  }
}

async function saveSettings(nextSettings: { lastTargetDir?: string }): Promise<void> {
  const settingsPath = getSettingsPath();
  const payload = JSON.stringify(nextSettings, null, 2);
  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, payload, "utf8");
}

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog({
    title: "modpackフォルダーを選択",
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

function expandPath(inputPath: string): string {
  if (!inputPath) return inputPath;
  if (inputPath.startsWith("~")) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  return inputPath;
}

ipcMain.handle("get-saved-paths", async () => {
  const settings = await loadSettings();
  return {
    lastTargetDir: settings.lastTargetDir || ""
  };
});

ipcMain.handle("migrate", async (_event, payload: { sourceDir?: string; targetDir?: string }) => {
  const sourceDir = path.resolve(expandPath(payload?.sourceDir || ""));
  const targetDir = path.resolve(expandPath(payload?.targetDir || ""));

  if (!sourceDir || !targetDir) {
    return { ok: false, message: "移行元と移行先の両方を入力してください。" };
  }

  const srcOptions = path.join(sourceDir, "options.txt");
  const srcJourney = path.join(sourceDir, "journeymap");
  const dstOptions = path.join(targetDir, "options.txt");
  const dstJourney = path.join(targetDir, "journeymap");

  try {
    await fs.promises.access(sourceDir, fs.constants.R_OK);
  } catch (error) {
    return { ok: false, message: `移行元フォルダーにアクセスできません: ${String((error as NodeJS.ErrnoException).code || error)}` };
  }

  try {
    const stat = await fs.promises.stat(targetDir);
    if (!stat.isDirectory()) {
      return { ok: false, message: "移行先のパスがフォルダーではありません。" };
    }
    await fs.promises.access(targetDir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        await fs.promises.mkdir(targetDir, { recursive: true });
      } catch (mkdirError) {
        return {
          ok: false,
          message: `移行先フォルダーの作成に失敗しました: ${String((mkdirError as NodeJS.ErrnoException).code || mkdirError)}`
        };
      }
    } else {
      return { ok: false, message: `移行先フォルダーにアクセスできません: ${String((error as NodeJS.ErrnoException).code || error)}` };
    }
  }

  const missing: string[] = [];
  try {
    await fs.promises.access(srcOptions, fs.constants.R_OK);
  } catch {
    missing.push("options.txt");
  }

  try {
    const stat = await fs.promises.stat(srcJourney);
    if (!stat.isDirectory()) missing.push("journeymap/");
  } catch {
    missing.push("journeymap/");
  }

  if (missing.length > 0) {
    return { ok: false, message: `移行元に存在しません: ${missing.join(", ")}` };
  }

  try {
    await fs.promises.copyFile(srcOptions, dstOptions);
    await fs.promises.cp(srcJourney, dstJourney, { recursive: true, force: true });
  } catch (error) {
    return { ok: false, message: `コピーに失敗しました: ${(error as Error).message}` };
  }

  try {
    const settings = await loadSettings();
    settings.lastTargetDir = targetDir;
    await saveSettings(settings);
  } catch {
    // Non-fatal: migration succeeded
  }

  return { ok: true, message: "移行が完了しました。" };
});
