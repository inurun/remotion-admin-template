import { StreamLanguage } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const zenLanguage = StreamLanguage.define({
  name: "zen",
  token(stream) {
    if (stream.eatSpace()) {
      return null;
    }

    if (stream.match(/^#\s+/)) {
      return "zenHeading";
    }

    if (stream.match(/^#[^\s#]+/)) {
      return "zenTag";
    }

    if (stream.match(/^@\S+/)) {
      return "zenSpeaker";
    }

    stream.next();
    return null;
  },
  tokenTable: {
    zenHeading: t.heading1,
    zenTag: t.meta,
    zenSpeaker: t.keyword,
  },
});
