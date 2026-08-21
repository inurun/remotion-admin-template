import { Plus, Save, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { Input } from "@/_shared/components/ui/input";
import { Switch } from "@/_shared/components/ui/switch";
import { Textarea } from "@/_shared/components/ui/textarea";
import { AnalysisResult, DictionaryEditor } from "./dictionary-editor";
import { useAppDictionary } from "./use-app-dictionary";

export function AppDictionary() {
  const state = useAppDictionary();
  return (
    <>
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight">Dictionary</h1>
          <p className="text-xs text-muted-foreground">
            Revision {state.dictionary.revision} · {state.dictionary.entries.length} entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => state.add("fixed")}>
            <Plus /> Add Word
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => state.add("contextual")}>
            <Plus /> Add Context Rule
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="h-fit min-w-0 lg:sticky lg:top-2">
          <CardHeader>
            <CardTitle>Entries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
              <Input
                placeholder="Search surface"
                value={state.query}
                onChange={(e) => state.setQuery(e.target.value)}
              />
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                value={state.kindFilter}
                onChange={(e) => state.setKindFilter(e.target.value as typeof state.kindFilter)}
              >
                <option value="all">All</option>
                <option value="fixed">Words</option>
                <option value="contextual">Context</option>
              </select>
            </div>
            <div className="grid max-h-[calc(100vh-13rem)] gap-1 overflow-y-auto">
              {state.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {state.filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 rounded-lg pr-3 hover:bg-muted ${state.selectedId === entry.id ? "bg-muted" : ""}`}
                >
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={state.pending}
                    aria-label={`Delete ${entry.surface}`}
                    onClick={() => state.removeEntry(entry.id)}
                  >
                    <Trash2 />
                  </Button>
                  <Switch
                    size="sm"
                    checked={entry.enabled}
                    disabled={state.pending}
                    aria-label={`Enable ${entry.surface}`}
                    onCheckedChange={(checked) => state.toggleEntry(entry, checked)}
                  />
                  <button
                    type="button"
                    className="grid min-w-0 py-2 text-left"
                    onClick={() => state.select(entry.id)}
                  >
                    <span className="truncate text-sm font-medium">{entry.surface}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.kind === "fixed"
                        ? entry.reading
                        : `${entry.candidates.length} candidates`}
                      {!entry.enabled && " · Disabled"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>
              {state.draft
                ? state.draft.kind === "fixed"
                  ? "Word"
                  : "Context Rule"
                : "Select an entry"}
              {state.dirty && " · Unsaved"}
            </CardTitle>
            {state.draft && (
              <CardAction className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={state.pending}
                  onClick={state.saveOnly}
                >
                  <Save /> Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={!state.selectedId || state.pending}
                  onClick={state.remove}
                >
                  <Trash2 /> Delete
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="grid gap-5">
            {state.draft && (
              <>
                <DictionaryEditor
                  draft={state.draft}
                  setDraft={state.setDraft}
                  selectedCandidate={state.selectedCandidate}
                />
                <div className="grid gap-3 border-t pt-4">
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Preview text
                    <Textarea
                      rows={2}
                      value={state.previewText}
                      onChange={(e) => state.setPreviewText(e.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    className="w-fit"
                    disabled={state.pending}
                    onClick={state.saveAndPreview}
                  >
                    <Volume2 /> {state.pending ? "Working…" : "Save & Preview"}
                  </Button>
                  {state.error && <p className="text-sm text-destructive">{state.error}</p>}
                  {state.analysis && <AnalysisResult analysis={state.analysis} />}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
