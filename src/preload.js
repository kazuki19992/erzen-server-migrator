const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("modpackMigrator", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  migrate: (payload) => ipcRenderer.invoke("migrate", payload),
  getSavedPaths: () => ipcRenderer.invoke("get-saved-paths")
});
