# 技術仕様・設計方針 v1.0

> 01_GAME_DESIGN.md とセットで読むこと。ここに書いていない実装詳細は POC の結果を踏まえて Claude Code が提案し、オーナーの承認を得てから確定する。

---

## 1. 技術スタック（確定）

| 項目 | 選定 | 理由 |
|---|---|---|
| 3D ライブラリ | **Three.js（最新安定版）** | 情報量・サンプル・AI支援との相性が最良。ゲームエンジン機能は本作の規模では自前で十分 |
| 言語 | TypeScript（strict） | 既存プロジェクトと統一 |
| ビルド | Vite | 既存プロジェクトと統一 |
| 物理エンジン | **使わない**（初期） | 掘削・パズル・ウォークはすべて自前ロジックで足りる。落下演出等は Tween で代替 |
| アニメーション | three 標準 AnimationMixer ＋ 軽量 Tween（自前 or tween.js） | |
| 状態管理 | 自前の GameState クラス＋localStorage | Redux 等は不要 |
| モデル形式 | glTF 2.0（.glb、Draco 圧縮） | |
| デプロイ | GitHub Pages（GitHub Actions で build & deploy） | 既存フローを踏襲 |
| テスト | Vitest（ロジックのみ。描画はPOC・手動確認） | |

- Babylon.js は次点。POC-1 で iPad 性能に致命的問題が出た場合のみ再検討する

## 2. プロジェクト構成（想定）

```
dino-museum/
├── index.html            # SPA 1枚
├── src/
│   ├── main.ts           # エントリ、シーン切替
│   ├── core/             # GameState, SaveManager, AssetLoader, SceneManager
│   ├── scenes/           # Title, DigMap, DigSite, RestoreLab, Museum
│   ├── ui/               # HTML/CSS オーバーレイ UI（図鑑・設定・HUD）
│   ├── data/             # dinosaurs.json, sites.json, strata.json
│   └── utils/
├── public/assets/
│   ├── models/           # .glb（恐竜、骨パーツ、博物館、小物）
│   ├── textures/
│   └── audio/
└── docs/                 # 本ハンドオフ一式を格納
```

- UI は **3D 内に作り込まず、HTML/CSS オーバーレイ**を基本とする（可読性・ルビ・フォント制御・アクセシビリティのため）
- シーンは1つの WebGLRenderer を使い回し、SceneManager で切替（メモリ節約）

## 3. データ駆動設計（重要）

恐竜・発掘サイト・地層は**すべて JSON 定義**とし、コードを触らず追加できること。

```jsonc
// data/dinosaurs.json（例）
{
  "id": "tyrannosaurus",
  "nameJa": "ティラノサウルス",
  "era": "cretaceous",            // strata.json の id と対応
  "diet": "carnivore",
  "lengthM": 12,
  "funFact": "かむちからは どうぶつナンバーワン！",
  "bones": [
    { "id": "skull", "nameJa": "あたまのほね" },
    { "id": "spine", "nameJa": "せぼね" },
    { "id": "tail",  "nameJa": "しっぽのほね" },
    { "id": "legs",  "nameJa": "あしのほね" },
    { "id": "jaw",   "nameJa": "おおきなあご", "isFeature": true }
  ],
  "model": "models/dino/tyrannosaurus.glb",
  "skeletonModel": "models/skeleton/tyrannosaurus_bones.glb"
}
```

- 骨パーツは skeleton の .glb 内で **1パーツ＝1named mesh** とし、id で対応付ける
- 出現テーブルは sites.json 側（サイト×層ごとに dinosaur id と出現率）

## 4. 発掘（コアメカニクス）の実装方針

- 区画＝**小さなボクセル風グリッド**（例：横8×奥8×深さ6 のセル）。地形変形メッシュは使わない（実装コスト・性能・「削れた感」のわかりやすさで有利）
- セルは InstancedMesh で描画し、削ったら該当インスタンスを非表示＋破片パーティクル＋SE
- 化石はグリッド内に埋め込まれた骨メッシュ。**隣接セルをピッケルで削ると damage カウント増**、ブラシは damage なし
- damage 0＝★3、1〜2＝★2、3以上＝★1。骨の見た目（ヒビのデカール or 頂点カラー）に反映
- 「化石が近い」ヒント：近接セルを削ると音と微振動（視覚エフェクト）で知らせる → 子どもが自然にブラシへ持ち替える導線

## 5. パフォーマンス方針（iPad Safari 最優先）

- 目標：iPad（第9世代相当）で 60fps、最低ライン 30fps
- ポリゴン予算：シーン全体で 15万トライアングル以下、恐竜1体 1〜2万
- ライト：AmbientLight＋DirectionalLight 各1。動的シャドウは発掘シーンのみ最小マップサイズで
- テクスチャ：1024px 上限、可能なら KTX2/basis
- アセットは**シーン単位で遅延ロード**＋ロード画面（骨がくるくる回る等）
- devicePixelRatio は上限 2 でクランプ
- postprocessing は使わない（復元演出は emissive とパーティクルで表現）

## 6. アセット計画

| 種別 | 調達方針 |
|---|---|
| 恐竜（生体） | Quaternius「Ultimate Animated Animals/Dinosaurs」等の CC0 ローポリ、または Kenney。**ライセンスは CC0 か CC-BY のみ許可**、出典は docs/CREDITS.md に記録 |
| 骨格・骨パーツ | 既製素材が乏しい可能性が高い。POC-3 で確認し、無ければ「生体モデルの簡略シルエット＋記号的な骨メッシュ（自作 or プリミティブ合成）」で代替 |
| 博物館・小物 | Kenney（家具・建物系 CC0） |
| SE/BGM | 効果音ラボ、魔王魂等の無料素材（規約確認の上 CREDITS.md に記録） |
| フォント | M PLUS Rounded 1c 等の丸ゴシック系 Web フォント（サブセット化） |

- **注意**：実在ゲーム・映画（ジュラシック・パーク等）の名称・デザインを想起させる表現は使わない

## 7. セーブスキーマ（v1）

```jsonc
{
  "version": 1,
  "discoveredBones": { "tyrannosaurus": ["skull", "spine"] },
  "restored": { "tyrannosaurus": { "stars": 3, "restoredAt": "..." } },
  "unlocked": { "strata": ["cretaceous", "jurassic"], "sites": ["site1"] },
  "settings": { "bgm": true, "se": true, "restoreGuide": true }
}
```

- SaveManager が version を見てマイグレーション。書込みは操作イベント時のみ（毎フレーム書かない）

## 8. コーディング規約（抜粋）

- TypeScript strict、ESLint＋Prettier
- 日本語文字列は **data/*.json と ui 層に集約**し、ロジック内にハードコードしない
- マジックナンバー禁止（config.ts か JSON へ）
- コミットは Conventional Commits、機能単位で小さく

## 9. 開発マイルストーン（POC 後）

| M | 内容 | 完了条件 |
|---|---|---|
| M1 | 骨組み：シーン遷移＋セーブ＋データロード | タイトル→マップ→空の発掘→空の博物館が繋がる |
| M2 | 発掘シーン完成 | 掘る→化石発見→★判定→インベントリ格納 |
| M3 | 復元ラボ完成 | ガイド付きパズル→復元演出→図鑑解放 |
| M4 | 博物館・図鑑完成 | 展示反映・ウォーク・NPC・コンプ演出 |
| M5 | 12種データ投入・チューニング | 成功基準（GAME_DESIGN §11）を満たす |
| M6 | 磨き：音・ロード画面・エラー処理 | 家族テストで致命的問題なし |

- **各マイルストーン完了時にオーナーへ動作確認を依頼し、承認を得てから次へ進むこと**
