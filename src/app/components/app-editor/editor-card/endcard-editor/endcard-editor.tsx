import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { Controller, useFormContext } from "react-hook-form";
import { Link2 } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/_shared/components/ui/field";
import { Input } from "@/_shared/components/ui/input";
import { Textarea } from "@/_shared/components/ui/textarea";
import { EndcardList } from "./endcard-list/endcard-list";
import { useEndcardEditor } from "./use-endcard-editor";

export function EndcardEditor() {
  const { control } = useFormContext<PageFormValues>();
  const { pending, error, credits, advertisers, messages, fetchAdvertisers } = useEndcardEditor();
  const sourceName = `meta.nicoadSource` as const;

  return (
    <FieldGroup className="gap-6">
      <EndcardList
        label="Credits"
        emptyLabel="No credits"
        fields={credits.fields}
        onAdd={credits.addItem}
        onRemove={credits.removeItem}
        onDragEnd={credits.handleDragEnd}
      >
        {(index) => {
          const baseName = `meta.credits.${index}` as const;
          return (
            <>
              <Field>
                <Controller
                  control={control}
                  name={`${baseName}.title`}
                  render={({ field }) => <Input {...field} placeholder="Title" />}
                />
              </Field>
              <Field>
                <Controller
                  control={control}
                  name={`${baseName}.url`}
                  render={({ field }) => <Input {...field} placeholder="https://" />}
                />
              </Field>
            </>
          );
        }}
      </EndcardList>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Advertisers</p>
        <Field>
          <div className="flex gap-2">
            <Controller
              control={control}
              name={sourceName}
              render={({ field }) => (
                <Input {...field} placeholder="smXXXX or nicoad URL" className="flex-1" />
              )}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={fetchAdvertisers}
              disabled={pending}
            >
              <Link2 />
              {pending ? "..." : "Fetch"}
            </Button>
          </div>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <EndcardList
          label=""
          emptyLabel="No advertisers"
          fields={advertisers.fields}
          onAdd={advertisers.addItem}
          onRemove={advertisers.removeItem}
          onDragEnd={advertisers.handleDragEnd}
        >
          {(index) => {
            const baseName = `meta.advertisers.${index}` as const;
            return (
              <>
                <Field>
                  <Controller
                    control={control}
                    name={`${baseName}.name`}
                    render={({ field }) => <Input {...field} placeholder="Name" />}
                  />
                </Field>
                <Field>
                  <Controller
                    control={control}
                    name={`${baseName}.message`}
                    render={({ field }) => <Textarea {...field} placeholder="Message" rows={2} />}
                  />
                </Field>
              </>
            );
          }}
        </EndcardList>
      </div>

      <EndcardList
        label="Messages"
        emptyLabel="No messages"
        fields={messages.fields}
        onAdd={messages.addItem}
        onRemove={messages.removeItem}
        onDragEnd={messages.handleDragEnd}
      >
        {(index) => {
          const baseName = `meta.messages.${index}` as const;
          return (
            <Field>
              <Controller
                control={control}
                name={`${baseName}.text`}
                render={({ field }) => (
                  <Textarea {...field} placeholder="Thank you for watching!" rows={2} />
                )}
              />
            </Field>
          );
        }}
      </EndcardList>
    </FieldGroup>
  );
}
