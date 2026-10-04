/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import { AbsoluteFill, Sequence } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { SavedCommentsPage } from "@/_schemas";
import { useCommentsPage } from "@/video/pages/comments/use-comments-page";

export function CommentsPage({ page }: { page: SavedCommentsPage }) {
  const { ttsSegments, groupRanges } = useCommentsPage(page);

  return (
    <AbsoluteFill className="bg-neutral-900 p-16 text-white">
      <div className="flex h-full flex-col justify-center gap-6">
        {groupRanges.length === 0 ? (
          <>
            <p className="text-2xl text-white/70">Comments</p>
            <div className="space-y-3 text-5xl font-semibold leading-tight" />
          </>
        ) : (
          groupRanges.map(({ group, comments, from, durationInFrames }) => (
            <Sequence layout="none" key={group.id} from={from} durationInFrames={durationInFrames}>
              <p className="text-2xl text-white/70">{`${comments.length} comments`}</p>
              <div className="space-y-3 text-5xl font-semibold leading-tight">
                {group.displayText ? (
                  <p>{group.displayText}</p>
                ) : (
                  comments.map((comment) => <p key={comment.id}>{comment.body}</p>)
                )}
              </div>
            </Sequence>
          ))
        )}
        {ttsSegments.map((speaking) => (
          <Sequence
            layout="none"
            key={speaking.id}
            from={speaking.start}
            durationInFrames={speaking.duration}
          >
            <p className="text-3xl text-white/80">
              {"voiceName" in speaking && speaking.voiceName
                ? speaking.voiceName
                : speaking.provider}
              : {speaking.text}
            </p>
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
}
