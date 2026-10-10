# Video Admin Template

- 管理サイトを用いた動画データの作成と、動画データからHyperFramesを利用した動画を作成するテンプレ用PJ
- このプロジェクトはまだ始まったばかり、既存データ形式などの考慮は一切不要
- 個人が利用する想定、不特定多数の利用はない

## Development Guide

スローガン: **データ構造でシステムは表現しろ、ロジックに頼るな**

- 実装前に周辺実装を確認すること
- 実装後、lint, format, tscを実行

### データ配置

- 尺は `{stem}.timeline.json`。計算は server の `toTimeline` のみ（BGM のループ再生区間も含む）
- `project.json` は編集する事実だけ持つ。`page.durationSec` / sequence start は持たない
- `_schemas` は永続化契約（Zod・infer 型・定数データ）だけ。ヘルパー・DTO・parse 時 transform は置かない
- `_schemas/catalog` だけ例外: この動画プロダクトのインスタンス定数（アバター・天気地点・voice presets）と自明な lookup。parse transform / DTO は置かない
- `_shared` は app / server / video の2層以上が使う、ドメイン知識のないユーティリティだけ

### src/app

- 管理サイトフロントエンド
- テストを書く
- components以下はコンポーネント階層でネストする
  - app-editor内に定義があるコンポーネントは、app-editor内にディレクトリを切る
  - 各コンポーネントはディレクトリを切り、`*.tsx` と `use-*.ts` を対にする
  - 子コンポーネントは親ディレクトリ内にネストする
  - ロジックは hooks、コンポーネントは表示とイベント配線のみ（数行の純レイアウト補助は同ファイル可）
  - ホットキーが必要なときだけ `*.hotkeys.ts` を同ディレクトリに置く
- コアな機能はfeaturesに記載する
- featuresに書くまでもない雑多なロジックはコンポーネント側のhooksに逃がし、コンポーネントにロジックを書かない
- アクセシビリティの考慮不要
- 無駄なdescription不要、無駄なタイトルも不要
  - ボタンならアイコン+動作があればいい
  - UIは簡潔な英語でいい

### src/server

- 管理サイトバックエンド
- 必ず周辺実装を確認する

### @inurun/vite-plugin-hyperframes-jsx

- HyperFrames 上の JSX ランタイムと Vite プラグイン。別リポジトリ（`inurun/vite-plugin-hyperframes-jsx`）の外部パッケージ `@inurun/vite-plugin-hyperframes-jsx`（GitHub Packages、現状 private）で、このリポジトリには置かない
- API は `@inurun/vite-plugin-hyperframes-jsx/runtime`、プラグインは `vite.hf.config.ts` の `hyperframesJsx()`
- 時間は秒。`<Clip start duration>` が HyperFrames の clip（`data-start` / `data-duration`）になり、表示・非表示は HyperFrames が持つ。親 Clip からの相対秒で入れ子にできる
- コンポーネントは一度だけ実行される。React の hooks・再レンダは無い
- アニメーションは GSAP。`src/video/lib/timeline.tsx` の `<Timeline animate={(tl, q) => …}>`（`tl` の 0 秒 = 囲む Clip の開始）と、シーン間の `src/video/lib/transition.ts` の `<Transition>` を使う。タイムラインは `CompositionTimeline` が 1 本にまとめて HyperFrames に登録する
- HyperFrames は隠れた clip を `visibility: hidden` にする（レイアウト上の場所は残る）。Clip は absolute に重ねて使い、flex などの流れの中に置かない
- 音声は静的マニフェストで出す。実行時に `<audio>` を作らない
- 日付に `Date` サブクラス（`TZDate` 等）を使わない。HF render の Date shim で壊れる

### src/video-host

- preview / render 共通の汎用ホスト（entry、preview contract・定数、静的音声マニフェスト、ダッキング計算）
- `src/video` から import するのは `index.ts` の定義と、server 用の `config.ts`（データのみ）だけ
- server が import するモジュールに DOM / GSAP を持ち込まない

### src/video

- 動画 composition（テンプレではサンプル、派生では本番）
- `index.ts` が定義（`Composition`・TTS を鳴らすページ種別・BGM fade/duck・任意の `onMode`）を export する
- `.tsx` は先頭に `/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */`。React ではない
- 基本的に触らない

### テスト方針

- 明示的に指示がない場合はブラウザ確認はするな
  - agent-browserなど
