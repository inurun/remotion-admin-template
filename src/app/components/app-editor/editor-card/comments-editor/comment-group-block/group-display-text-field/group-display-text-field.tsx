import { Input } from "@/app/components/ui/input";
import { useGroupDisplayTextField } from "./use-group-display-text-field";

export function GroupDisplayTextField({
  groupIndex,
  firstCommentIndex,
}: {
  groupIndex: number;
  firstCommentIndex: number;
}) {
  const { value, placeholder, changeDisplayText, commitDisplayText } = useGroupDisplayTextField({
    groupIndex,
    firstCommentIndex,
  });

  return (
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(event) => changeDisplayText(event.target.value)}
      onBlur={(event) => commitDisplayText(event.target.value)}
    />
  );
}
