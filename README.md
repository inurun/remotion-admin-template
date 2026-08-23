# remotion-admin-template

管理画面で `page + TTS` を編集し、Remotion で動画にするテンプレート。映像側は intro / main / outro の TTS テキスト表示だけの stub。

派生プロジェクトではこのリポジトリを `template` remote として残し、映像・実データ・案件マスタは別リポジトリ（private 推奨）で育てる。同期は **template → 派生のみ**。

## Scripts

```bash
pnpm install
pnpm dev
pnpm studio
```

## 派生プロジェクトの作り方

管理画面と TTS / 保存 / preview / render はテンプレ側で進化させる。映像パターン（`src/remotion`）と案件固有アセットは派生側の責務。

既存例: private の diary リポジトリ。`origin` が diary、`template` がこのリポジトリ。

### やってはいけないこと

- 派生リポジトリからこの public テンプレへ merge / push する
- 本番の `src/remotion`、アバター画像、実データ、`.env` をテンプレに戻す

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
src/remotion/** merge=ours
data/project.json merge=ours
AGENTS.md merge=ours
```

案件でカタログを上書きするなら足す。diary では次も指定している。

```gitattributes
public/avatars/** merge=ours
src/_shared/lib/avatar/** merge=ours
src/features/weather/weather-locations.ts merge=ours
```

`merge=ours` は Git の組み込みドライバ名だけで動かない。**派生リポジトリの各 clone で** 次を一度実行する。

```bash
git config merge.ours.driver true
```

`--global` は不要。この設定を忘れると `.gitattributes` を書いてもコンフリクトかテンプレ側で上書きされる。

注意:

- 対象は「両方に存在するファイル」の中身。テンプレが `src/remotion` に**新規ファイル**を足した場合は派生側に入ってくる。不要なら消す
- テンプレ側の remotion stub 更新は自動では入らない。composition の props や page type の契約が変わったら派生側で追従する
- `.gitattributes` 自体は派生専用なので、テンプレへ戻さない

### 3. 派生側で置き換える場所

| 場所                                        | 役割                                                                |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `src/remotion/**`                           | 映像の本体。stub の intro / main / outro を案件パターンに差し替える |
| `data/project.json`                         | 初期データ。実プロジェクトデータは派生の private に置く             |
| `src/app/core/layout.tsx`                   | タイトルなどのブランディング                                        |
| `public/avatars/**`                         | アバター画像（使う場合）                                            |
| `src/_shared/lib/avatar/**`                 | アバターカタログ                                                    |
| `src/features/weather/weather-locations.ts` | 天気ロケーション                                                    |
| `AGENTS.md`                                 | 派生の運用メモ                                                      |

管理画面（`src/app`、`src/server`、汎用の `src/_shared`）はテンプレ更新を受け取る前提で触る。派生だけで足した配線（preview への追加 props など）は取り込み時に残す。

ページ種別を派生だけで増やす場合、スキーマは `src/_schemas` にある。ここは `merge=ours` にしていないので、取り込み時はテンプレの type と派生の type を両方残す。

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
