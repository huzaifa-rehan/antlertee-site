import { Fragment } from "react";

/** Star marquee band. Decorative (the same facts appear elsewhere as text), so hidden from screen readers. */
export function Marquee({ items }: { items: readonly string[] }) {
  const row = (
    <span>
      {items.map((t) => (
        <Fragment key={t}>
          <span>{t}</span>
          <span>✶</span>
        </Fragment>
      ))}
    </span>
  );
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}
