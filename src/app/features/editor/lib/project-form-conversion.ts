import { isSavedContentPage, type SavedPage, type SavedProject, type SavedTts } from "@/_schemas";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TransitionFormValues } from "@/app/features/page/model/transition-form-schema";
import type { ProjectSettingsFormValues } from "@/app/features/project/model/project-settings-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { getDefaultVoicePresets } from "@/_shared/project/default-voice-presets";
import { normalizeProjectMeta } from "@/_shared/project/project-meta";

export function toTtsFormValues(item: SavedTts): TtsFormValues {
  return {
    id: item.id,
    provider: item.provider,
    text: item.text,
    readText: item.readText,
    voiceName: item.voiceName,
    padBeforeSec: item.padBeforeSec,
    padAfterSec: item.padAfterSec,
    volume: item.volume,
    ...(item.voiceVersion ? { voiceVersion: item.voiceVersion } : {}),
    ...(item.synthesisSettings ? { synthesisSettings: item.synthesisSettings } : {}),
    ...(item.avatar ? { avatar: item.avatar } : {}),
    speech: item.speech.g2p ? { g2p: item.speech.g2p } : {},
  } as TtsFormValues;
}

export function toPageFormValues(page: SavedPage): PageFormValues {
  const tts = page.tts.map(toTtsFormValues);
  if (page.type === "outro") {
    return {
      id: page.id,
      title: page.title,
      type: "outro",
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      richText: page.richText,
      tts,
    };
  }

  if (page.type === "endcard") {
    return {
      id: page.id,
      title: page.title,
      type: "endcard",
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      richText: page.richText,
      tts,
    };
  }

  return {
    id: page.id,
    title: page.title,
    type: page.type,
    meta: page.meta,
    padBeforeSec: page.padBeforeSec,
    padAfterSec: page.padAfterSec,
    richText: page.richText,
    tts,
  };
}

export function mergeSavedSpeechIntoPageForm(
  current: PageFormValues,
  savedFormPage: PageFormValues,
): PageFormValues {
  const g2pById = new Map(
    savedFormPage.tts.flatMap((item) =>
      item.speech?.g2p ? [[item.id, item.speech.g2p] as const] : [],
    ),
  );
  if (g2pById.size === 0) {
    return current;
  }

  let changed = false;
  const tts = current.tts.map((item) => {
    const g2p = g2pById.get(item.id);
    if (!g2p || item.speech?.g2p === g2p) {
      return item;
    }
    changed = true;
    return {
      ...item,
      speech: {
        ...item.speech,
        g2p,
      },
    };
  });

  return changed ? { ...current, tts } : current;
}

export function toSequenceFormItem(item: SavedProject["pages"][number]) {
  if (!isSavedContentPage(item)) {
    return {
      id: item.id,
      type: "transition" as const,
      variant: item.variant,
    } satisfies TransitionFormValues;
  }

  return toPageFormValues(item);
}

export function toProjectSettingsFormValues(project: SavedProject): ProjectSettingsFormValues {
  return {
    meta: normalizeProjectMeta(project.meta),
    bgm: project.bgm,
    voicePresets: project.voicePresets ?? getDefaultVoicePresets(),
  };
}
