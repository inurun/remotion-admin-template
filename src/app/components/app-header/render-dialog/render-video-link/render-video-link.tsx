import { Download } from "lucide-react";
import { buttonVariants } from "@/_shared/components/ui/button";

export function RenderVideoLink({
  videoFileName,
  videoHref,
}: {
  videoFileName: string;
  videoHref?: string;
}) {
  if (!videoHref) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        aria-label={videoFileName}
        className={buttonVariants({ variant: "secondary", size: "icon" })}
        download={videoFileName}
        href={videoHref}
        rel="noreferrer"
        target="_blank"
        title={videoFileName}
      >
        <Download />
      </a>
    </div>
  );
}
