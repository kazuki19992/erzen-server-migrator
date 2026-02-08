import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { autoUpdater } from "electron-updater";
import path from "path";
import fs from "fs";
import os from "os";

const APP_TITLE = "Erzen Server Migrator";
const SETTINGS_FILE = "settings.json";

function createWindow(): void {
  const windowIcon = path.join(__dirname, "..", "assets", "icon.png");
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: APP_TITLE,
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "renderer", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  autoUpdater.logger = null;
  autoUpdater.autoDownload = true;
  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    // Non-fatal
  });

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

ipcMain.handle("open-directory", async (_event, payload: { path?: string }) => {
  const targetPath = path.resolve(expandPath(payload?.path || ""));
  if (!targetPath) {
    return { ok: false, message: "フォルダーのパスが空です。" };
  }

  try {
    const stat = await fs.promises.stat(targetPath);
    if (!stat.isDirectory()) {
      return { ok: false, message: "指定されたパスはフォルダーではありません。" };
    }
  } catch (error) {
    return { ok: false, message: `フォルダーを確認できません: ${String((error as NodeJS.ErrnoException).code || error)}` };
  }

  const result = await shell.openPath(targetPath);
  if (result) {
    return { ok: false, message: `フォルダーを開けませんでした: ${result}` };
  }

  return { ok: true, message: "フォルダーを開きました。" };
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

ipcMain.handle(
  "migrate",
  async (_event, payload: { sourceDir?: string; targetDir?: string; disableTutorial?: boolean }) => {
    const sourceDir = path.resolve(expandPath(payload?.sourceDir || ""));
    const targetDir = path.resolve(expandPath(payload?.targetDir || ""));
    const disableTutorial = payload?.disableTutorial ?? false;

    if (!sourceDir || !targetDir) {
      return { ok: false, message: "移行元と移行先の両方を入力してください。" };
    }

    const srcOptions = path.join(sourceDir, "options.txt");
    const srcJourney = path.join(sourceDir, "journeymap");
    const srcServers = path.join(sourceDir, "servers.dat");
    const dstOptions = path.join(targetDir, "options.txt");
    const dstJourney = path.join(targetDir, "journeymap");
    const dstServers = path.join(targetDir, "servers.dat");

    try {
      await fs.promises.access(sourceDir, fs.constants.R_OK);
    } catch (error) {
      return {
        ok: false,
        message: `移行元フォルダーにアクセスできません: ${String((error as NodeJS.ErrnoException).code || error)}`
      };
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
            message: `移行先フォルダーの作成に失敗しました: ${String(
              (mkdirError as NodeJS.ErrnoException).code || mkdirError
            )}`
          };
        }
      } else {
        return {
          ok: false,
          message: `移行先フォルダーにアクセスできません: ${String((error as NodeJS.ErrnoException).code || error)}`
        };
      }
    }

    const missing: string[] = [];
    const warnings: string[] = [];
    const filesToCopy: Array<() => Promise<void>> = [];

    try {
      await fs.promises.access(srcOptions, fs.constants.R_OK);
      filesToCopy.push(() => fs.promises.copyFile(srcOptions, dstOptions));
    } catch {
      missing.push("options.txt");
    }

    try {
      const stat = await fs.promises.stat(srcJourney);
      if (!stat.isDirectory()) throw new Error("not a directory");
      filesToCopy.push(() => fs.promises.cp(srcJourney, dstJourney, { recursive: true, force: true }));
    } catch {
      missing.push("journeymap/");
    }

    try {
      await fs.promises.access(srcServers, fs.constants.R_OK);
      filesToCopy.push(() => fs.promises.copyFile(srcServers, dstServers));
    } catch {
      missing.push("servers.dat");
    }

    try {
      for (const copy of filesToCopy) {
        await copy();
      }
    } catch (error) {
      return { ok: false, message: `コピーに失敗しました: ${(error as Error).message}` };
    }

    if (disableTutorial && !missing.includes("options.txt")) {
      try {
        const content = await fs.promises.readFile(dstOptions, "utf8");
        const lines = content.split(/\r?\n/);
        let replaced = false;
        const nextLines = lines.map((line) => {
          if (line.startsWith("tutorialStep:")) {
            replaced = true;
            return "tutorialStep:none";
          }
          return line;
        });
        if (!replaced) {
          nextLines.push("tutorialStep:none");
        }
        await fs.promises.writeFile(dstOptions, nextLines.join("\n"), "utf8");
      } catch (error) {
        return { ok: false, message: `tutorialStepの更新に失敗しました: ${(error as Error).message}` };
      }
    }

    try {
      const settings = await loadSettings();
      settings.lastTargetDir = targetDir;
      await saveSettings(settings);
    } catch {
      // Non-fatal: migration succeeded
    }

    if (missing.length > 0) {
      warnings.push(`存在しないためスキップ: ${missing.join(", ")}`);
    }

    const message = warnings.length > 0 ? `移行が完了しました。${warnings.join(" / ")}` : "移行が完了しました。";
    return { ok: true, message };
  }
);
