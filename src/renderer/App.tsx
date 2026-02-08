import React, { useEffect, useState } from "react";

type StatusKind = "info" | "success" | "error";

type StatusState = {
  message: string;
  kind: StatusKind;
};

type SavedPaths = {
  lastTargetDir: string;
};

export default function App(): JSX.Element {
  const [sourcePath, setSourcePath] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [status, setStatus] = useState<StatusState>({
    message: "準備完了。",
    kind: "info"
  });
  const [isMigrating, setIsMigrating] = useState(false);
  const [disableTutorial, setDisableTutorial] = useState(true);

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved: SavedPaths = await window.modpackMigrator.getSavedPaths();
        if (saved.lastTargetDir) {
          setSourcePath(saved.lastTargetDir);
          setTargetPath("");
          setStatus({ message: "前回の移行先を移行元にセットしました。", kind: "info" });
        }
      } catch {
        setStatus({ message: "保存済みパスの読み込みに失敗しました。", kind: "error" });
      }
    };

    loadSaved();
  }, []);

  const handleBrowse = async (setter: (value: string) => void) => {
    const selected = await window.modpackMigrator.selectDirectory();
    if (selected) setter(selected);
  };

  const runMigration = async () => {
    setStatus({ message: "移行中...", kind: "info" });
    setIsMigrating(true);

    try {
      const result = await window.modpackMigrator.migrate({
        sourceDir: sourcePath.trim(),
        targetDir: targetPath.trim(),
        disableTutorial
      });

      if (result.ok) {
        setStatus({ message: result.message, kind: "success" });
      } else {
        setStatus({ message: result.message, kind: "error" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ message: `予期しないエラー: ${message}`, kind: "error" });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-dirt-900 text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="minecraft-panel w-full rounded-2xl p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="minecraft-chip inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-dirt-100">
                Modpack Migration
              </p>
              <h1 className="mt-3 text-3xl font-bold text-grass-100 md:text-4xl">Modpack Migrator</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-200">
                旧modpackの <span className="font-semibold text-dirt-100">options.txt</span> と
                <span className="font-semibold text-dirt-100"> journeymap/</span> を新しいmodpackへコピーします。
              </p>
            </div>
            <div className="rounded-2xl border border-stone-700/60 bg-stone-900/60 px-5 py-4 text-xs text-stone-300">
              <p>1回目: 移行元 + 移行先</p>
              <p>2回目以降: 移行先のみ</p>
            </div>
          </div>

          <div className="mt-10 grid gap-6">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-stone-100" htmlFor="sourcePath">
                移行元 modpack フォルダー
              </label>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  id="sourcePath"
                  className="minecraft-input w-full rounded-xl px-4 py-3 text-sm text-stone-100"
                  placeholder="/path/to/old/modpack"
                  value={sourcePath}
                  onChange={(event) => setSourcePath(event.target.value)}
                />
                <button
                  type="button"
                  className="minecraft-button rounded-xl px-4 py-3 text-sm font-semibold text-white"
                  onClick={() => handleBrowse(setSourcePath)}
                  disabled={isMigrating}
                >
                  参照
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-stone-100" htmlFor="targetPath">
                移行先 modpack フォルダー
              </label>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  id="targetPath"
                  className="minecraft-input w-full rounded-xl px-4 py-3 text-sm text-stone-100"
                  placeholder="/path/to/new/modpack"
                  value={targetPath}
                  onChange={(event) => setTargetPath(event.target.value)}
                />
                <button
                  type="button"
                  className="minecraft-button rounded-xl px-4 py-3 text-sm font-semibold text-white"
                  onClick={() => handleBrowse(setTargetPath)}
                  disabled={isMigrating}
                >
                  参照
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-3 text-sm text-stone-200">
              <input
                type="checkbox"
                checked={disableTutorial}
                onChange={(event) => setDisableTutorial(event.target.checked)}
                className="h-4 w-4 accent-grass-400"
              />
              チュートリアルを無効化する（tutorialStep=none）
            </label>
            <button
              type="button"
              className="minecraft-button w-full rounded-xl px-5 py-3 text-base font-semibold text-white md:w-auto"
              onClick={runMigration}
              disabled={isMigrating}
            >
              {isMigrating ? "移行中..." : "移行を実行"}
            </button>

            <div
              className={`w-full rounded-xl border px-4 py-3 text-sm md:w-auto md:min-w-[320px] ${
                status.kind === "success"
                  ? "border-grass-500/50 bg-grass-900/40 text-grass-100"
                  : status.kind === "error"
                  ? "border-red-500/40 bg-red-900/30 text-red-100"
                  : "border-stone-700/70 bg-stone-900/50 text-stone-200"
              }`}
            >
              {status.message}
            </div>
          </div>

          <div className="mt-10 grid gap-3 text-xs text-stone-400">
            <p>ヒント: フォルダーはMinecraftの `config/` が入っている階層を選ぶと便利です。</p>
            <p>上書きコピーのため、移行先の既存設定は置き換わります。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
