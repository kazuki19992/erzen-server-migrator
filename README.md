# Modpack Migrator

Minecraftのmodpack移行補助ツールです。旧modpackの `options.txt` と `journeymap/` フォルダーを新しいmodpackへコピーします。

## 使い方

```bash
npm install
npm start
```

初回は移行元・移行先の両方を入力してください。2回目以降は前回の移行先が自動で移行元にセットされます。

### 開発（UIのみ）

```bash
npm run dev:renderer
```

### 開発（Electronでホットリロード）

```bash
npm run dev:renderer
npm run dev:electron
```

上記を別ターミナルで実行してください。
