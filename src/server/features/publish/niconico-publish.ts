export type VerifiedPublishPrepResult = {
  url: string;
  title: string;
  finalResponse: string;
  videoPath?: string;
  reachedConfirmation: boolean;
  finalSubmitClicked: boolean;
  actualVideoTitle: string;
  actualThumbnailTime: string;
  registeredParentWorkIds: string[];
};

export type PublishPrepExpectation = {
  videoPath: string;
  videoTitle: string;
  thumbnailTime: string;
  parentWorkIds: string[];
};

const NICONICO_CONFIRMATION_PATH = /^\/niconico-garage\/video\/videos\/\d+\/?$/;

export function normalizeLogMessage(message: string, maxLength = 4000): string {
  const normalized = message
    .replace(/\r\n?/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function validatePublishPrepResult(
  result: VerifiedPublishPrepResult,
  expected: PublishPrepExpectation,
): string[] {
  const errors: string[] = [];
  let resultUrl: URL | undefined;
  try {
    resultUrl = new URL(result.url);
  } catch {
    errors.push("result URL is invalid");
  }

  if (
    resultUrl &&
    (resultUrl.protocol !== "https:" ||
      resultUrl.hostname !== "garage.nicovideo.jp" ||
      !NICONICO_CONFIRMATION_PATH.test(resultUrl.pathname))
  ) {
    errors.push("result URL is not a Niconico video edit URL");
  }
  if (!result.reachedConfirmation) {
    errors.push("confirmation screen was not reached");
  }
  if (result.finalSubmitClicked) {
    errors.push("final submit button was clicked");
  }
  if (result.actualVideoTitle !== expected.videoTitle) {
    errors.push("video title does not match");
  }
  if (result.actualThumbnailTime !== expected.thumbnailTime) {
    errors.push("thumbnail time does not match");
  }
  if (result.videoPath !== expected.videoPath) {
    errors.push("video path does not match");
  }

  const actualParentWorkIds = [...new Set(result.registeredParentWorkIds)].sort();
  const expectedParentWorkIds = [...new Set(expected.parentWorkIds)].sort();
  if (
    actualParentWorkIds.length !== expectedParentWorkIds.length ||
    actualParentWorkIds.some((id, index) => id !== expectedParentWorkIds[index])
  ) {
    errors.push("registered parent works do not match");
  }

  return errors;
}
