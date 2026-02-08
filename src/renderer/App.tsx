import React, { useEffect, useRef, useState } from "react";

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
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const targetInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    const input = sourceInputRef.current;
    if (input) {
      input.scrollLeft = input.scrollWidth;
    }
  }, [sourcePath]);

  useEffect(() => {
    const input = targetInputRef.current;
    if (input) {
      input.scrollLeft = input.scrollWidth;
    }
  }, [targetPath]);

  const handleBrowse = async (setter: (value: string) => void) => {
    const selected = await window.modpackMigrator.selectDirectory();
    if (selected) setter(selected);
  };

  const handleOpenDirectory = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatus({ message: "パスが空なので開けません。", kind: "error" });
      return;
    }

    const result = await window.modpackMigrator.openDirectory(trimmed);
    if (!result.ok) {
      setStatus({ message: result.message, kind: "error" });
    }
  };

  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const input = event.target;
    input.scrollLeft = input.scrollWidth;
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
    <div className="h-screen bg-gradient-to-br bg-stone-700 text-stone-100">
      <div className="mx-auto flex h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="minecraft-panel w-full rounded-2xl p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mt-3 text-3xl font-bold text-grass-100 md:text-4xl">
                Erzen Server Migrator
              </h1>
              <p className="mt-3 w-full text-sm leading-relaxed text-stone-200">
                旧modpackの3設定を新しいmodpackへ移行します。
              </p>
              <p className="mt-1 w-full text-sm leading-relaxed font-bold text-dirt-100">
                移行される設定:
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-xs">
                <li className="text-dirt-100">
                  ゲーム設定(
                  <span className="font-mono outline-stone-600 outline rounded mx-1 px-1 py-0.5">
                    options.txt
                  </span>
                  )
                </li>
                <li className="text-dirt-100">
                  マップ設定(
                  <span className="font-mono outline-stone-600 outline rounded mx-1 px-1 py-0.5">
                    journeymap/
                  </span>
                  )
                </li>
                <li className="text-dirt-100">
                  サーバー設定(
                  <span className="font-mono outline-stone-600 outline rounded mx-1 px-1 py-0.5">
                    servers.dat
                  </span>
                  )
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4 w-full items-center mt-10">
            <div className="w-full gap-2 flex flex-col">
              <label
                className="text-sm font-semibold text-stone-100"
                htmlFor="sourcePath"
              >
                移行元minecraftディレクトリ
              </label>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  id="sourcePath"
                  ref={sourceInputRef}
                  className="bg-stone-900 w-9/12 rounded-xl px-4 py-3 text-sm text-stone-100"
                  placeholder="/path/to/old/modpack"
                  value={sourcePath}
                  onChange={(event) => setSourcePath(event.target.value)}
                  onBlur={handleInputBlur}
                />
                <button
                  type="button"
                  className="flex-grow outline-grass-400 outline rounded-xl px-4 py-3 text-sm font-semibold text-grass-400 hover:bg-white/5"
                  onClick={() => handleBrowse(setSourcePath)}
                  disabled={isMigrating}
                >
                  参照
                </button>
              </div>
              <button
                type="button"
                className="flex-grow outline-grass-400 outline rounded-xl px-4 py-3 text-sm font-semibold text-grass-400 mt-5 hover:bg-white/5"
                onClick={() => handleOpenDirectory(sourcePath)}
                disabled={isMigrating}
              >
                ディレクトリを開く
              </button>
            </div>

            <p className="text-3xl">▶</p>

            <div className="w-full gap-2 flex flex-col">
              <label
                className="text-sm font-semibold text-stone-100"
                htmlFor="targetPath"
              >
                移行先minecraftディレクトリ
              </label>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  id="targetPath"
                  ref={targetInputRef}
                  className="bg-stone-900 w-9/12 rounded-xl px-4 py-3 text-sm text-stone-100"
                  placeholder="/path/to/new/modpack"
                  value={targetPath}
                  onChange={(event) => setTargetPath(event.target.value)}
                  onBlur={handleInputBlur}
                />
                <button
                  type="button"
                  className="flex-grow outline-grass-400 outline rounded-xl px-4 py-3 text-sm font-semibold text-grass-400 hover:bg-white/5"
                  onClick={() => handleBrowse(setTargetPath)}
                  disabled={isMigrating}
                >
                  参照
                </button>
              </div>
              <button
                type="button"
                className="flex-grow outline-grass-400 outline rounded-xl px-4 py-3 text-sm font-semibold text-grass-400 mt-5 hover:bg-white/5"
                onClick={() => handleOpenDirectory(targetPath)}
                disabled={isMigrating}
              >
                ディレクトリを開く
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-3 text-sm text-stone-200">
              <input
                type="checkbox"
                checked={disableTutorial}
                onChange={(event) => setDisableTutorial(event.target.checked)}
                className="h-4 w-4 accent-grass-400 hover:bg-white/5"
              />
              チュートリアルを無効化する（tutorialStep=none）
            </label>
            <button
              type="button"
              className="bg-grass-500 w-full rounded-xl px-5 py-3 text-base font-semibold text-white md:w-auto disabled:opacity-50 hover:bg-grass-400"
              onClick={runMigration}
              disabled={isMigrating}
            >
              {isMigrating ? "移行中..." : "移行を実行"}
            </button>
          </div>

          <div
            className={`w-full mt-5 rounded-xl border px-4 py-3 text-sm md:w-auto md:min-w-[320px] ${
              status.kind === "success"
                ? "border-grass-500/50 bg-grass-900/40 text-grass-100"
                : status.kind === "error"
                ? "border-red-500/40 bg-red-900/30 text-red-100"
                : "border-stone-700/70 bg-stone-900/50 text-stone-200"
            }`}
          >
            {status.message}
          </div>

          <div className="mt-10 grid gap-3 text-xs text-stone-400">
            <p>上書きコピーのため、移行先の既存設定は置き換わります。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
