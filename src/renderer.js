const sourceInput = document.getElementById("sourcePath");
const targetInput = document.getElementById("targetPath");
const statusEl = document.getElementById("status");
const migrateBtn = document.getElementById("migrateBtn");
const sourceBrowse = document.getElementById("sourceBrowse");
const targetBrowse = document.getElementById("targetBrowse");

function setStatus(message, kind = "info") {
  statusEl.textContent = message;
  statusEl.dataset.kind = kind;
}

async function loadSavedPaths() {
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

async function handleBrowse(targetInputEl) {
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
    setStatus(`予期しないエラー: ${error.message}`, "error");
  } finally {
    migrateBtn.disabled = false;
  }
});

loadSavedPaths();
