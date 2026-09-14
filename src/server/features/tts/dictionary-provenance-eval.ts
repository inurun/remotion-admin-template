import { listG2pPronunciationWords, type DictionaryWord } from "@/_schemas";
import { dslSyntaxErrors } from "@/server/features/tts/g2p-topology";

export const DICTIONARY_PROVENANCE_EVAL_RUNS = 10;

export type EvalUsage = {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  costUsd: number;
};

export const EMPTY_EVAL_USAGE: EvalUsage = {
  promptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  cachedTokens: 0,
  totalTokens: 0,
  costUsd: 0,
};

export type DictionaryWordReadingChange = {
  wordIndex: number;
  kind: DictionaryWord["kind"];
  baselineReading: string | null;
  finalReading: string | null;
  status: "kept" | "changed" | "unevaluable";
};

export type DictionaryEvalRunRecord = {
  index: number;
  ok: boolean;
  changed?: boolean;
  correctionKana?: string;
  finalKana?: string;
  reason?: string;
  elapsedMs: number;
  usage: EvalUsage;
  dictionaryWordReadings?: DictionaryWordReadingChange[];
  error?: { name?: string; message: string };
};

export function pronunciationReading(word: string) {
  return word.replaceAll("'", "");
}

export function finalKana(
  baselineKana: string,
  correction: { changed: boolean; kana: string } | undefined,
) {
  if (!correction || !correction.changed) {
    return baselineKana;
  }
  return correction.kana;
}

export function dictionaryWordReadingChanges(
  baselineKana: string,
  candidateKana: string,
  words: DictionaryWord[],
): DictionaryWordReadingChange[] {
  const baselineWords = listG2pPronunciationWords(baselineKana).map(pronunciationReading);
  const candidateWords =
    dslSyntaxErrors(candidateKana).length === 0
      ? listG2pPronunciationWords(candidateKana).map(pronunciationReading)
      : undefined;

  return words.map((word) => {
    const baselineReading = baselineWords[word.word_index];
    if (baselineReading === undefined) {
      return {
        wordIndex: word.word_index,
        kind: word.kind,
        baselineReading: null,
        finalReading: null,
        status: "unevaluable",
      };
    }
    const finalReading = candidateWords?.[word.word_index];
    if (finalReading === undefined) {
      return {
        wordIndex: word.word_index,
        kind: word.kind,
        baselineReading,
        finalReading: null,
        status: "unevaluable",
      };
    }
    return {
      wordIndex: word.word_index,
      kind: word.kind,
      baselineReading,
      finalReading,
      status: baselineReading === finalReading ? "kept" : "changed",
    };
  });
}

export function summarizeDictionaryEvalRuns(runs: DictionaryEvalRunRecord[]) {
  const okRuns = runs.filter((run) => run.ok);
  const readings = okRuns.flatMap((run) => run.dictionaryWordReadings ?? []);
  const fixedReadings = readings.filter((item) => item.kind === "fixed");
  return {
    attempts: runs.length,
    ok: okRuns.length,
    errors: runs.length - okRuns.length,
    changedTrue: okRuns.filter((run) => run.changed === true).length,
    changedFalse: okRuns.filter((run) => run.changed === false).length,
    fixedAppearances: fixedReadings.length,
    fixedKept: fixedReadings.filter((item) => item.status === "kept").length,
    fixedChanged: fixedReadings.filter((item) => item.status === "changed").length,
    unevaluable: readings.filter((item) => item.status === "unevaluable").length,
    totalPromptTokens: runs.reduce((sum, run) => sum + run.usage.promptTokens, 0),
    totalCompletionTokens: runs.reduce((sum, run) => sum + run.usage.completionTokens, 0),
    totalTokens: runs.reduce((sum, run) => sum + run.usage.totalTokens, 0),
    totalCostUsd: runs.reduce((sum, run) => sum + run.usage.costUsd, 0),
    totalElapsedMs: runs.reduce((sum, run) => sum + run.elapsedMs, 0),
  };
}
