import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("modpackMigrator", {
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke("select-directory"),
  migrate: (payload: {
    sourceDir?: string;
    targetDir?: string;
    disableTutorial?: boolean;
  }): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke("migrate", payload),
  getSavedPaths: (): Promise<{ lastTargetDir: string }> => ipcRenderer.invoke("get-saved-paths"),
  openDirectory: (path: string): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke("open-directory", { path })
});
