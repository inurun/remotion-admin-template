import { FilePathSource, Input, WAVE } from "mediabunny";

export async function getWavDurationSeconds(filePath: string): Promise<number> {
  const input = new Input({
    formats: [WAVE],
    source: new FilePathSource(filePath),
  });

  try {
    return await input.computeDuration();
  } finally {
    input.dispose();
  }
}
