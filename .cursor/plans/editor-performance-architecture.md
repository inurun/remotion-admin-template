# 管理サイト パフォーマンス抜本改修計画

状態: 実装担当者向け・着手可能
作成日: 2026-08-17

## 1. ゴール

Project全体を1つのReact Hook Formへ載せた現在の構成を廃止し、変更・購読・検証・保存・Remotion描画の境界をデータ構造で強制する。

次を同時に満たす。

- URL境界、Feature境界、Form境界、Store購読境界を一致させる
- Project全体ではなく、選択中PageだけをRHFの対象にする
- TTS編集は選択中Page内の局所購読に限定する
- 永続化は引き続き1つの`project.json`とする
- 保存時は変更されたProject設定・Page・並び順だけを処理する
- ThumbnailとPreviewは編集中状態を購読せず、最後に保存されたProjectだけを見る
- Page追加やTTS入力で、他Page・Thumbnail・Previewを再レンダーしない
- schemaを永続化、Feature入力、API契約の用途別に分離する
- 既存データ形式との互換・migrationは考慮しない

## 2. 現状の問題

### 2.1 巨大RHF

`FormContextProvider`が`DraftProject`全体を所有し、`pages[].tts[]`、Project meta、BGM、voice presetを1フォームに載せている。

- Page追加・削除・移動がProjectフォーム全体のFieldArrayを更新する
- 保存時に`draftProjectSchema`で全Projectを検証する
- 保存結果で`form.reset`し、全Pageを再構築する
- 複数Featureが同じFormContextへ直接接続され、変更可能範囲が型で制限されない

### 2.2 Providerによる広域通知

ルート直下にProject、Form、Page、Editor、TTS、Publish、Render等のProviderが連なっている。Context valueをmemo化しても、上位の値が変われば広いsubtreeが更新対象になる。

### 2.3 編集モデルと永続化モデルの混同

永続化された完成形、保存入力、UIフォームが`src/_schemas/project.ts`へ集中している。「何が保存可能か」と「各Featureが何を変更できるか」が同じ型で表現されている。

### 2.4 Remotion表示の入力が太い

Page listはPageごとに`@remotion/player`の`Thumbnail`を生成し、全ThumbnailへProject全体を渡している。さらに保存済みProjectへ編集中`meta`を混ぜている。

- 編集操作がRemotion表示へ波及しうる
- Page数に比例して重いRemotion treeが増える
- 各Thumbnailの入力が対象PageではなくProject全体
- 非表示のThumbnailもmountされる

### 2.5 保存処理が全件単位

Clientは毎回`DraftProject`全体を送り、ServerはProject全体を保存use-caseへ渡す。音声cacheが効いても、validation・走査・response・client resetは全件単位になる。

## 3. 設計原則

### 3.1 共通データ構造と変更境界を分ける

Entityの共通schemaは再利用してよい。ただし次は別契約にする。

- 永続化schema: 保存済みProjectの完成条件
- Feature schema: そのFeatureが変更できる項目
- API contract: ClientがServerへ要求できる変更単位
- Remotion input: 描画に必要な保存済みデータだけ

### 3.2 Pageを編集aggregateとする

Page FormがPage本体と配下TTSを所有する。TTSはPage内でID指定のcommandとfield単位購読を使い、配列indexをFeature間のidentityにしない。

### 3.3 保存済み状態と編集中状態を分ける

```text
SavedProjectStore ── Preview / Thumbnail / Render / Publish
        ↑ 保存成功
EditorSessionStore ── Project設定Form / Page Form / Page並び替え
```

編集中状態から保存済み状態への唯一の遷移はSave commandとする。

### 3.4 派生値は依存関係に沿って局所更新する

```text
TTS duration → Page duration → Project duration → Remotion
```

編集中TTSの変更では保存済みdurationを変更しない。Serverで音声生成が完了し、保存済みPageが確定した時点でPage durationを再計算する。Project durationは保存済みPage durationから導出する。

## 4. 目標データ構造

### 4.1 EditorSessionStore

Zustandのvanilla storeをProject editor単位で生成し、React Contextには変化する巨大valueではなくstore instanceだけを置く。Consumerはselectorで購読する。

```ts
type EditorSessionState = {
  project: ProjectSettingsFormValues;
  sequenceOrder: string[];
  itemsById: Record<string, PageFormValues | TransitionFormValues>;
  dirty: {
    project: boolean;
    sequence: boolean;
    itemIds: Record<string, true>;
    removedItemIds: Record<string, true>;
  };
};
```

必須action:

- `updateProjectSettings(input)`
- `upsertPage(pageId, input)`
- `addTts(pageId, input)`
- `updateTts(pageId, ttsId, input)`
- `removeTts(pageId, ttsId)`
- `insertSequenceItem(input, position)`
- `removeSequenceItem(itemId)`
- `reorderSequence(itemIds)`
- `markSaved(savedChangeSet)`

任意pathへ書き込むpublic actionを作らない。

### 4.2 SavedProjectStore

Serverから取得した最後の保存済みProjectを正規化して保持する。EditorSessionStoreとは別instance・別Contextにする。

```ts
type SavedProjectState = {
  project: SavedProjectSettings;
  sequenceOrder: string[];
  itemsById: Record<string, SavedSequenceItem>;
  itemRevision: Record<string, number>;
  renderRevision: number;
};
```

- Page保存成功時は対象`itemRevision`だけ増やす
- width、height等の全描画へ影響する設定変更時だけ`renderRevision`を増やす
- Preview/ThumbnailはこのStoreだけを購読する
- 初回load・外部reloadでは全stateをhydrateしてよい

## 5. URLと画面ライフサイクル

Project pathは`encodeURIComponent`で単一segmentへ符号化し、次をcanonical URLとする。

```text
/projects/:encodedProjectPath
/projects/:encodedProjectPath/pages/:pageId
/projects/:encodedProjectPath/settings
```

- `/projects/:path`は最後に選択したPage、なければ先頭Pageへ遷移する
- Page選択はindexではなく`pageId`をURLへ書く
- Page削除後は隣接Page、PageがなければProject rootへ遷移する
- browser back/forwardを処理する
- Project pathのencode/decodeをround-trip testする
- 既存URL互換は不要

新しいrouter dependencyは必須ではない。既存規模ならHistory API、`popstate`、typed route parserをFeatureとして実装してよい。場当たり的な`window.location.pathname`参照を各所へ増やさない。

## 6. Form境界

### 6.1 Page Form

`/pages/:pageId`のsubtreeだけに`PageFormProvider`をmountする。

- `useForm<PageFormValues>`は対象Pageのみをdefault valueにする
- Page切替時はProviderごとunmountする
- Page Formの変更は対象PageだけEditorSessionStoreへ反映する
- `useFieldArray`は対象PageのTTSだけに使う
- TTS rowは自分の`ttsId`を受け、必要fieldだけを`useController`または`useWatch`する
- Project全体を扱う`FormProvider`、`useFormContext<DraftProject>`、`pages.${index}` pathを削除する

### 6.2 Project設定Form

Project meta、BGM、voice presetを1つにまとめる必要はない。既存dialog単位でFeature schemaとformを持たせ、submit時に`updateProjectSettings`する。

### 6.3 選択状態

- selected PageはURLが正本
- selected TTSはPage subtree内のlocal stateまたはURL不要のUI store
- Page indexは`sequenceOrder`からその場で導出し、永続的identityにしない

## 7. Schema再編

巨大な`src/_schemas/project.ts`を解体する。最終的な配置は責務を満たす限り微調整可だが、次の依存方向を守る。

```text
src/_schemas/project/
  primitives.ts          provider、voice、共通scalar
  tts.ts                 SavedTts等の永続化Entity
  page.ts                SavedPage / SavedTransition
  project.ts             SavedProject完成形
  index.ts

src/app/features/project/model/
  project-settings-form-schema.ts

src/app/features/page/model/
  page-form-schema.ts
  transition-form-schema.ts

src/app/features/tts/model/
  tts-form-schema.ts

src/server/features/project/
  contract.ts            ChangeSet API schema
```

ルール:

- Form schemaで`SavedProjectSchema.partial()`を使わない
- Featureが変更可能なfieldを明示する
- 共通scalar schemaの再利用は許可する
- Form schemaから保存済み生成field（`audio`、`durationSec`）を除外する
- `src/remotion`はSaved schema/typeだけを見る
- `_schemas/index.ts`は公開APIだけをre-exportし、内部schemaを無差別に公開しない

## 8. 差分保存API

永続化ファイルは1 JSONのままとし、ClientからServerへの変更入力だけを分割する。

```ts
type SaveProjectChangesRequest = {
  project?: ProjectSettingsFormValues;
  upsertItems: Array<PageFormValues | TransitionFormValues>;
  removedItemIds: string[];
  sequenceOrder?: string[];
};
```

Server処理:

1. 保存済みProjectをloadする
2. ID mapへ変換する
3. remove、upsert、reorderを適用する
4. upsertされたPageだけ、以前のSavedPageを使って解析・音声cache・合成・duration計算を行う
5. voice preset変更が合成結果へ影響する場合は、依存するPageをServer側で追加対象にする
6. meta/BGMだけの変更ではPage音声処理を行わない
7. 最終SavedProject全体を永続化schemaで検証する
8. 一時ファイルへ書いてrenameし、1 JSONをatomicに置換する
9. SavedProjectと、実際に更新したitem IDを返す

Client処理:

- Save前にdirtyなFeature schemaだけを検証する
- 全Project用RHF validationを行わない
- Save成功後にEditorSession全体をresetしない
- dirty flagだけclearし、Serverで確定した対象PageをSavedProjectStoreへ反映する
- Save失敗時はdirty stateを保持する

## 9. Thumbnail / Preview技術検証

実装の最初に小さなspikeを行い、結果をtestまたは計画書の決定ログへ残す。spikeだけで終了せず、その結果に従って本実装まで行う。

### 9.1 必須境界

- Thumbnail/Preview componentからEditorSessionStore、RHF、Page Formへのimportを禁止する
- inputは保存済みProject側の`projectId/path`、`pageId`、`itemRevision`、`renderRevision`だけを起点にする
- 未保存Pageはplaceholder、更新済みPageは最後の保存済み画像とdirty indicatorを出す
- 保存するまで編集中のmetaやPage内容をRemotionへ渡さない

### 9.2 Thumbnail戦略

優先順に検証する。

1. 保存済みProjectのみを入力にし、`IntersectionObserver`でviewport付近のThumbnailだけmountする
2. 1でPage増加時の負荷分離が不十分なら、対象SavedPageと必要なProject設定だけを受けるThumbnail専用Compositionを作る
3. 専用Compositionでも不十分なら、保存時にstill imageを生成し、`projectPath + pageId + revision`でPNG cacheする

採用条件:

- 非表示ThumbnailのRemotion treeがmountされない
- TTS入力ではmount済みThumbnailのprops/referenceが変わらない
- Page A保存時、Page BのThumbnailを再生成しない。ただし全描画設定変更時は全件更新してよい
- `src/remotion`を変更する場合は既存Compositionの描画ロジックを再利用し、Page表示を複製しない

### 9.3 Preview

- PreviewはSavedProjectStoreだけを見る
- 編集中は最後の保存状態を表示する
- 保存成功時だけ新しいSavedProjectへ切り替える
- Player control stateはPreview subtree内に閉じる

## 10. Component / Feature再配置

`AGENTS.md`に従い、componentは階層に合わせてdirectoryを切り、表示とイベント配線だけにする。

目標Provider構造:

```tsx
<SettingsProvider>
  <SavedProjectStoreProvider>
    <EditorSessionStoreProvider>
      <AppLayout>
        <ProjectRoute />
      </AppLayout>
    </EditorSessionStoreProvider>
  </SavedProjectStoreProvider>
</SettingsProvider>
```

Page routeだけが次を追加する。

```tsx
<PageFormProvider pageId={route.pageId}>
  <PageEditor />
</PageFormProvider>
```

Publish、Render等は独立mutation/query hookへ寄せる。状態を共有する必要がなければProviderにしない。

## 11. 実装フェーズ

### Phase 0: 境界testとThumbnail spike

- 現行挙動を守る最低限のFeature testを追加
- typed URL parserを追加
- Thumbnailを保存済み状態だけに接続できることを検証
- lazy mount、Page専用Composition、PNG cacheのどこまで必要か決定する

### Phase 1: schemaとStore

- schemaを用途別に分割
- EditorSessionStoreとSavedProjectStoreを追加
- 変換関数とselector/action testを追加
- 既存SWR queryをSavedProjectStore hydrateへ接続

### Phase 2: URLとPage Form

- canonical URLへ変更
- Page selectionをURL化
- Project全体FormProviderをPage FormとFeature formsへ分割
- Page/TTS componentsをIDベースへ変更
- 巨大Provider chainを縮小

### Phase 3: 差分保存

- ChangeSet contractとServer apply処理を実装
- 更新Pageだけを音声処理する
- atomic JSON保存を実装
- Save後の全体resetを削除

### Phase 4: Remotion隔離

- Phase 0で採用したThumbnail戦略を完成させる
- Previewを保存済みStore専用にする
- dirty/unsaved表示を追加

### Phase 5: 削除と仕上げ

- 旧FormContext、Page index依存、不要Provider、旧schema exportを削除
- dead codeと重複変換を削除
- test、lint、format、tscを通す

各Phaseは独立commitにしてよい。ただし途中状態を最終成果物にしない。

## 12. Test要件

### Schema / Store

- 永続化schemaと各Feature schemaの責務が分かれている
- Page更新で別Page selectorのsubscriberが通知されない
- TTS更新でProject設定subscriberが通知されない
- dirty change setが追加・更新・削除・並び替えを正しく表現する
- Save成功/失敗時のdirty処理

### URL

- Project pathとPage IDのencode/decode
- root、page、settingsのparse
- Page追加・選択・削除、back/forward
- 不明Page IDのfallback

### Server

- Page Aだけの変更でPage Bのanalyze/synthesis処理を呼ばない
- meta/BGMだけの変更でPage処理を呼ばない
- voice preset変更時に必要Pageだけを再処理する
- remove/reorder/transitionを正しく永続化する
- 失敗時に元JSONを壊さない
- final SavedProject schema validation

### UI

- Page Formは選択中Pageだけをdefault valueにする
- TTS追加・編集・削除が対象Pageだけを更新する
- 未保存PageのThumbnail placeholder
- dirty Pageは最後の保存済みThumbnailを維持する
- Thumbnail/PreviewはRHFなしでrenderできる
- 非表示ThumbnailはRemotion treeをmountしない

## 13. 構造的な完了条件

次を検索・testで確認する。

- `FormProvider<DraftProject>`相当が存在しない
- `useFormContext<DraftProject>`が存在しない
- UI componentが`pages.${pageIndex}`でProject全体Formへアクセスしない
- selected Pageの正本がContext stateではなくURLの`pageId`
- Thumbnail/Previewからeditor form/storeへの依存がない
- Page listが全Page分のRemotion treeを常時mountしない
- Save APIがProject全体のDraftを必須入力にしない
- 保存後にProject全体の`form.reset`を行わない
- 永続化ファイルは1 JSONのまま

## 14. 品質チェック

実装完了時に必ず実行する。

```bash
pnpm test
pnpm lint
pnpm format
pnpm format:check
pnpm tsc
```

formatによる変更後にtest、lint、tscを再確認する。

## 15. Browser動作確認

コードレビュー指摘がすべて解消し、上記コマンドがgreenになった後だけ行う。`agent-browser` skillの指示を読み、`agent-browser`で実ブラウザ確認する。

最低シナリオ:

1. 既存Projectを開く
2. Page URLを直接開く
3. Pageを追加し、URLが新しいPage IDになることを確認
4. 複数Pageを切り替え、入力が混線しないことを確認
5. TTSを追加・編集・削除する
6. 保存前はThumbnail/Previewが最後の保存状態を維持し、dirtyが分かることを確認
7. 保存し、対象PageのThumbnail/Previewだけが更新されることを確認
8. Pageを並び替え・削除し、URL fallbackと保存結果を確認
9. Project設定を変更・保存し、必要なRemotion表示だけが更新されることを確認
10. browser back/forward、reload、直接リンクを確認
11. Page数・TTS数が多いProjectで横スクロールし、非表示Thumbnailが遅延mountされることを確認
12. console error、network error、無限requestがないことを確認

発見した問題は修正し、品質チェックと該当シナリオを再実行する。

## 16. 非目標

- project.jsonをPageごとの複数ファイルへ分割しない
- 既存project JSON migrationを作らない
- アクセシビリティ対応を追加しない
- `src/remotion`の動画表現を変更しない
- 見た目の全面リニューアルをしない
- 性能対策のためにmemoを無差別に追加しない

## 17. 実装中の判断ルール

- 境界を曖昧にする互換layerは残さない
- 全体Contextへ逃がす前に、URL・Feature store・local formで所有者を決める
- 派生値を複数箇所へ保存せず、正本と再計算責務を明示する
- selectorで切れないstate shapeなら、selectorを複雑化せずstate shapeを変える
- 技術検証でPNG cacheまで不要と分かった場合は実装しない。決定理由をこの計画書末尾へ追記する
- 既存の未commit変更`data/project.json`と`src/server/features/haqumei-api/__tests__/error.test.ts`を上書き・破棄しない

## 18. 決定ログ

- 2026-08-17: 永続化は1 JSONを維持する
- 2026-08-17: Pageを主要なForm/URL/Store購読境界とする
- 2026-08-17: TTSはPage aggregate内でIDベースの局所変更とする
- 2026-08-17: Thumbnail/Previewは保存済みProjectのみを見る
- 2026-08-17: Thumbnail方式の最終選択はPhase 0 spikeで決める
- 2026-08-17: Thumbnail戦略1を採用する（保存済みProject入力 + IntersectionObserverによるviewport付近のみmount）。専用CompositionとPNG cacheは実装しない。
  - 根拠: `shouldMountRemotionThumbnail` で非表示/未保存はRemotion treeをmountしない。
  - 根拠: Thumbnail hookは primitive な `itemRevision` / `renderRevision` / `hasSavedContentPage` だけを購読し、`inputProps` はそれらの値が変わったときだけ `useMemo` する。EditorSessionのTTS更新ではSavedProjectStoreが動かない。
  - 根拠: Page listは `sequenceOrder` だけを購読し、各itemは `type` と dirty boolean（version > 0）だけを購読する。Page content編集の回帰testで、list構造selectorと他Thumbnailの binding key は `Object.is` で通知されない。
  - 根拠: Page A保存時は `itemRevision[A]` だけ増え、Page Bの binding key は同じ文字列のままなので再生成しない。
  - 根拠: 全Thumbnailに効く saved-global は width/height、sequence、および保存済み duration / pad / transition variant。これらは `renderRevision` を上げる。下書きキーストロークは SavedProjectStore を動かさない。
  - 既存`Composition`をframe指定で再利用するため、`src/remotion`の描画ロジックは複製しない。
- 2026-08-17: レビュー後の再評価でも戦略1を維持する。mount済み無関係Thumbnailの props は editor 変更で参照安定。関連する saved-global（canvas size / sequence / 保存済み timing）は `renderRevision` で扱う。
- 2026-08-17: 先行Pageの保存済み duration 変更は後続Thumbnailの `frameToDisplay` を変えるため、その保存時は全 affected Thumbnail を `renderRevision` で invalidate する。

## 19. Browser確認 引き継ぎ（2026-08-17）

`agent-browser`による確認を途中まで実施した。実装・コードレビュー・品質コマンドはgreen。ブラウザ確認の残りは利用者が引き継ぐ。

確認済み:

- Project作成、Page A/B追加、Page選択時のcanonical URL更新
- Project root / Page / settings間の遷移、back/forward
- Page Bの最初のtitle編集が失われず、Page Aとの往復後も混線しない
- 2回目の編集もPage切替後に保持される
- 不正な数値入力を含む保存失敗後もdraft/dirty状態を維持する
- TTS入力のReact render profileで`PageList` / `PageThumbnail`は上位50件に現れず、全体波及は観測されなかった

未確認・要再確認:

- 保存済みPage URLの直接open / reload
- TTS追加・編集・削除を含む正常保存
- 保存前後のThumbnail / Previewと、対象Pageだけの更新
- Page並び替え・削除・URL fallbackの保存結果
- Project設定の正常保存と必要なRemotion表示だけの更新
- 多Page横スクロール時の非表示Thumbnail遅延mount
- 正常系を通した後のconsole / network error最終確認

ローカル環境では新規Projectのvoice選択肢が空で、正常保存用のTTSを作れなかった。既存のvoice設定済みProjectをSidebarのDuplicateで一時複製し、その複製だけで残りを確認するのが最短。作成した`codex-browser-verification-20260817-180022`は削除済み。

途中証跡: `/tmp/remotion-admin-browser-verification-20260817-180022/`

### 保存後G2P同期の追加確認

- 保存レスポンスの`speech.g2p`を、dirty snapshotのversionが一致する対象PageだけEditorSessionへreconcileする。
- 表示中Page FormにはTTS IDで`speech.g2p`だけを反映し、audio/duration等の永続化生成fieldは混ぜない。
- 保存中にPageのversionが進んだ場合はreconcileをskipし、後続編集を上書きしない。
- RHFの同期・遅延watchがreconcile snapshotをechoしても再dirty化しない。次の異なるユーザーsnapshotは通常どおりdirtyにする。
- 2026-08-17: voice設定済みProjectの一時Duplicateで実ブラウザ確認。TTS保存直後にreloadなしでAnalysisが新しいG2Pへ更新され、PageのDirty表示も解消したことを確認。一時Projectは削除済み。
