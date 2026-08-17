import { useFormContext } from "react-hook-form";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { fetchOgp } from "@/app/features/ogp";
import { useProject } from "@/app/features/project";
import { uploadImage, uploadVideo } from "@/app/features/uploads";

const EMPTY_RICH_TEXT = "<p></p>";

export function usePageContent() {
  const { control, setValue } = useFormContext<PageFormValues>();
  const { projectPath } = useProject();
  const fieldName = "richText" as const;

  return {
    control,
    fieldName,
    addRichText: () => {
      setValue(fieldName, EMPTY_RICH_TEXT, { shouldDirty: true, shouldValidate: true });
    },
    removeRichText: () => {
      setValue(fieldName, null, { shouldDirty: true, shouldValidate: true });
    },
    uploadImage: async (file: File) => {
      if (!projectPath) {
        throw new Error("Project path is required");
      }
      return uploadImage(file, projectPath);
    },
    uploadVideo: async (file: File) => {
      if (!projectPath) {
        throw new Error("Project path is required");
      }
      return uploadVideo(file, projectPath);
    },
    fetchOgp,
  };
}
