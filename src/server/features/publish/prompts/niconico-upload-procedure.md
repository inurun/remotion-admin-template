# ニコニコ動画アップロード手順

agent-browser を使ってニコニコ動画への投稿準備を自動化する。

## ブラウザー設定

- 開始URL: `https://garage.nicovideo.jp/niconico-garage/video/videos/upload`
- ブラウザーセッション: `niconico-publish`
- 暗号化認証状態のセッション名: `niconico-auth`
- 永続Chromeプロファイル: `.agent-browser/niconico-profile`
- ブラウザー実行ファイル、起動引数、プロファイルなどは環境変数で設定済み。そのまま使う。
- `--browser-args`、`--args`、`--executable-path`、`--allowed-domains` はコマンドへ追加しない。
- ヘッド付きChromeを使う。
- リポジトリ内のファイルを編集しない。
- この作業に必要な agent-browser コマンド以外は実行しない。
- `agent-browser --help`、`agent-browser skills`、`agent-browser doctor`、バージョン確認、インストール確認は実行しない。必要なコマンド形式はこの指示書に記載してある。
- シェルコマンドを `&&`、`;`、`sleep` で連結しない。複数のブラウザー操作をまとめる場合は `agent-browser batch --bail` を使う。
- 一時ファイル、heredoc、リダイレクト、パイプ、コマンド置換、シェル変数を使わない。
- すべてのコマンドは、実行時に指定されたagent-browserコマンドの接頭辞から始める。

コマンド形式:

```bash
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" --session-name "niconico-auth" open "https://garage.nicovideo.jp/niconico-garage/video/videos/upload"
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" --session-name "niconico-auth" snapshot -i --compact --depth 5
```

## 投稿準備の流れ

1. 開始URLを開く。
2. ページタイトルが `動画投稿 - ニコニコガレージ` であることを確認する。
3. `account.nicovideo.jp/login` にリダイレクトされた場合は停止し、手動ログインが必要だと報告する。
4. アップロード画面で `ファイル選択` ボタンまたはinputを見つけ、対象のmp4をアップロードする。
   - 確認済みのref例: `@e25`
   - コマンド例: `agent-browser ... upload @e25 /absolute/path/to/video.mp4`
5. ファイル選択後、初回投稿時の規約ダイアログが表示される場合がある。
   - ダイアログ見出し: `ニコニコ動画 投稿規約`
   - ボタン: `投稿規約に同意して投稿する`
   - 確認済みのref例: `@e3`
   - 表示された場合は同意ボタンをクリックする。
6. `動画情報を編集` 画面が表示されるまで待つ。
7. 編集画面で `snapshot -i --compact --depth 5` を実行し、現在のrefを取得する。
8. 動画情報を入力する前に `投稿した動画から選択` をクリックし、直近に投稿した動画の情報を引き継ぐ。
   - タグやシリーズなど、再利用できる情報を前回の投稿から引き継ぐ。
   - 引き継いだあとも、現在の動画用にタイトル、説明文、サムネイルを更新する。
   - 選択ダイアログや一覧が開いた場合は、直近に投稿した動画を選び、適用または確定する。
   - 引き継ぎ後は画面が再描画される場合があるため、`snapshot -i --compact --depth 5` でrefを取り直す。
9. 動画情報を入力する前に、タイトルと説明文を両方とも完全に消去する。
   - 下記の検証済み単一 `agent-browser eval` コマンドでタイトルと説明文を同時設定する。
   - タイトル欄にはアップロードしたファイル名や日付が入っていることが多いため、完全に消去する。
   - 説明文が空に見えても、完全に消去する。
   - キーボード操作は予備手段としてのみ使う。対象欄にフォーカスし、`Control+a`、`Backspace` の順に押してから指定値を入力する。
10. タイトルと説明文を入力し、タイトル欄の値が指定されたタイトルと完全に一致することを確認する。
    - `fill` によって初期ファイル名や日付の末尾へ追記された場合は、続行する前にタイトル欄を消去して設定し直す。
    - 指定タイトルに含まれていない限り、元のファイル名や日付をタイトルに残さない。
    - 消去と入力を何度も繰り返さない。通常の `fill` が1回失敗したら `eval` に切り替える。
    - 複数行の説明文を `innerText`、`innerHTML`、`execCommand` で設定しない。ニコニコ側の状態へ反映されない場合がある。
    - `window.Quill` は存在しない。下記のReact Fiber経由の方法で現在表示中のQuillインスタンスを取得する。
    - 検証済みevalが失敗した場合だけ、最新snapshotのrefを使ったキーボード入力へ切り替える。同じevalを条件だけ変えて繰り返さない。
11. 親作品が指定されている場合は、`投稿内容を確認` を押す前に登録する。
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
- 説明文エディター `動画説明文（必須）`: contenteditable `@e31`
- ジャンルコンボボックス `ジャンルを選択...`: `@e35`
- `タグを編集`: `@e26`
- シリーズコンボボックス `シリーズを選択...`: `@e36`
- 公開範囲コンボボックス `公開`: `@e62`
- 公開日時ラジオボタン `すぐに公開`: `@e72`

refは変化する。操作前に必ず最新のsnapshotを使う。

## 動画情報をすばやく入力する方法

キーボード入力を試す前に、次の方法を1回使う。`<title-base64>`と`<description-base64>`には実行時に渡されたBase64 UTF-8値をそのまま入れる。Base64値なら長い説明文でも一時ファイルやコマンド置換は不要。

```bash
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" eval "(() => {
  const decodeBase64 = (value) => new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)));
  const title = decodeBase64('<title-base64>');
  const description = decodeBase64('<description-base64>');
  const normalizedDescription = description
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  const titleInput = document.querySelector('input[name=\"title\"]');
  if (!titleInput) throw new Error('タイトル入力欄が見つからない');
  const titleSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  titleSetter.call(titleInput, '');
  titleInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  titleSetter.call(titleInput, title);
  titleInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: title }));
  titleInput.dispatchEvent(new Event('change', { bubbles: true }));

  const editors = Array.from(document.querySelectorAll('.ql-editor'));
  const editor = editors.find((element) => element.getClientRects().length > 0) || editors[0];
  if (!editor) throw new Error('説明文エディターが見つからない');
  const container = editor.closest('.ql-container');
  if (!container) throw new Error('Quillコンテナが見つからない');
  let quill = null;
  for (const key of Object.keys(container)) {
    if (!key.startsWith('__reactFiber') && !key.startsWith('__reactInternalInstance')) continue;
    let fiber = container[key];
    for (let depth = 0; depth < 20 && fiber && !quill; depth += 1, fiber = fiber.return) {
      const candidates = [fiber.memoizedProps, fiber.pendingProps, fiber.stateNode];
      for (const candidate of candidates) {
        if (candidate?.quill?.setText) quill = candidate.quill;
      }
      let hook = fiber.memoizedState;
      for (let index = 0; index < 20 && hook && !quill; index += 1, hook = hook.next) {
        if (hook.memoizedState?.quill?.setText) quill = hook.memoizedState.quill;
      }
    }
  }
  if (!quill?.setText) throw new Error('Quillインスタンスが見つからない');
  quill.setText(normalizedDescription);
  quill.setSelection(quill.getLength(), 0);
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: normalizedDescription }));
  editor.dispatchEvent(new Event('change', { bubbles: true }));

  return { title: titleInput.value, description: quill.getText().replace(/\n$/, '') };
})()"
```

evalの戻り値に含まれるタイトルと説明文をその場で確認する。両方が指定値と一致していれば、追加のsnapshotや再入力はしない。

## 親作品をすばやく確認する方法

空白区切りで入力して `追加` を1回クリックしたあと、次のevalを1回だけ実行する。`<expected-id-list>`には実行時に渡された「親作品確認eval用の配列要素」をそのまま入れる。

```bash
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" eval "(() => {
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
pnpm --dir <repo-root> exec agent-browser --session "niconico-publish" batch --bail "fill <minute-ref> <minute>" "fill <second-ref> <second>" "fill <millisecond-ref> <millisecond>" "click <show-scene-ref>"
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
- 指定されたタイトルと説明文を入力した。
- `サムネイルを変更` を使って指定時刻を設定した。
- 指定された親作品がある場合は、動画IDを空白区切りでまとめて登録した。
- `投稿内容を確認` をクリックした。
- 最終応答に現在のURL、ページタイトル、確認画面へ到達したかどうかを簡潔にまとめた。

最後の投稿確定ボタンはクリックしない。
