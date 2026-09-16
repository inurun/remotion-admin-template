import type { NiconicoComment } from "@/_schemas/project/comments";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import { fetchNiconicoComments } from "@/app/features/comments";
import {
  headerCheckboxState,
  insertedCommentIds,
  nextFetchSelection,
  tryParseNiconicoVideoId,
} from "@/app/features/comments";
import { useCallback, useMemo, useRef, useState } from "react";
import { overlayCommentHidden } from "./comment-import.lib";

export function useCommentImport(page: CommentsPageFormValues | null, open: boolean) {
  const generation = useRef(0);
  const [source, setSource] = useState("");
  const [comments, setComments] = useState<NiconicoComment[]>([]);
  const [fetchedVideoId, setFetchedVideoId] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previousCommentIds, setPreviousCommentIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hadSuccessfulFetch, setHadSuccessfulFetch] = useState(false);

  const resetFromPage = useCallback((nextPage: CommentsPageFormValues | null) => {
    generation.current += 1;
    setSource(nextPage?.meta.niconico?.videoId ?? "");
    setComments(nextPage?.comments ?? []);
    setFetchedVideoId(nextPage?.meta.niconico?.videoId ?? null);
    setFetchedAt(nextPage?.meta.niconico?.fetchedAt ?? null);
    setSelectedIds(new Set());
    setPreviousCommentIds(new Set((nextPage?.comments ?? []).map((comment) => comment.id)));
    setPending(false);
    setError(null);
    setHadSuccessfulFetch(false);
  }, []);

  const parsedVideoId = tryParseNiconicoVideoId(source);
  const fetchValid = parsedVideoId !== null && parsedVideoId === fetchedVideoId;
  const inserted = useMemo(() => (page ? insertedCommentIds(page) : new Set<string>()), [page]);
  const uninserted = useMemo(
    () => comments.filter((comment) => !inserted.has(comment.id)),
    [comments, inserted],
  );
  const insertable = useMemo(() => uninserted.filter((comment) => !comment.hidden), [uninserted]);
  const checkboxState = headerCheckboxState(
    insertable.length,
    insertable.filter((comment) => selectedIds.has(comment.id)).length,
  );

  const fetchComments = useCallback(async () => {
    const videoId = tryParseNiconicoVideoId(source);
    if (!videoId) {
      setError("Video URL / ID is required");
      return;
    }
    const requestId = generation.current + 1;
    generation.current = requestId;
    setPending(true);
    setError(null);
    try {
      const result = await fetchNiconicoComments(source.trim());
      if (generation.current !== requestId || !page) {
        return;
      }
      const currentVideoId = tryParseNiconicoVideoId(source);
      if (currentVideoId !== result.videoId) {
        return;
      }
      const nextComments = overlayCommentHidden(result.comments, [page.comments, comments]);
      const nextSelected = nextFetchSelection({
        isFirstFetch: !hadSuccessfulFetch,
        previousSelected: selectedIds,
        previousCommentIds,
        nextComments,
        insertedIds: inserted,
      });
      setComments(nextComments);
      setFetchedVideoId(result.videoId);
      setFetchedAt(result.fetchedAt);
      setSelectedIds(nextSelected);
      setPreviousCommentIds(new Set(result.comments.map((comment) => comment.id)));
      setHadSuccessfulFetch(true);
    } catch (fetchError) {
      if (generation.current !== requestId) {
        return;
      }
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch comments");
    } finally {
      if (generation.current === requestId) {
        setPending(false);
      }
    }
  }, [comments, hadSuccessfulFetch, inserted, page, previousCommentIds, selectedIds, source]);

  const toggleAll = useCallback(() => {
    const ids = insertable.map((comment) => comment.id);
    if (ids.length === 0) {
      return;
    }
    const next = new Set(selectedIds);
    const allOn = ids.every((id) => next.has(id));
    if (allOn) {
      for (const id of ids) {
        next.delete(id);
      }
    } else {
      for (const id of ids) {
        next.add(id);
      }
    }
    setSelectedIds(next);
  }, [insertable, selectedIds]);

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const setHidden = useCallback((id: string, hidden: boolean) => {
    setComments((current) =>
      current.map((comment) => (comment.id === id ? { ...comment, hidden } : comment)),
    );
    if (hidden) {
      setSelectedIds((current) => {
        if (!current.has(id)) {
          return current;
        }
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, []);

  return {
    open,
    source,
    setSource,
    comments,
    uninserted,
    insertable,
    selectedIds,
    checkboxState,
    pending,
    error,
    fetchValid,
    parsedVideoId,
    fetchedAt: fetchValid ? fetchedAt : null,
    snapshot: fetchValid ? comments : null,
    fetchComments,
    toggleAll,
    toggleOne,
    setHidden,
    resetFromPage,
    selectedInsertIds: insertable
      .filter((comment) => selectedIds.has(comment.id))
      .map((comment) => comment.id),
  };
}
