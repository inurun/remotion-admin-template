import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { cn } from "@/_shared/lib/utils";
import { TtsTextField } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-text-field/tts-text-field";
import { TtsVoiceField } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-voice-field/tts-voice-field";
import { useTtsItem } from "@/app/components/app-editor/editor-card/tts-list/tts-item/use-tts-item";

export function TtsItem({
  index,
  ttsId,
  onInsertAfter,
  onRemove,
  onSelect,
  onFocus,
}: {
  index: number;
  ttsId: string;
  onInsertAfter: (index: number) => void;
  onRemove: () => void;
  onSelect: (index: number) => void;
  onFocus: (index: number) => void;
}) {
  const { ref, handleRef, isDragging, isSelected } = useTtsItem(ttsId, index);

  return (
    <article
      ref={ref}
      data-dragging={isDragging}
      className={cn(
        "flex gap-2 overflow-hidden flex-wrap p-1 transition data-[dragging=true]:opacity-70",
        isSelected ? "bg-muted/20" : "bg-card",
      )}
    >
      <span
        ref={handleRef}
        tabIndex={-1}
        className="inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing"
        title="Reorder"
        aria-label="Reorder"
      >
        <GripVertical className="size-4" />
      </span>
      <div className="grid gap-1 w-full max-w-30">
        <TtsVoiceField index={index} onSelect={onSelect} />
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          tabIndex={-1}
          onClick={onRemove}
          title="削除"
          aria-label="削除"
          className="shrink-0"
        >
          <Trash2 />
        </Button>
      </div>
      <TtsTextField
        index={index}
        ttsId={ttsId}
        onFocus={onFocus}
        onInsertAfter={onInsertAfter}
        onRemove={onRemove}
      />
    </article>
  );
}
