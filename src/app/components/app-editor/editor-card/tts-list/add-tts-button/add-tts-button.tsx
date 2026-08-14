import { Plus } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";

export function AddTtsButton({ onAppend }: { onAppend: () => void }) {
  return (
    <div className="flex absolute bottom-0 right-0">
      <Button type="button" size="sm" title="TTS 追加" aria-label="TTS 追加" onClick={onAppend}>
        <Plus />
        Add
      </Button>
    </div>
  );
}
