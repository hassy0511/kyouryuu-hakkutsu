# POC-9: スピノサウルス 3Dミュージアム

`docs/06_CODEX_3D_ORDER.md` に基づくパイロット実装。外部3Dモデル・画像・通信を使わず、
Three.jsのプリミティブをTypeScriptで組み立てている。

## 採用状態

2026-08-25のオーナーレビューにより、`src/art/dino3d/spinosaurus.ts` の **MODEL I** を
POC-9の確定版として採用した。追加造形試作は不採用・削除済みであり、通常URLにモデル切り替え用の
クエリパラメータはない。今後は造形を作り直さず、ゲーム本体への組み込みと表示・操作の調整へ進む。

## 動かし方

```bash
npm ci
npm run dev
```

Viteが表示するURLの `/kyouryuu-hakkutsu/poc/poc9/` を開く。
`index.html` をダブルクリックした `file:///...` のURLでは、ブラウザの制限により動作しない。

## 調整ポイント

- 配色: `src/art/dino3d/spinosaurus.ts` の `SPINOSAURUS_COLORS`
- 体型: `buildLiving()` 冒頭の胴体・首・頭・尾の `loftGeometry()` 断面列
- ポーズ: 同ファイルの `HIND_LIMBS` / `ARMS`（骨格と生体が共有する）
- 帆: `SAIL_HEIGHTS`（骨格の棘）と `sailPanel`（生体の面）
- 尾の太さ: 胴体と一体化した最初の `loftGeometry()` の `radiusY` / `radiusZ`
- 自動回転: 停止済み。利用者のドラッグ操作だけで回転する
- 切り替え時間: `poc/poc9/main.ts` の `transitionDuration`

形状はマテリアル単位で結合している。プリミティブを追加するときは、既存の
`GeometryBatch` に追加すればdraw callを増やさずに済む。

## 実装上の判断

- 正規化座標では尾端約-5.8〜口先約+4.4、顔は+X、足裏はy=0付近。
- オーナーレビュー後の左案に合わせ、後肢で立つ獣脚類の姿勢・地面につかない把持用の腕・
  泳ぎに適した縦長の尾を強調した。木製玩具風の質感は撤回し、筋肉が連続する有機的な立体と
  滑らかな皮膚の陰影を優先する。
- クロスフェード中も2モデルの位置とカメラを変えず、「骨に肉がつく」対応を優先した。
- `prefers-reduced-motion` が有効な環境ではクロスフェードと自動回転を止める。
- 画面右上の `△ / draw` は、表示中モデル単体の三角形数とdraw call数。

## 質問リスト

現時点で実装を止める仕様の穴はなし。iPad Safari実機の60fpsと、造形の好み（帆の高さ・
顔の丸み・色）は発注側レビューで確認する。
