import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/_shared/lib/utils";
import { TtsTextField } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-text-field/tts-text-field";
import { TtsVoiceField } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-voice-field/tts-voice-field";
import { TtsSynthesisStatus } from "@/app/components/app-editor/editor-card/tts-list/tts-item/tts-synthesis-status/tts-synthesis-status";
import { useReplyRow } from "./use-reply-row";

export function ReplyRow({
  pageId,
  groupId,
  ttsId,
  onRemove,
  onInsertAfter,
  onSelect,
}: {
  pageId: string;
  groupId: string;
  ttsId: string;
  onRemove: () => void;
  onInsertAfter: () => void;
  onSelect: () => void;
}) {
  const { ref, handleRef, isDragging, isSelected, formIndex, synthesisStatus, synthesisError } =
    useReplyRow({
      kind: "reply",
      pageId,
      groupId,
      entityId: ttsId,
    });

  if (formIndex < 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2",
        isDragging && "opacity-60",
        isSelected ? "bg-muted/20" : "bg-card",
        (synthesisStatus === "analyzing" || synthesisStatus === "pending") &&
          "text-muted-foreground",
        synthesisStatus === "failed" && "ring-1 ring-destructive/40",
      )}
    >
      <span
        ref={handleRef}
        tabIndex={-1}
        className="inline-flex size-6 cursor-grab items-center justify-center text-muted-foreground"
      >
        <GripVertical className="size-4" />
      </span>
      <div>
        <TtsVoiceField index={formIndex} onSelect={() => onSelect()} />
      </div>
      <div className="min-w-0 flex-1">
        <TtsTextField
          index={formIndex}
          ttsId={ttsId}
          onFocus={() => onSelect()}
          onInsertAfter={() => onInsertAfter()}
          onRemove={onRemove}
        />
      </div>
      <Button type="button" size="icon-xs" variant="destructive" tabIndex={-1} onClick={onRemove}>
        <Trash2 />
      </Button>
      <TtsSynthesisStatus status={synthesisStatus} error={synthesisError} />
    </div>
  );
}
