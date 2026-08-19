// POC-4 縦切りスライスの固定配置データ。
// 柱2「化石はうそをつかない」: 配置はすべて固定・手作り。ランダム要素なし。

export interface BonePlacement {
  boneId: string;
  nameJa: string;
  layer: number;
  axis: 'x' | 'z';
  cells: [number, number][]; // [gx, gz] を3セル、axis 方向に連続
}

export interface SiteDef {
  id: string;
  speciesId: string;
  pos: [number, number]; // フィールドの x, z
  clue: 'bone' | 'crack' | 'rubble';
  discoverText: string;
  bones: BonePlacement[];
}

export interface SpeciesDef {
  id: string;
  nameJa: string;
  bones: { id: string; nameJa: string }[];
}

export const SPECIES: SpeciesDef[] = [
  {
    id: 'spinosaurus',
    nameJa: 'スピノサウルス',
    bones: [
      { id: 'skull', nameJa: 'あたまのほね' },
      { id: 'spine', nameJa: 'せぼね' },
      { id: 'sail', nameJa: 'せなかのほ' },
      { id: 'tail', nameJa: 'しっぽのほね' },
    ],
  },
  {
    id: 'triceratops',
    nameJa: 'トリケラトプス',
    bones: [
      { id: 'skull', nameJa: 'あたまのほね' },
      { id: 'frill', nameJa: 'フリル' },
      { id: 'spine', nameJa: 'せぼね' },
      { id: 'legs', nameJa: 'あしのほね' },
    ],
  },
];

export const SITES: SiteDef[] = [
  {
    id: 'beach',
    speciesId: 'spinosaurus',
    pos: [6, 15],
    clue: 'bone',
    discoverText: 'すなはまに ホネが つきでてる! ここに なにか ねむってる!',
    bones: [
      {
        boneId: 'spine',
        nameJa: 'せぼね',
        layer: 2,
        axis: 'x',
        cells: [
          [2, 2],
          [3, 2],
          [4, 2],
        ],
      },
      {
        boneId: 'tail',
        nameJa: 'しっぽのほね',
        layer: 3,
        axis: 'z',
        cells: [
          [5, 3],
          [5, 4],
          [5, 5],
        ],
      },
    ],
  },
  {
    id: 'crack',
    speciesId: 'spinosaurus',
    pos: [-13, -2],
    clue: 'crack',
    discoverText: 'じめんに おおきな ひび! この したに なにか ねむってる!',
    bones: [
      {
        boneId: 'skull',
        nameJa: 'あたまのほね',
        layer: 3,
        axis: 'x',
        cells: [
          [1, 4],
          [2, 4],
          [3, 4],
        ],
      },
      {
        boneId: 'sail',
        nameJa: 'せなかのほ',
        layer: 2,
        axis: 'z',
        cells: [
          [5, 1],
          [5, 2],
          [5, 3],
        ],
      },
    ],
  },
  {
    id: 'rubble',
    speciesId: 'triceratops',
    pos: [13, -11],
    clue: 'rubble',
    discoverText: 'がけから くずれた いわの なかに ホネの かけら! ここに なにか ねむってる!',
    bones: [
      {
        boneId: 'skull',
        nameJa: 'あたまのほね',
        layer: 3,
        axis: 'x',
        cells: [
          [2, 5],
          [3, 5],
          [4, 5],
        ],
      },
      {
        boneId: 'frill',
        nameJa: 'フリル',
        layer: 4,
        axis: 'z',
        cells: [
          [4, 1],
          [4, 2],
          [4, 3],
        ],
      },
    ],
  },
];

export const HAKASE_LINES = [
  'がけや かわぎしみたいに ちそうが むきだしの ばしょを さがすんじゃ',
  'ホネの ちかくで ピッケルは きんもつ! ✨がでたら ブラシじゃぞ',
  '1かしょには おなじ きょうりゅうの ホネが まとまって ねむっておる',
  'げんきが なくなったら わしのテントで やすむとよい',
];
