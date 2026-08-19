# ニコニコ動画アップロード手順

agent-browser を使ってニコニコ動画への投稿準備を自動化する。

## ブラウザー設定

- 開始URL: `https://garage.nicovideo.jp/niconico-garage/video/videos/upload`
- ブラウザーセッション: `niconico-publish`
- 既存のヘッド付きChromeに接続する。新しいChromeは起動しない。新しい窓も開かない。
- `--session` と `--cdp` は実行時の接頭辞に含まれている。コマンドへ重複して追加しない。
- `--browser-args`、`--args`、`--executable-path`、`--allowed-domains`、`--session-name` はコマンドへ追加しない。
- `--cdp http://...` のようなURL形式は使わない。
- ヘッド付きChromeを使う。
- ブラウザーを閉じない。`agent-browser close` は実行しない。
- リポジトリ内のファイルを編集しない。
- この作業に必要な agent-browser コマンド以外は実行しない。
- `agent-browser --help`、`agent-browser skills`、`agent-browser doctor`、バージョン確認、インストール確認は実行しない。必要なコマンド形式はこの指示書に記載してある。
- シェルコマンドを `&&`、`;`、`sleep` で連結しない。複数のブラウザー操作をまとめる場合は `agent-browser batch --bail` を使う。
- 一時ファイル、heredoc、リダイレクト、パイプ、コマンド置換、シェル変数を使わない。
- すべてのコマンドは、実行時に指定されたagent-browserコマンドの接頭辞から始める。

コマンド形式:

```bash
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" --cdp 9222 snapshot -i --compact --depth 5
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" --cdp 9222 open "https://garage.nicovideo.jp/niconico-garage/video/videos/upload"
```

## 投稿準備の流れ

1. まず `snapshot -i --compact --depth 5` を実行する。
2. ページタイトルが `動画投稿 - ニコニコガレージ` なら `open` しない。
3. そうでなければ開始URLを `open` する。`open` は1回だけ。
4. `account.nicovideo.jp/login` にリダイレクトされた場合は停止し、手動ログインが必要だと報告する。
5. アップロード画面で `ファイル選択` ボタンまたはinputを見つけ、対象のmp4をアップロードする。
   - 確認済みのref例: `@e25`
   - コマンド例: `agent-browser ... upload @e25 /absolute/path/to/video.mp4`
6. ファイル選択後、初回投稿時の規約ダイアログが表示される場合がある。
   - ダイアログ見出し: `ニコニコ動画 投稿規約`
   - ボタン: `投稿規約に同意して投稿する`
   - 確認済みのref例: `@e3`
   - 表示された場合は同意ボタンをクリックする。
7. `動画情報を編集` 画面が表示されるまで待つ。
8. 編集画面で `snapshot -i --compact --depth 5` を実行し、現在のrefを取得する。
9. 動画情報を入力する前に `投稿した動画から選択` をクリックし、直近に投稿した動画の情報を引き継ぐ。
   - タグやシリーズなど、再利用できる情報を前回の投稿から引き継ぐ。
   - 引き継いだあとも、現在の動画用にタイトル、説明文、サムネイルを更新する。
   - 選択ダイアログや一覧が開いた場合は、直近に投稿した動画を選び、適用または確定する。
   - 引き継ぎ後は画面が再描画される場合があるため、`snapshot -i --compact --depth 5` でrefを取り直す。
10. 説明文エディターを HTML モードへ切り替える。
    - ツールバーの `button.ql-html`（snapshot名 `html`）をクリックする。
    - 切替後、placeholder が `HTMLで動画説明文を入力...` の `.ql-editor` が見えること。
    - すでにその欄が見えている場合は切替をクリックしない。
    - textarea は存在しない。ビジュアル用 `.ql-editor`（placeholder `動画説明文を入力...`）へは入れない。
11. タイトルと説明文を下記の検証済み単一 `agent-browser eval` で同時に設定する。
    - タイトル欄にはアップロードしたファイル名や日付が入っていることが多いため、完全に消去してから指定タイトルを入れる。
    - 説明文は実行時に渡された HTML（許可タグは `br` のみ）を、HTMLモードの `.ql-editor` へ **テキストとして** 入れる。`<br>` がタグとしてパースされないこと。
    - `innerHTML` 代入はしない。`<br>` が改行ノードになり、空行が倍増する。
    - 戻り値の `hasLiteralBr` が true で、説明文が指定HTMLと一致していれば成功。
    - 検証済みevalが失敗した場合だけ、最新snapshotのrefを使ったキーボード入力へ切り替える。同じevalを条件だけ変えて繰り返さない。
12. `button.ql-html` をもう一度クリックし、ビジュアルモードへ戻して HTML を反映する。
13. タイトル欄の値が指定されたタイトルと完全に一致することを確認する。
    - `fill` によって初期ファイル名や日付の末尾へ追記された場合は、続行する前にタイトル欄を消去して設定し直す。
    - 指定タイトルに含まれていない限り、元のファイル名や日付をタイトルに残さない。
    - 消去と入力を何度も繰り返さない。通常の `fill` が1回失敗したら `eval` に切り替える。
14. 親作品が指定されている場合は、`投稿内容を確認` を押す前に登録する。
    - 親作品登録時は動画ID（smxxxxxx / ssxxxxxx）を空白で区切ってまとめて入力する。
    - 指定されたニコニコ動画の視聴URLから動画IDだけを取り出し、1回の操作ですべて入力する。
    - 指定されたURL以外の動画は親作品として登録しない。
    - 続行する前に、指定された親作品がすべて現在の下書きへ追加されたことを確認する。
    - 登録後の確認は、下記の単一evalで実際の `sm` ID集合を取得し、期待するID集合と比較する。探索用snapshotや個別要素の反復調査はしない。
    - いずれかの親作品を登録できなかった場合は `投稿内容を確認` を押さずに停止し、理由を報告する。

## 編集画面の目印

確認済みのラベルとref例:

- `投稿内容を確認`: `@e4`
- `下書き保存`: `@e3`
- `サムネイルを変更`: `@e5`
- `投稿した動画から選択`: 投稿済み動画から情報を引き継ぐ
- タイトル欄 `動画タイトル（必須）`: `@e52`
- 説明文 HTML 切替 `button.ql-html`（`html`）
- 説明文 HTML ソース欄 placeholder `HTMLで動画説明文を入力...`
- ジャンルコンボボックス `ジャンルを選択...`: `@e35`
- `タグを編集`: `@e26`
- シリーズコンボボックス `シリーズを選択...`: `@e36`
- 公開範囲コンボボックス `公開`: `@e62`
- 公開日時ラジオボタン `すぐに公開`: `@e72`

refは変化する。操作前に必ず最新のsnapshotを使う。

## 動画情報をすばやく入力する方法

キーボード入力を試す前に、次の方法を1回使う。`<title-base64>`と`<description-base64>`には実行時に渡されたBase64 UTF-8値をそのまま入れる。説明文のBase64はすでに `<br>` 付き HTML である。Base64値なら長い説明文でも一時ファイルやコマンド置換は不要。

```bash
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" --cdp 9222 eval "(() => {
  const decodeBase64 = (value) => new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)));
  const title = decodeBase64('<title-base64>');
  const description = decodeBase64('<description-base64>');
  const titleInput = document.querySelector('input[name=\"title\"]');
  if (!titleInput) throw new Error('タイトル入力欄が見つからない');
  const titleSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  titleSetter.call(titleInput, '');
  titleInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  titleSetter.call(titleInput, title);
  titleInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: title }));
  titleInput.dispatchEvent(new Event('change', { bubbles: true }));

  const htmlEditor = Array.from(document.querySelectorAll('.ql-editor')).find((element) => {
    const placeholder = element.getAttribute('data-placeholder') || '';
    return placeholder.includes('HTML') && element.getClientRects().length > 0;
  });
  if (!htmlEditor) throw new Error('説明文HTML入力欄が見つからない');
  htmlEditor.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(htmlEditor);
  selection.removeAllRanges();
  selection.addRange(range);
  if (!document.execCommand('insertText', false, description)) throw new Error('説明文のinsertTextに失敗');
  return { title: titleInput.value, description: htmlEditor.innerText, hasLiteralBr: htmlEditor.innerText.includes('<br>') };
})()"
```

evalの戻り値でタイトルが指定値と一致し、`hasLiteralBr` が true で、説明文に指定HTMLの `<br>` が含まれていれば次へ進む。その後 `button.ql-html` をクリックしてビジュアルへ戻す。

## 親作品をすばやく確認する方法

空白区切りで入力して `追加` を1回クリックしたあと、次のevalを1回だけ実行する。`<expected-id-list>`には実行時に渡された「親作品確認eval用の配列要素」をそのまま入れる。

```bash
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" --cdp 9222 eval "(() => {
  const expected = [<expected-id-list>];
  const actual = Array.from(document.querySelectorAll('body *'))
    .map((element) => (element.textContent || '').trim())
    .filter((text) => /^(?:sm|ss)\d+$/.test(text));
  const uniqueActual = Array.from(new Set(actual)).sort();
  const uniqueExpected = Array.from(new Set(expected)).sort();
  const matches = JSON.stringify(uniqueActual) === JSON.stringify(uniqueExpected);
  return { matches, expected: uniqueExpected, actual: uniqueActual };
})()"
```

`matches`が`true`なら直ちに次へ進む。`false`なら `投稿内容を確認` を押さず、期待値と実値を報告して停止する。

## サムネイル時刻の設定

`サムネイルを変更` で確認済みの流れ:

1. `サムネイルを変更` をクリックする。
2. `サムネイルの選択、または、画像をアップロードしてください` という見出しのダイアログが開いた場合は、`シーンの時間を指定する` を有効にする。
3. ダイアログには候補行ごとに `分`、`秒`、`ミリ秒` の入力欄と `このシーンを表示` がある。
4. `MM:SS.mmm` を分、秒、ミリ秒の整数へ変換する。たとえば `00:00.000` は `0`、`0`、`0`。
5. snapshotで最初の候補行の分、秒、ミリ秒と `このシーンを表示` のrefを取得する。
6. 3入力と `このシーンを表示` のクリックを、次のような1回のbatchにまとめる。

```bash
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" --cdp 9222 batch --bail "fill <minute-ref> <minute>" "fill <second-ref> <second>" "fill <millisecond-ref> <millisecond>" "click <show-scene-ref>"
```

7. 必要なら、対応するサムネイル画像またはボタンを選択する。
8. `選択完了` をクリックする。

指定時刻を適用できなかった場合は `投稿内容を確認` を押さず、理由を報告する。

## 確認画面

`投稿内容を確認` をクリックし、`投稿の確認` という見出しと `編集に戻る`、`投稿する` などのボタンがあるダイアログまたは画面へ到達すれば成功。

そこで停止する。`投稿する` は絶対にクリックしない。

## 成功条件

投稿準備の成功条件:

- ログイン済みの状態でアップロード画面を開いた。
- 対象のmp4を選択した。
- 初回投稿時の規約ダイアログが表示された場合は処理した。
- `動画情報を編集` 画面へ到達した。
- `投稿した動画から選択` を使って、直近の動画から再利用できる情報を引き継いだ。
- 説明文エディターを HTML モードへ切り替えた。
- 指定されたタイトルと説明文HTMLを HTML ソースとして入力し、ビジュアルへ反映した。
- `サムネイルを変更` を使って指定時刻を設定した。
- 指定された親作品がある場合は、動画IDを空白区切りでまとめて登録した。
- `投稿内容を確認` をクリックした。
- 最終応答に現在のURL、ページタイトル、確認画面へ到達したかどうかを簡潔にまとめた。

最後の投稿確定ボタンはクリックしない。
