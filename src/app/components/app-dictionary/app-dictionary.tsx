import { Plus, Save, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/_shared/components/ui/card";
import { Input } from "@/_shared/components/ui/input";
import { Switch } from "@/_shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/_shared/components/ui/tabs";
import { Textarea } from "@/_shared/components/ui/textarea";
import { AnalysisResult, DictionaryEditor } from "./dictionary-editor";
import { type DictionaryKind, useAppDictionary } from "./use-app-dictionary";

const TABS: Array<{ kind: DictionaryKind; label: string }> = [
  { kind: "fixed", label: "Words" },
  { kind: "contextual", label: "Context" },
];

type DictionaryState = ReturnType<typeof useAppDictionary>;

function DictionaryWorkspace({ state }: { state: DictionaryState }) {
  return (
    <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardAction>
            <Button type="button" size="sm" variant="outline" onClick={() => state.add(state.kind)}>
              <Plus /> Add
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid min-h-0 flex-1 gap-3 overflow-hidden">
          <Input
            placeholder="Search surface"
            value={state.query}
            onChange={(e) => state.setQuery(e.target.value)}
          />
          <div className="grid min-h-0 flex-1 gap-1 overflow-y-auto">
            {state.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {state.filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center gap-2 rounded-lg pr-3 hover:bg-muted ${state.selectedId === entry.id ? "bg-muted" : ""}`}
              >
                <Switch
                  size="sm"
                  checked={entry.enabled}
                  disabled={state.pending}
                  aria-label={`Enable ${entry.surface}`}
                  onCheckedChange={(checked) => state.toggleEntry(entry, checked)}
                />
                <button
                  type="button"
                  className="grid min-w-0 flex-1 py-2 text-left"
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
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  disabled={state.pending}
                  aria-label={`Delete ${entry.surface}`}
                  onClick={() => state.removeEntry(entry.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden">
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
        <CardContent className="grid min-h-0 flex-1 gap-5 overflow-y-auto">
          {state.draft && (
            <>
              <div className="grid gap-3 border-b pb-4">
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
              <DictionaryEditor draft={state.draft} setDraft={state.setDraft} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AppDictionary() {
  const state = useAppDictionary();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <header>
        <h1 className="font-heading text-xl font-bold tracking-tight">Dictionary</h1>
        <p className="text-xs text-muted-foreground">
          Revision {state.dictionary.revision} · {state.dictionary.entries.length} entries
        </p>
      </header>

      <Tabs
        value={state.kind}
        onValueChange={(value) => {
          if (value === "fixed" || value === "contextual") state.setKind(value);
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.kind} value={tab.kind}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent
            key={tab.kind}
            value={tab.kind}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {state.kind === tab.kind ? <DictionaryWorkspace state={state} /> : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
