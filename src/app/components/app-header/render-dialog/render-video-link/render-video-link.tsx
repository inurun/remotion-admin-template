import { Download } from "lucide-react";
import { buttonVariants } from "@/_shared/components/ui/button";

export function RenderVideoLink({ videoHref }: { videoHref?: string }) {
  if (!videoHref) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        aria-label="latest.mp4"
        className={buttonVariants({ variant: "secondary", size: "icon" })}
        href={videoHref}
        rel="noreferrer"
        target="_blank"
        title="latest.mp4"
      >
        <Download />
      </a>
    </div>
  );
}
