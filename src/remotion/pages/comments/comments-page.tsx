import { Audio } from "@remotion/media";
import { SequenceUnstyled } from "@/remotion/components/sequence-unstyled";
import type { SavedCommentsPage } from "@/_schemas";
import { AbsoluteFill } from "remotion";
import { useCommentsPage } from "@/remotion/pages/comments/use-comments-page";

export function CommentsPage({ page }: { page: SavedCommentsPage }) {
  const { ttsSegments, currentGroup, speaking } = useCommentsPage(page);
  const displayText = currentGroup?.group.displayText;

  return (
    <AbsoluteFill className="bg-neutral-900 p-16 text-white">
      {ttsSegments.map((segment) => (
        <SequenceUnstyled
          key={segment.id}
          name={segment.text}
          from={segment.start}
          durationInFrames={segment.duration}
        >
          <Audio src={segment.audio.src} volume={segment.volume} />
        </SequenceUnstyled>
      ))}
      <div className="flex h-full flex-col justify-center gap-6">
        <p className="text-2xl text-white/70">
          {currentGroup ? `${currentGroup.comments.length} comments` : "Comments"}
        </p>
        <div className="space-y-3 text-5xl font-semibold leading-tight">
          {displayText ? (
            <p>{displayText}</p>
          ) : (
            (currentGroup?.comments ?? []).map((comment) => <p key={comment.id}>{comment.body}</p>)
          )}
        </div>
        {speaking ? (
          <p className="text-3xl text-white/80">
            {"voiceName" in speaking && speaking.voiceName ? speaking.voiceName : speaking.provider}
            : {speaking.text}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}
