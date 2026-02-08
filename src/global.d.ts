export {};

declare global {
  interface Window {
    modpackMigrator: {
      selectDirectory: () => Promise<string | null>;
      migrate: (payload: { sourceDir?: string; targetDir?: string }) => Promise<{ ok: boolean; message: string }>;
      getSavedPaths: () => Promise<{ lastTargetDir: string }>;
    };
  }
}
