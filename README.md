# きょうりゅう はっくつ博物館（仮）

子ども向け（6〜10歳）ブラウザ 3D ゲーム。地層を掘って化石を集め、恐竜を復元し、自分の博物館を作る。

- 仕様・進行ルール: [CLAUDE.md](./CLAUDE.md) と [docs/](./docs/) を参照
- プレビュー（GitHub Pages）: https://hassy0511.github.io/kyouryuu-hakkutsu/
- 現在の進行状況: **POC-1（iPad Safari 描画性能）実施中**

## 開発

```bash
npm install
npm run dev       # 開発サーバー
npm run build     # 型チェック + ビルド
npm run preview   # ビルド結果の確認
npm run lint      # ESLint
npm run format    # Prettier
```

`claude/**` ブランチまたは `main` に push すると GitHub Actions が GitHub Pages へデプロイする。
