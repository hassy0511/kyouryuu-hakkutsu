# ほねほり調査隊（旧: きょうりゅう はっくつ博物館）

子ども向け（6〜10歳）ブラウザ 3D ゲーム。地層を掘って化石を集め、恐竜を復元し、自分の博物館を作る。

- 仕様・進行ルール: [CLAUDE.md](./CLAUDE.md) と [docs/](./docs/) を参照
- プレビュー（GitHub Pages）: https://hassy0511.github.io/kyouryuu-hakkutsu/
- 現在の進行状況: **ミニマム版 実装中（タイトル〜開館式まで通しプレイ可能）**
- ゲーム本体: https://hassy0511.github.io/kyouryuu-hakkutsu/ ／ 開発用POC一覧: 同URL + `poc/`

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
