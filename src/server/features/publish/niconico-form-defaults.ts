import { z } from "zod";

export const niconicoGarageFormControlSchema = z.enum(["checkbox", "radio", "combobox"]);
export const niconicoGarageFormSectionSchema = z.enum(["main", "options"]);

export const niconicoGarageFormFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  control: niconicoGarageFormControlSchema,
  value: z.union([z.string().min(1), z.boolean()]),
  section: niconicoGarageFormSectionSchema,
});

export type NiconicoGarageFormField = z.infer<typeof niconicoGarageFormFieldSchema>;

export const niconicoGarageFormFields: NiconicoGarageFormField[] = niconicoGarageFormFieldSchema
  .array()
  .parse([
    {
      key: "showSharedDescription",
      label: "この動画に表示する",
      control: "checkbox",
      value: false,
      section: "main",
    },
    {
      key: "showLikeThanks",
      label: "「いいね！」へのお礼メッセージを表示する",
      control: "checkbox",
      value: true,
      section: "main",
    },
    {
      key: "likeThanksMessage",
      label: "共通お礼メッセージを表示",
      control: "radio",
      value: "共通お礼メッセージを表示",
      section: "main",
    },
    {
      key: "genre",
      label: "ジャンルの設定",
      control: "combobox",
      value: "エンターテイメント",
      section: "main",
    },
    {
      key: "series",
      label: "シリーズの設定",
      control: "combobox",
      value: "日記 セイシュンツー",
      section: "main",
    },
    {
      key: "visibility",
      label: "公開設定",
      control: "combobox",
      value: "公開",
      section: "main",
    },
    {
      key: "publishTiming",
      label: "すぐに公開",
      control: "radio",
      value: "すぐに公開",
      section: "main",
    },
    {
      key: "allowXScreenshot",
      label: "Xへのスクリーンショット共有を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "allowXClip",
      label: "Xへのビデオクリップ共有を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "allowExternalPlayer",
      label: "ニコニコ動画外のブログやSNSでの外部プレーヤーを用いた動画再生を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "showInPostedList",
      label: "投稿動画一覧に表示する",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "allowGeneralTagEdit",
      label: "一般会員のタグ編集を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "allowNgShare",
      label: "NG共有機能の利用を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "allowGift",
      label: "｢ギフト｣の利用を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "allowNicoad",
      label: "｢ニコニ広告｣による宣伝を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "allowLiveIntro",
      label: "｢ニコニコ生放送｣による紹介を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
    {
      key: "allowUserTranslation",
      label: "ユーザーによるタイトルと動画説明文の翻訳を許可",
      control: "checkbox",
      value: true,
      section: "options",
    },
  ]);
