import { useSortable } from "@dnd-kit/react/sortable";
import type { PageType } from "@/_schemas";
import type { PageThumbnailProps } from "@/app/components/app-editor/editor-card/page-list/page-list-item/page-thumbnail/use-page-thumbnail";

export type PageListItemProps = {
  index: number;
  isSelected: boolean;
  onRemove: () => void;
  onSelect: () => void;
  pageId: string;
  pageType: PageType;
  thumbnail: PageThumbnailProps;
};

export function usePageListItem({
  index,
  pageId,
  thumbnail,
}: Pick<PageListItemProps, "index" | "pageId" | "thumbnail">) {
  const { ref, handleRef, isDragging } = useSortable({
    id: pageId,
    index,
    transition: {
      duration: 160,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      idle: true,
    },
  });

  return {
    ref,
    handleRef,
    isDragging,
    aspectRatio: `${thumbnail.project.meta.width} / ${thumbnail.project.meta.height}`,
  };
}
