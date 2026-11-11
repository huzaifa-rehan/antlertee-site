"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";

/**
 * Accessible accordion: each question is a button (aria-expanded / aria-controls) inside a heading,
 * the answer is a labelled region. Several can be open at once.
 */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const base = useId();
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <ul className="faq">
      {items.map((item, i) => {
        const expanded = open.has(i);
        const btnId = `${base}-q${i}`;
        const panelId = `${base}-a${i}`;
        return (
          <li key={item.q}>
            <h3>
              <button id={btnId} type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => toggle(i)}>
                <span>{item.q}</span>
                <span className="sign" aria-hidden="true" />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className="answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <p>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
