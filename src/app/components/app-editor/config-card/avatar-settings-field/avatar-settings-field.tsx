import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { avatarOptions, type AvatarSettings } from "@/_schemas";
import { Field } from "@/_shared/components/ui/field";
import {
  getAvatarTypeByVoiceName,
  getOpenedMouthOptions,
  resolveAvatarSettings,
} from "@/_shared/lib/avatar/avatar-settings";
import { useSelectedTts, useTtsFormIndex } from "@/app/features/tts";

function AvatarSelect({
  children,
  onChange,
  value,
}: {
  children: React.ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

function AvatarSettingsControls({
  onChange,
  value,
  voiceName,
}: {
  onChange: (value: AvatarSettings) => void;
  value: AvatarSettings | undefined;
  voiceName: string | undefined;
}) {
  const avatarType = getAvatarTypeByVoiceName(voiceName);
  const options = avatarOptions[avatarType];
  const openedMouthOptions = getOpenedMouthOptions(avatarType);
  const avatar = resolveAvatarSettings(avatarType, value);

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">Avatar: {avatarType}</div>
      <div className="grid grid-cols-3 gap-2">
        <Field>
          <AvatarSelect value={avatar.base} onChange={(base) => onChange({ ...avatar, base })}>
            {options.base.map((base) => (
              <option key={base} value={base}>
                {base}
              </option>
            ))}
          </AvatarSelect>
        </Field>
        <Field>
          <AvatarSelect value={avatar.eyes} onChange={(eyes) => onChange({ ...avatar, eyes })}>
            {options.eyes.map((eyes) => (
              <option key={eyes} value={eyes}>
                {eyes}
              </option>
            ))}
          </AvatarSelect>
        </Field>
        <Field>
          <AvatarSelect value={avatar.mouth} onChange={(mouth) => onChange({ ...avatar, mouth })}>
            {openedMouthOptions.map((mouth) => (
              <option key={mouth} value={mouth}>
                {mouth}
              </option>
            ))}
          </AvatarSelect>
        </Field>
      </div>
    </div>
  );
}

function BoundAvatarSettingsField({ ttsIndex }: { ttsIndex: number }) {
  const { control } = useFormContext<PageFormValues>();
  const voiceName = useWatch({
    control,
    name: `tts.${ttsIndex}.voiceName`,
  });

  return (
    <Controller
      name={`tts.${ttsIndex}.avatar`}
      control={control}
      render={({ field }) => (
        <AvatarSettingsControls
          value={field.value}
          voiceName={voiceName}
          onChange={field.onChange}
        />
      )}
    />
  );
}

export function AvatarSettingsField() {
  const { ttsId } = useSelectedTts();
  const ttsIndex = useTtsFormIndex(ttsId);

  if (ttsIndex < 0) {
    return null;
  }

  return <BoundAvatarSettingsField ttsIndex={ttsIndex} />;
}
