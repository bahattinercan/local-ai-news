import type { ReactNode } from "react";

/**
 * Every route's opening line (docs/en/DESIGN-V3.md §7.2).
 *
 * One shape for all of them: a 3 px ink rule, an optional kicker, the route's
 * `h1` set in the display face, and one sentence. The nameplate above already
 * carries the site's display size, so this is a *strap line* — 24 px, not 38 —
 * and the rule is what makes it read as a section head rather than a heading
 * floating on a page.
 *
 * `kicker` is rendered as a label so a route can say which desk it is without
 * repeating itself in the h1.
 */
export function PageHeader({
  title,
  lede,
  kicker,
  aside
}: {
  title: string;
  lede?: string;
  kicker?: string;
  /** Right-hand slot: a count, a filter, a link. */
  aside?: ReactNode;
}) {
  return (
    <div className="rule-strong mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-2">
      <div className="min-w-0">
        {kicker ? <p className="label text-accent">{kicker}</p> : null}
        <h1 className="font-display text-xl font-bold tracking-tight text-balance sm:text-2xl">{title}</h1>
        {lede ? <p className="mt-1 max-w-3xl text-sm text-muted">{lede}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
