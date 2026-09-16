import { Button } from "@/app/components/ui/button";
import { Field, FieldError } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { formatVposMs } from "./comment-import.lib";
import { useCommentImport } from "./use-comment-import";
import { Eye } from "lucide-react";

export function CommentImport({ importer }: { importer: ReturnType<typeof useCommentImport> }) {
  const selectedCount = importer.selectedInsertIds.length;

  return (
    <div className="grid min-h-0 flex-1 gap-3">
      <Field>
        <label className="grid gap-2 text-sm font-medium">
          Video URL / ID
          <div className="flex items-center gap-2">
            <Input
              value={importer.source}
              onChange={(event) => importer.setSource(event.target.value)}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => void importer.fetchComments()}
              disabled={importer.pending}
            >
              {importer.pending ? "Fetching" : "Fetch"}
            </Button>
          </div>
        </label>
        {importer.error ? <FieldError errors={[{ message: importer.error }]} /> : null}
      </Field>
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-popover">
            <tr>
              <th className="w-10 p-2 text-left">
                <input
                  type="checkbox"
                  disabled={importer.insertable.length === 0}
                  checked={importer.checkboxState === "all"}
                  ref={(element) => {
                    if (element) {
                      element.indeterminate = importer.checkboxState === "some";
                    }
                  }}
                  onChange={importer.toggleAll}
                />
              </th>
              <th className="w-10 p-2">
                <Eye className="size-4" />
              </th>
              <th className="p-2 text-left">Comment</th>
              <th className="w-20 p-2 text-left">Time</th>
              <th className="w-16 p-2 text-left">No</th>
            </tr>
          </thead>
          <tbody>
            {importer.uninserted.map((comment) => (
              <tr key={comment.id} className="border-t border-border">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={!comment.hidden && importer.selectedIds.has(comment.id)}
                    disabled={comment.hidden}
                    onChange={(event) => importer.toggleOne(comment.id, event.target.checked)}
                  />
                </td>
                <td className="p-2">
                  <Switch
                    size="sm"
                    checked={comment.hidden}
                    aria-label={`Hide ${comment.no}`}
                    onCheckedChange={(checked) => importer.setHidden(comment.id, checked)}
                  />
                </td>
                <td className="p-2 whitespace-pre-wrap">{comment.body}</td>
                <td className="p-2 text-muted-foreground">{formatVposMs(comment.vposMs)}</td>
                <td className="p-2 text-muted-foreground">{comment.no}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {importer.uninserted.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {importer.comments.length > 0
              ? `${importer.comments.length} comments fetched, all inserted`
              : "No comments"}
          </p>
        ) : null}
      </div>
      <p className="sr-only">{selectedCount} selected</p>
    </div>
  );
}
