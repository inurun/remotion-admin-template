import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ServerEnv } from "@/server/core/env";
import { DEFAULT_VOICEPEAK_PATH } from "./defaults";

const execFileAsync = promisify(execFile);

let queue = Promise.resolve();

function runInQueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function getVoicepeakPath(serverEnv: ServerEnv) {
  return serverEnv.VOICEPEAK_PATH?.trim() || DEFAULT_VOICEPEAK_PATH;
}

function cleanCliLines(stdout: string) {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("[debug]"));
}

export async function listNarrators(serverEnv: ServerEnv) {
  const { stdout } = await runInQueue(() =>
    execFileAsync(getVoicepeakPath(serverEnv), ["--list-narrator"]),
  );
  return cleanCliLines(stdout);
}

export async function runVoicepeakSynthesis(
  serverEnv: ServerEnv,
  args: {
    text: string;
    narrator: string;
    outputPath: string;
    emotion?: Record<string, number>;
    speed?: number;
    pitch?: number;
  },
) {
  const cliArgs = ["--say", args.text, "--narrator", args.narrator, "--out", args.outputPath];

  if (args.emotion && Object.keys(args.emotion).length > 0) {
    const emotionString = Object.entries(args.emotion)
      .map(([key, value]) => `${key}=${value}`)
      .join(",");
    cliArgs.push("--emotion", emotionString);
  }

  if (args.speed !== undefined) {
    cliArgs.push("--speed", String(args.speed));
  }

  if (args.pitch !== undefined) {
    cliArgs.push("--pitch", String(args.pitch));
  }

  await runInQueue(() => execFileAsync(getVoicepeakPath(serverEnv), cliArgs));
}
