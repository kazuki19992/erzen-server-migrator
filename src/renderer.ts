const sourceInput = document.getElementById("sourcePath") as HTMLInputElement;
const targetInput = document.getElementById("targetPath") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const migrateBtn = document.getElementById("migrateBtn") as HTMLButtonElement;
const sourceBrowse = document.getElementById("sourceBrowse") as HTMLButtonElement;
const targetBrowse = document.getElementById("targetBrowse") as HTMLButtonElement;

function setStatus(message: string, kind: "info" | "success" | "error" = "info"): void {
  statusEl.textContent = message;
  statusEl.dataset.kind = kind;
}

async function loadSavedPaths(): Promise<void> {
  try {
    const saved = await window.modpackMigrator.getSavedPaths();
    if (saved.lastTargetDir) {
      sourceInput.value = saved.lastTargetDir;
      targetInput.value = "";
      setStatus("前回の移行先を移行元にセットしました。", "info");
    }
  } catch {
    setStatus("保存済みパスの読み込みに失敗しました。", "error");
  }
}

async function handleBrowse(targetInputEl: HTMLInputElement): Promise<void> {
  const selected = await window.modpackMigrator.selectDirectory();
  if (selected) targetInputEl.value = selected;
}

sourceBrowse.addEventListener("click", () => handleBrowse(sourceInput));
targetBrowse.addEventListener("click", () => handleBrowse(targetInput));

migrateBtn.addEventListener("click", async () => {
  setStatus("移行中...", "info");
  migrateBtn.disabled = true;

  try {
    const result = await window.modpackMigrator.migrate({
      sourceDir: sourceInput.value.trim(),
      targetDir: targetInput.value.trim()
    });

    if (result.ok) {
      setStatus(result.message, "success");
    } else {
      setStatus(result.message, "error");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`予期しないエラー: ${message}`, "error");
  } finally {
    migrateBtn.disabled = false;
  }
});

loadSavedPaths();
