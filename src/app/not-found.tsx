import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section
      className="page-hero dark"
      data-nav="dark"
      aria-labelledby="nf-title"
      style={{ minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "center" }}
    >
      <p className="br kicker">Error 404 &nbsp;·&nbsp; Off the rack</p>
      <h1 id="nf-title" className="h-page" style={{ marginTop: 18 }}>
        Dropped
        <br />a stitch<span className="dot">.</span>
      </h1>
      <p className="lead">This page isn&apos;t on our floor. It may have moved, or the link has a typo.</p>
      <div className="on-dark mt-10 flex flex-wrap gap-3">
        <Link className="pill solid lg" href="/">
          Back to home
        </Link>
        <Link className="pill lg" href="/products/">
          Browse the rack
        </Link>
        <Link className="pill lg" href="/contact/">
          Get a quote
        </Link>
      </div>
    </section>
  );
}
