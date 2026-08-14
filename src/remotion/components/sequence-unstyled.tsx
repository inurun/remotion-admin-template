import { Sequence, SequenceProps } from "remotion";

export function SequenceUnstyled({
  children,
  from,
  durationInFrames,
  showInTimeline = false,
  ...props
}: SequenceProps) {
  return (
    <Sequence
      layout="none"
      from={from}
      durationInFrames={durationInFrames}
      showInTimeline={showInTimeline}
      {...props}
    >
      {children}
    </Sequence>
  );
}
