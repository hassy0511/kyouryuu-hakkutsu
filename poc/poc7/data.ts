// POC-7 の固定レイアウト(柱2: すべて手作り配置)。
// げんば2の あたまのほね は「がんばん」の下 → がんじょうピッケルを作るまで掘れない
// = 1回では クリアできない現場(オーナー設計: やりこみ要素)。

export interface FossilDef {
  id: string;
  nameJa: string;
  kind: 'long' | 'blob' | 'ammonite';
  layer: number;
  cells: [number, number][];
}

export interface PitDef {
  id: string;
  nameJa: string;
  fossils: FossilDef[];
  rocks: [number, number, number][];
  crystals: [number, number, number][];
  branches: [number, number, number][]; // 掘ると 🪵き が出るマス(表土)
  bedrock: [number, number, number][]; // がんばん: がんじょうピッケル(Lv2)が必要
}

export const PITS: PitDef[] = [
  {
    id: 'pit1',
    nameJa: 'げんば1',
    fossils: [
      {
        id: 'spine',
        nameJa: 'せぼね',
        kind: 'long',
        layer: 3,
        cells: [
          [2, 3],
          [3, 3],
          [4, 3],
          [5, 3],
        ],
      },
      {
        id: 'ammonite',
        nameJa: 'アンモナイト',
        kind: 'ammonite',
        layer: 2,
        cells: [
          [5, 5],
          [6, 5],
          [5, 6],
          [6, 6],
        ],
      },
    ],
    rocks: [
      [3, 3, 2],
      [1, 5, 1],
    ],
    crystals: [[1, 1, 3]],
    branches: [
      [6, 1, 0],
      [2, 6, 0],
      [4, 0, 1],
    ],
    bedrock: [],
  },
  {
    id: 'pit2',
    nameJa: 'げんば2',
    fossils: [
      {
        id: 'leg',
        nameJa: 'あしのほね',
        kind: 'long',
        layer: 2,
        cells: [
          [1, 2],
          [1, 3],
          [1, 4],
        ],
      },
      {
        id: 'skull',
        nameJa: 'あたまのほね',
        kind: 'blob',
        layer: 4,
        cells: [
          [4, 3],
          [5, 3],
          [4, 4],
          [5, 4],
        ],
      },
    ],
    rocks: [
      [6, 6, 1],
      [2, 5, 2],
      [6, 1, 2],
    ],
    crystals: [[0, 7, 2]],
    branches: [
      [3, 0, 0],
      [7, 4, 0],
    ],
    // あたまのほね の真上をがんばんが完全に覆う
    bedrock: [
      [4, 3, 3],
      [5, 3, 3],
      [4, 4, 3],
      [5, 4, 3],
    ],
  },
  {
    id: 'pit3',
    nameJa: 'げんば3',
    fossils: [
      {
        id: 'rib',
        nameJa: 'ろっこつ',
        kind: 'long',
        layer: 3,
        cells: [
          [6, 2],
          [6, 3],
          [6, 4],
        ],
      },
      {
        id: 'tail',
        nameJa: 'しっぽのほね',
        kind: 'long',
        layer: 5,
        cells: [
          [2, 2],
          [3, 2],
          [4, 2],
        ],
      },
    ],
    rocks: [
      [2, 3, 1],
      [5, 6, 3],
    ],
    crystals: [
      [7, 7, 1],
      [0, 0, 4],
    ],
    branches: [
      [1, 6, 0],
      [5, 1, 0],
    ],
    // しっぽの上に部分的ながんばん(すきまから回り込める設計)
    bedrock: [
      [2, 2, 4],
      [3, 2, 4],
    ],
  },
];

export const TOTAL_BONES = 5; // せぼね・あし・あたま・ろっこつ・しっぽ
