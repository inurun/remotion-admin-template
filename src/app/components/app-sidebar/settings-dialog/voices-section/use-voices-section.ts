// fallow-ignore-file unused-export -- helpers are covered by colocated unit tests
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { VoiceOption } from "@/_schemas";
import { fetchVoices } from "@/app/features/settings/api/settings-api";
import { getVoiceId } from "@/app/features/settings";
import { mergeVoiceOrder } from "@/app/features/settings/lib/settings";
import { moveItem } from "@/app/features/ui/lib/reorder";
import type { SettingsFormValues } from "@/app/components/app-sidebar/settings-dialog/use-settings-dialog";

export function getVisibleVoices(values: Pick<SettingsFormValues, "voices" | "voiceOrder">) {
  const voicesById = new Map(values.voices.map((voice) => [getVoiceId(voice), voice]));
  return mergeVoiceOrder(values.voiceOrder, values.voices).flatMap((voiceId) => {
    const voice = voicesById.get(voiceId);
    return voice ? [voice] : [];
  });
}

export function getAddableVoices(values: Pick<SettingsFormValues, "voices" | "voiceOrder">) {
  const selectedIds = new Set(values.voiceOrder);
  return values.voices.filter((voice) => !selectedIds.has(getVoiceId(voice)));
}

export function getSettingsErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Settings action failed";
}

export function getVoiceSettingIndex(
  values: Pick<SettingsFormValues, "voiceSettings">,
  voiceId: string,
) {
  return values.voiceSettings.findIndex((setting) => setting.voiceId === voiceId);
}

export function getVoiceSetting(
  values: Pick<SettingsFormValues, "voiceSettings">,
  voiceId: string,
) {
  return (
    values.voiceSettings.find((item) => item.voiceId === voiceId) ?? {
      voiceId,
      label: "",
      alias: "",
      hotkey: "",
    }
  );
}

export function appendMissingVoiceSettings(
  values: Pick<SettingsFormValues, "voiceSettings">,
  voiceIds: string[],
) {
  const existingIds = new Set(values.voiceSettings.map((setting) => setting.voiceId));
  const missing = voiceIds
    .filter((voiceId) => !existingIds.has(voiceId))
    .map((voiceId) => ({ voiceId, label: "", alias: "", hotkey: "" }));

  return [...values.voiceSettings, ...missing];
}

export function applyFetchedCatalog(
  values: Pick<SettingsFormValues, "voiceOrder">,
  options: VoiceOption[],
) {
  return {
    voices: options,
    voiceOrder: mergeVoiceOrder(values.voiceOrder, options),
  };
}

export function nextSelectedVoiceIds(current: string[], voiceId: string, checked: boolean) {
  if (checked) {
    return current.includes(voiceId) ? current : [...current, voiceId];
  }

  return current.filter((id) => id !== voiceId);
}

export function nextVoiceOrderAfterAdd(voiceOrder: string[], selectedVoiceIds: string[]) {
  const selectedIds = new Set(voiceOrder);
  return selectedVoiceIds.filter((voiceId) => !selectedIds.has(voiceId));
}

export function getAddVoicesEmptyMessage({
  isLoadingCatalog,
  addableCount,
  catalogCount,
}: {
  isLoadingCatalog: boolean;
  addableCount: number;
  catalogCount: number;
}) {
  if (isLoadingCatalog) {
    return "Loading voices...";
  }

  if (addableCount > 0) {
    return null;
  }

  return catalogCount === 0 ? "No voices." : "All voices added.";
}

function commitSelectedVoices(
  form: UseFormReturn<SettingsFormValues>,
  selectedVoiceIds: string[],
  resetAddDialogState: () => void,
) {
  const current = form.getValues();
  const nextIds = nextVoiceOrderAfterAdd(current.voiceOrder, selectedVoiceIds);
  if (nextIds.length === 0) {
    resetAddDialogState();
    return;
  }

  form.setValue("voiceOrder", [...current.voiceOrder, ...nextIds], {
    shouldDirty: true,
    shouldValidate: true,
  });
  form.setValue("voiceSettings", appendMissingVoiceSettings(current, nextIds), {
    shouldDirty: true,
    shouldValidate: true,
  });
  resetAddDialogState();
}

function setVoiceFieldValue(
  form: UseFormReturn<SettingsFormValues>,
  voice: VoiceOption,
  field: "label" | "alias" | "hotkey",
  value: string,
  options?: { shouldValidate?: boolean },
) {
  const index = getVoiceSettingIndex(form.getValues(), getVoiceId(voice));
  if (index === -1) {
    return;
  }

  form.setValue(`voiceSettings.${index}.${field}`, value, {
    shouldDirty: true,
    shouldValidate: options?.shouldValidate,
  });
}

function syncAddDialogWithSettingsOpen(settingsOpen: boolean, resetAddDialogState: () => void) {
  if (!settingsOpen) {
    resetAddDialogState();
  }
}

function startAddDialog(
  loadCatalog: () => Promise<void>,
  actions: {
    setAddDialogOpen: (open: boolean) => void;
    setIsLoadingCatalog: (loading: boolean) => void;
    setSelectedVoiceIds: (ids: string[]) => void;
  },
) {
  actions.setAddDialogOpen(true);
  actions.setIsLoadingCatalog(true);
  actions.setSelectedVoiceIds([]);
  void toast.promise(loadCatalog(), {
    loading: "Loading voices...",
    success: "Voices loaded.",
    error: getSettingsErrorMessage,
  });
}

function applyAddDialogOpenChange(
  nextOpen: boolean,
  resetAddDialogState: () => void,
  loadCatalog: () => Promise<void>,
  actions: {
    setAddDialogOpen: (open: boolean) => void;
    setIsLoadingCatalog: (loading: boolean) => void;
    setSelectedVoiceIds: (ids: string[]) => void;
  },
) {
  if (!nextOpen) {
    resetAddDialogState();
    return;
  }

  startAddDialog(loadCatalog, actions);
}

async function loadVoiceCatalog(
  form: UseFormReturn<SettingsFormValues>,
  setIsLoadingCatalog: (loading: boolean) => void,
  setSelectedVoiceIds: (ids: string[]) => void,
) {
  setIsLoadingCatalog(true);
  try {
    const result = await fetchVoices();
    const next = applyFetchedCatalog(form.getValues(), result.options);
    form.setValue("voices", next.voices, { shouldDirty: true });
    form.setValue("voiceOrder", next.voiceOrder, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setSelectedVoiceIds([]);
  } finally {
    setIsLoadingCatalog(false);
  }
}

export function useVoicesSection(form: UseFormReturn<SettingsFormValues>, settingsOpen: boolean) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>([]);
  const voices = useWatch({ control: form.control, name: "voices", defaultValue: [] }) ?? [];
  const voiceOrder =
    useWatch({ control: form.control, name: "voiceOrder", defaultValue: [] }) ?? [];
  const { visibleVoices, addableVoices, catalogCount } = useMemo(() => {
    const catalog = { voices, voiceOrder };
    return {
      visibleVoices: getVisibleVoices(catalog),
      addableVoices: getAddableVoices(catalog),
      catalogCount: catalog.voices.length,
    };
  }, [voiceOrder, voices]);

  const resetAddDialogState = useCallback(() => {
    setAddDialogOpen(false);
    setIsLoadingCatalog(false);
    setSelectedVoiceIds([]);
  }, []);

  useEffect(() => {
    syncAddDialogWithSettingsOpen(settingsOpen, resetAddDialogState);
  }, [resetAddDialogState, settingsOpen]);

  const loadCatalog = useCallback(
    () => loadVoiceCatalog(form, setIsLoadingCatalog, setSelectedVoiceIds),
    [form],
  );

  const handleAddDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      applyAddDialogOpenChange(nextOpen, resetAddDialogState, loadCatalog, {
        setAddDialogOpen,
        setIsLoadingCatalog,
        setSelectedVoiceIds,
      });
    },
    [loadCatalog, resetAddDialogState],
  );

  const addSelectedVoices = useCallback(() => {
    commitSelectedVoices(form, selectedVoiceIds, resetAddDialogState);
  }, [form, resetAddDialogState, selectedVoiceIds]);

  const removeVoice = useCallback(
    (voice: VoiceOption) => {
      form.setValue(
        "voiceOrder",
        form.getValues().voiceOrder.filter((id) => id !== getVoiceId(voice)),
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    },
    [form],
  );

  const moveVoice = useCallback(
    (fromIndex: number, toIndex: number) => {
      form.setValue(
        "voiceOrder",
        moveItem(getVisibleVoices(form.getValues()).map(getVoiceId), fromIndex, toIndex),
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    },
    [form],
  );

  return {
    addDialogOpen,
    addableVoices,
    isLoadingCatalog,
    selectedVoiceIds,
    visibleVoices,
    emptyMessage: getAddVoicesEmptyMessage({
      isLoadingCatalog,
      addableCount: addableVoices.length,
      catalogCount,
    }),
    getVoiceSettingIndexFor: (voice: VoiceOption) =>
      getVoiceSettingIndex(form.getValues(), getVoiceId(voice)),
    addSelectedVoices,
    handleAddDialogOpenChange,
    moveVoice,
    removeVoice,
    setVoiceHotkey: (voice: VoiceOption, hotkey: string) =>
      setVoiceFieldValue(form, voice, "hotkey", hotkey, { shouldValidate: true }),
    setVoiceLabel: (voice: VoiceOption, label: string) =>
      setVoiceFieldValue(form, voice, "label", label),
    setVoiceAlias: (voice: VoiceOption, alias: string) =>
      setVoiceFieldValue(form, voice, "alias", alias),
    toggleSelectedVoice: (voiceId: string, checked: boolean) => {
      setSelectedVoiceIds((current) => nextSelectedVoiceIds(current, voiceId, checked));
    },
  };
}
