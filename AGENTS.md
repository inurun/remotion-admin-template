# Remotion Admin Template

- 管理サイトを用いた動画データの作成と、動画データからRemotionを利用した動画を作成するテンプレ用PJ
- このプロジェクトはまだ始まったばかり、既存データ形式などの考慮は一切不要
- 個人が利用する想定、不特定多数の利用はない

## Development Guide

スローガン: **データ構造でシステムは表現しろ、ロジックに頼るな**

- 実装前に周辺実装を確認すること
- 実装後、lint, format, tscを実行

### データ配置

- 尺は `{stem}.timeline.json`。計算は server の `toTimeline` のみ
- `project.json` は編集する事実だけ持つ。`page.durationSec` / sequence start は持たない
- `_schemas` は永続化契約（Zod・infer 型・定数データ）だけ。ヘルパー・DTO・parse 時 transform は置かない
- `_shared` は app / server / remotion の2層以上が使う、ドメイン知識のないユーティリティだけ

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

### src/remotion

- Remotion本体
- 基本的に触らない
