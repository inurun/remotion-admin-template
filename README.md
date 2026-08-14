# remotion-admin-template

管理画面で `page + TTS` を編集し、Remotion で動画にするテンプレート。映像側は intro / main / outro の TTS テキスト表示だけの stub。見た目の実装は各 private プロジェクト側に置く。

GitHub の "Use this template" は使わない。履歴が切れると、あとから `template/main` を merge できない。

## 新しいプロジェクトを作る

```bash
git clone git@github.com:inurun/remotion-admin-template.git my-project
cd my-project

git remote rename origin template
git remote add origin git@github.com:<you>/my-project.git
git push -u origin main
```

- `origin` → private プロジェクト
- `template` → この公開テンプレート

GitHub Fork は public になるので、独立した private リポジトリを作る。

## テンプレート更新を取り込む

```bash
git fetch template
git merge template/main
```

## Scripts

```bash
pnpm install
pnpm dev
pnpm studio
```
