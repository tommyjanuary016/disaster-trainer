# バージョン管理ルール

コードの変更や機能の追加・修正を行うたびに、以下の手順を必ず実行してください：

1. `src/version.ts` 内の `APP_VERSION` と `APP_LAST_UPDATED` を更新する。
2. `package.json` 内の `"version"` を同じバージョン番号に更新する。
3. アプリのトップ画面（`LauncherPage.tsx`）およびヘッダー（`App.tsx`）でバージョン情報が表示され続けることを確認する。
