import { api } from "@/app/lib/api-client";
import { parseApiJson } from "@/app/lib/fetch-json";

export async function uploadImage(file: File, projectPath: string) {
  const data = await parseApiJson<{ src: string }>(
    await api.uploads.image.$post({
      form: { file, projectPath },
    }),
  );

  return data.src;
}

export async function uploadVideo(file: File, projectPath: string) {
  const data = await parseApiJson<{ src: string }>(
    await api.uploads.video.$post({
      form: { file, projectPath },
    }),
  );

  return data.src;
}
