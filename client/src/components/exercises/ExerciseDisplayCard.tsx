import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

type ExerciseDisplayCardProps = {
  name: string;
  bodyPart?: string;
  target?: string;
  imageUrl?: string;
  noPreviewLabel: string;
  onClick?: () => void;
  footer?: ReactNode;
  className?: string;
};

export default function ExerciseDisplayCard({
  name,
  bodyPart,
  target,
  imageUrl,
  noPreviewLabel,
  onClick,
  footer,
  className,
}: ExerciseDisplayCardProps) {
  const cardClassName = cn(
    "w-full min-h-[445px] bg-white border-t-4 border-[#FF2625] rounded-b-[20px] text-start",
    "flex flex-col justify-between pb-3 shadow-sm transition-transform duration-300",
    onClick ? "hover:scale-[1.02]" : "",
    className
  );

  const content = (
    <>
      <div className="h-[326px] bg-[#f5f5f5] flex items-center justify-center">
        {imageUrl ? (
          isVideoUrl(imageUrl) ? (
            <video
              src={imageUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <img src={imageUrl} alt={name} loading="lazy" className="h-full w-full object-contain p-3" />
          )
        ) : (
          <div className="text-xs text-slate-500">{noPreviewLabel}</div>
        )}
      </div>

      <div className="px-5 pt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {bodyPart ? (
            <span className="rounded-full bg-[#FFA9A9] text-white text-xs px-3 py-1.5 font-medium capitalize">
              {bodyPart}
            </span>
          ) : null}
          {target ? (
            <span className="rounded-full bg-[#FCC757] text-white text-xs px-3 py-1.5 font-medium capitalize">
              {target}
            </span>
          ) : null}
        </div>

        <h3 className="text-black font-bold text-xl leading-snug capitalize line-clamp-2 min-h-[3.5rem]">
          {name}
        </h3>

        {footer}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClassName}>
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}
