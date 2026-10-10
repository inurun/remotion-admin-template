/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import { Clip } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { SavedCommentsPage } from "@/_schemas";
import { Layer } from "@/video/components/layter";
import { useCommentsPage } from "@/video/pages/comments/use-comments-page";

// HyperFrames hides a clip with `visibility: hidden`, which keeps its layout box: clips are
// stacked absolutely (groups in the middle, the speaker line at the bottom), not in a flow.
export function CommentsPage({ page }: { page: SavedCommentsPage }) {
  const { ttsSegments, groupRanges } = useCommentsPage(page);

  return (
    <Layer className="bg-neutral-900 text-white">
      {groupRanges.length === 0 ? (
        <Layer className="flex flex-col justify-center p-16">
          <p className="text-2xl text-white/70">Comments</p>
        </Layer>
      ) : (
        groupRanges.map(({ group, comments, startSec, durationSec }) => (
          <Clip
            start={startSec}
            duration={durationSec}
            className="flex flex-col justify-center gap-6 p-16"
          >
            <p className="text-2xl text-white/70">{`${comments.length} comments`}</p>
            <div className="space-y-3 text-5xl font-semibold leading-tight">
              {group.displayText ? (
                <p>{group.displayText}</p>
              ) : (
                comments.map((comment) => <p>{comment.body}</p>)
              )}
            </div>
          </Clip>
        ))
      )}
      {ttsSegments.map((speaking) => (
        <Clip
          start={speaking.startSec}
          duration={speaking.durationSec}
          className="flex flex-col justify-end p-16"
        >
          <p className="text-3xl text-white/80">
            {"voiceName" in speaking && speaking.voiceName ? speaking.voiceName : speaking.provider}
            : {speaking.text}
          </p>
        </Clip>
      ))}
    </Layer>
  );
}
