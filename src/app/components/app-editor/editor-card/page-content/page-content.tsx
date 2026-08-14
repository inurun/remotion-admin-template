import { Plus } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/_shared/components/ui/button";
import { Field, FieldError } from "@/_shared/components/ui/field";
import { RichTextEditor } from "@/_shared/components/ui/rich-text-editor/rich-text-editor";
import { usePageContent } from "@/app/components/app-editor/editor-card/page-content/use-page-content";

export function PageContent() {
  const { addRichText, control, fetchOgp, fieldName, removeRichText, uploadImage, uploadVideo } =
    usePageContent();

  return (
    <Controller
      name={fieldName}
      control={control}
      render={({ field, fieldState }) => {
        if (field.value === null) {
          return (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={addRichText}
              className="w-fit"
            >
              <Plus />
              Add content
            </Button>
          );
        }

        return (
          <Field data-invalid={fieldState.invalid} className="grid gap-2">
            <RichTextEditor
              value={field.value}
              onChange={field.onChange}
              onRemove={removeRichText}
              uploadImage={uploadImage}
              uploadVideo={uploadVideo}
              fetchOgp={fetchOgp}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
