import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/** 404: an ink screen with the message, a yellow strip with the three ways back. */
export default function NotFound() {
  return (
    <section className="nf fit-bands" data-snap="fit" aria-labelledby="nf-title">
      <div className="band band-ink band-main nf-main" data-nav="dark">
        <p className="br kicker">Error 404 &nbsp;·&nbsp; Off the rack</p>
        <h1 id="nf-title" className="h-page" style={{ marginTop: 18 }}>
          Dropped
          <br />a stitch<span className="dot">.</span>
        </h1>
        <p className="lead">This page isn&apos;t on our floor. It may have moved, or the link has a typo.</p>
      </div>
      <div className="band band-yellow band-foot nf-foot" data-nav="yellow">
        <Link className="pill inked lg" href="/">
          Take me home
        </Link>
        <Link className="pill lg" href="/products/">
          Show me the rack
        </Link>
        <Link className="pill lg" href="/contact/">
          Get my price
        </Link>
      </div>
    </section>
  );
}
