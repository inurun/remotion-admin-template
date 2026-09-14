import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ameKoroAnalyzeItem } from "@/_schemas/__tests__/g2p-fixture";
import {
  DICTIONARY_PROVENANCE_EVAL_RUNS,
  dictionaryWordReadingChanges,
  EMPTY_EVAL_USAGE,
  finalKana,
  summarizeDictionaryEvalRuns,
  type DictionaryEvalRunRecord,
  type EvalUsage,
} from "../dictionary-provenance-eval";
import { AUTOMATIC_LLM_G2P_PROFILE } from "../llm-g2p-profile";
import { requestOpenRouterCorrections, type OpenRouterUsage } from "../openrouter";

const hasKey = Boolean(process.env.OPENROUTER_API_KEY?.trim());
const evalEnabled = process.env.LLM_G2P_DICTIONARY_EVAL === "1";
const dictionaryWords = ameKoroAnalyzeItem.dictionary_words ?? [];
const evalTimeoutMs =
  DICTIONARY_PROVENANCE_EVAL_RUNS * 2 * (AUTOMATIC_LLM_G2P_PROFILE.timeoutMs + 10_000);

const promptItem = {
  id: "tts-amekoro",
  text: ameKoroAnalyzeItem.text,
  readText: ameKoroAnalyzeItem.text,
  kana: ameKoroAnalyzeItem.kana,
};

const pages = [
  {
    id: "page-1",
    title: "Eval",
    utterances: [
      {
        id: "tts-amekoro",
        text: ameKoroAnalyzeItem.text,
        readText: ameKoroAnalyzeItem.text,
        baselineKana: ameKoroAnalyzeItem.kana,
        target: true,
      },
    ],
  },
];

function toEvalUsage(usage: OpenRouterUsage | undefined): EvalUsage {
  return usage ?? EMPTY_EVAL_USAGE;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

async function runCondition(withProvenance: boolean): Promise<DictionaryEvalRunRecord> {
  const startedAt = performance.now();
  try {
    const result = await requestOpenRouterCorrections(
      { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY },
      withProvenance ? [{ ...promptItem, dictionaryWords }] : [promptItem],
      {
        profile: AUTOMATIC_LLM_G2P_PROFILE,
        userContent: {
          pages: withProvenance
            ? [
                {
                  ...pages[0],
                  utterances: [{ ...pages[0]!.utterances[0]!, dictionaryWords }],
                },
              ]
            : pages,
        },
      },
    );
    const correction = result.corrections[0];
    const candidateKana = finalKana(ameKoroAnalyzeItem.kana, correction);
    return {
      index: 0,
      ok: true,
      changed: correction?.changed,
      correctionKana: correction?.kana,
      finalKana: candidateKana,
      reason: correction?.reason,
      elapsedMs: Math.round(performance.now() - startedAt),
      usage: toEvalUsage(result.usage),
      dictionaryWordReadings: dictionaryWordReadingChanges(
        ameKoroAnalyzeItem.kana,
        candidateKana,
        dictionaryWords,
      ),
    };
  } catch (error) {
    return {
      index: 0,
      ok: false,
      elapsedMs: Math.round(performance.now() - startedAt),
      usage: EMPTY_EVAL_USAGE,
      error: serializeError(error),
    };
  }
}

describe.skipIf(!hasKey || !evalEnabled)("OpenRouter G2P dictionary provenance eval", () => {
  it(
    "records 雨衣 readings with and without dictionaryWords",
    async () => {
      const startedAt = new Date().toISOString();
      const runId = randomUUID();
      const withoutProvenance: DictionaryEvalRunRecord[] = [];
      const withProvenance: DictionaryEvalRunRecord[] = [];

      for (let index = 1; index <= DICTIONARY_PROVENANCE_EVAL_RUNS; index += 1) {
        const [withoutRun, withRun] = await Promise.all([runCondition(false), runCondition(true)]);
        withoutProvenance.push({ ...withoutRun, index });
        withProvenance.push({ ...withRun, index });
      }

      const report = {
        status: "completed",
        mode: "eval",
        profileId: AUTOMATIC_LLM_G2P_PROFILE.id,
        model: AUTOMATIC_LLM_G2P_PROFILE.model,
        runId,
        startedAt,
        runs: DICTIONARY_PROVENANCE_EVAL_RUNS,
        input: {
          id: promptItem.id,
          text: ameKoroAnalyzeItem.text,
          baselineKana: ameKoroAnalyzeItem.kana,
          dictionaryWords,
        },
        conditions: {
          withoutProvenance: {
            runs: withoutProvenance,
            summary: summarizeDictionaryEvalRuns(withoutProvenance),
          },
          withProvenance: {
            runs: withProvenance,
            summary: summarizeDictionaryEvalRuns(withProvenance),
          },
        },
      };
      const logFile = path.join(
        ".logs",
        "llm-g2p",
        "eval",
        `${startedAt.replaceAll(":", "-").replaceAll(".", "-")}-${runId}.json`,
      );
      const absolutePath = path.join(process.cwd(), logFile);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(
        absolutePath,
        `${JSON.stringify({ ...report, logFile }, null, 2)}\n`,
        "utf8",
      );

      expect(withoutProvenance).toHaveLength(DICTIONARY_PROVENANCE_EVAL_RUNS);
      expect(withProvenance).toHaveLength(DICTIONARY_PROVENANCE_EVAL_RUNS);
      expect(report.conditions.withoutProvenance.summary.attempts).toBe(
        DICTIONARY_PROVENANCE_EVAL_RUNS,
      );
      expect(report.conditions.withProvenance.summary.attempts).toBe(
        DICTIONARY_PROVENANCE_EVAL_RUNS,
      );
      for (const run of [...withoutProvenance, ...withProvenance]) {
        if (!run.ok) {
          continue;
        }
        expect(typeof run.finalKana).toBe("string");
        expect(run.dictionaryWordReadings?.length).toBeGreaterThan(0);
      }
    },
    evalTimeoutMs,
  );
});
