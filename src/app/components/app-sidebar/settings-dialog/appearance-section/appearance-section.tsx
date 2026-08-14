import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_shared/components/ui/select";
import {
  THEME_OPTIONS,
  useAppearanceSection,
} from "@/app/components/app-sidebar/settings-dialog/appearance-section/use-appearance-section";

export function AppearanceSection() {
  const appearance = useAppearanceSection();

  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-medium">Appearance</h3>
      <label className="grid grid-cols-[minmax(0,1fr)_160px] items-center gap-3 text-sm">
        <span>Theme</span>
        <Select
          value={appearance.value}
          onValueChange={appearance.onThemeChange}
          disabled={!appearance.mounted}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </section>
  );
}
