"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/format";
import { PressPlate } from "./PressPlate";

/**
 * A news image, treated as a printed plate.
 *
 * The only images the site has are `cdn-thumbnails.huggingface.co/social-thumbnails`
 * - 1 200 × 648 renders of a paper's own first page, 151 of 185 items, ~300 kB
 * each (measured 2026-10-18). They are documents, not photographs, so they are
 * cropped from the top, desaturated to ink and screened with halftone dots; at
 * rail size that reads as "a page reproduced in a page", which is the reference's
 * own visual language (docs/en/DESIGN-V3.md D6).
 *
 * Sizing is the caller's job (`className`): the box is a CSS box, and the image
 * fills it. An earlier version carried the pixel size in an inline style, which
 * silently overrode `w-full` and pushed the hero plate out of its column and into
 * the rail (measured: 720 px of image inside a 600 px track).
 *
 * Two failure paths matter and both land on the generated plate: a missing
 * `thumbnail` (34 of 185 items) and a remote image that 404s or times out. The
 * fallback is why the layout can promise no empty slot - `onError` needs a client
 * component, which is the only reason this file has `"use client"`.
 */
export function PlateImage({
  src,
  alt,
  slug,
  name,
  width,
  height,
  sizes,
  priority = false,
  className
}: {
  src?: string | null;
  alt: string;
  slug: string;
  name?: string;
  /** Intrinsic size, for the optimizer and the aspect ratio. */
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={cn("block overflow-hidden bg-raised", className)}>
        <PressPlate slug={slug} name={name} label={alt} className="h-full w-full" />
      </span>
    );
  }

  return (
    <span className={cn("halftone-screen relative block overflow-hidden bg-raised", className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        className="halftone h-full w-full object-cover object-top"
      />
    </span>
  );
}
