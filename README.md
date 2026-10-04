# remotion-admin-template

管理画面で `page + TTS` を編集し、HyperFrames で動画にするテンプレート。映像側は intro / main / outro の TTS テキスト表示だけの stub。

派生プロジェクトではこのリポジトリを `template` remote として残し、映像・実データ・案件マスタは別リポジトリ（private 推奨）で育てる。同期は **template → 派生のみ**。

## Scripts

```bash
pnpm install
pnpm dev
pnpm migrate:project
```

映像は HyperFrames で描く。JSX ランタイムと Vite プラグインは外部パッケージ [`@inurun/vite-plugin-hyperframes-jsx`](https://github.com/inurun/vite-plugin-hyperframes-jsx)、`src/video-host` は preview / render 共通の entry と静的音声マニフェスト、`src/video` が composition。dev では admin の dev サーバー内の別 Vite インスタンスが `/hf/` で composition を配信し、render は `hyperframes` CLI（本番は `pnpm build` の `dist/hf` を使う）。

## 派生プロジェクトの作り方

管理画面と TTS / 保存 / preview / render はテンプレ側で進化させる。映像パターン（`src/video`）と案件固有アセットは派生側の責務。

既存例: private の diary リポジトリ。`origin` が diary、`template` がこのリポジトリ。

### やってはいけないこと

- 派生リポジトリからこの public テンプレへ merge / push する
- 本番の `src/video`、アバター画像、実データ、`.env` をテンプレに戻す

管理画面の改善をテンプレへ還元するときは、**このリポジトリでブランチを切り**、管理画面だけを移植する。派生の映像・データ・アバターを含めない。

### 1. remote を分ける

```bash
git clone git@github.com:inurun/remotion-admin-template.git my-series
cd my-series
git remote rename origin template
git remote add origin git@github.com:<you>/<my-series>.git
git push -u origin main
```

| remote     | 指す先                         |
| ---------- | ------------------------------ |
| `origin`   | 派生リポジトリ（private 推奨） |
| `template` | このリポジトリ                 |

### 2. 派生側で残すファイルを宣言する

派生リポジトリの `.gitattributes` に `merge=ours` を書く。テンプレ取り込み時、そのパスは派生側の内容を残す。

```gitattributes
src/video/** merge=ours
data/project.json merge=ours
AGENTS.md merge=ours
```

案件でカタログを上書きするなら足す。

```gitattributes
public/avatars/** merge=ours
src/_schemas/catalog/** merge=ours
```

`merge=ours` は Git の組み込みドライバ名だけで動かない。**派生リポジトリの各 clone で** 次を一度実行する。

```bash
git config merge.ours.driver true
```

`--global` は不要。この設定を忘れると `.gitattributes` を書いてもコンフリクトかテンプレ側で上書きされる。

注意:

- 対象は「両方に存在するファイル」の中身。テンプレが `src/video` に**新規ファイル**を足した場合は派生側に入ってくる。不要なら消す
- テンプレ側の映像 stub 更新は自動では入らない。composition の props や page type の契約が変わったら派生側で追従する
- `.gitattributes` 自体は派生専用なので、テンプレへ戻さない

### 3. 派生側で置き換える場所

| 場所                      | 役割                                                                |
| ------------------------- | ------------------------------------------------------------------- |
| `src/video/**`            | 映像の本体。stub の intro / main / outro を案件パターンに差し替える |
| `data/project.json`       | 初期データ。実プロジェクトデータは派生の private に置く             |
| `src/app/core/layout.tsx` | タイトルなどのブランディング                                        |
| `public/avatars/**`       | アバター画像（使う場合）                                            |
| `src/_schemas/catalog/**` | アバター・天気地点・voice presets のインスタンス定数                |
| `AGENTS.md`               | 派生の運用メモ                                                      |

管理画面（`src/app`、`src/server`、汎用の `src/_shared`）と映像の土台（`src/video-host`、依存の `@inurun/vite-plugin-hyperframes-jsx`）はテンプレ更新を受け取る前提で触る。派生だけで足した配線は取り込み時に残す。`src/video-host` が composition から import するのは `src/video/index.ts` の定義（`Composition`、TTS を鳴らすページ種別、BGM の fade / duck 設定、任意の `onMode`）と、server 用にその音声部分だけを持つ `src/video/config.ts` のみ。composition props は `src/video-host/contract.ts` の `HfData`（`{ project, timeline, schedules }`）。

ページ種別を派生だけで増やす場合、スキーマは `src/_schemas` にある。`catalog` 以外は `merge=ours` にしていないので、取り込み時はテンプレの type と派生の type を両方残す。

映像専用ユーティリティ（text wrap、stamp レイアウト、asset path、TTS タイミング計算など）は `src/video` に置く。消えた `_shared` パスはテンプレに戻さない。日付の表示 TZ / 時計は `_shared/lib/date` に残してある。

テンプレ更新で `project.json` の形が変わったら、派生側で:

```bash
pnpm migrate:project
```

`data/` のうち `savedProjectSchema` を満たす json だけを書き換える。`schedules.json` や将来の `render-state.json` は対象外。

### 4. テンプレ更新を取り込む

派生リポジトリで:

```bash
git fetch template
git merge template/main
```

コンフリクトしたら:

- 映像・アバター・実データ・`AGENTS.md` は ours
- 管理画面はテンプレを取りつつ、派生だけの接続は残す

push 先は必ず `origin`。`git push template` はしない。
