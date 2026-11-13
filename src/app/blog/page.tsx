import Link from "next/link";
import { Picture } from "@/components/Picture";
import { QuoteCta } from "@/components/QuoteCta";
import { Reveal } from "@/components/Reveal";
import { formatPostDate, posts } from "@/content/blog";
import { SITE_URL, brand } from "@/content/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Blog: private-label garment manufacturing, explained",
  description:
    "Plain-English guides from a Karachi garment studio: tech packs, GSM, washes and how a private-label order runs from sample to bulk.",
  path: "/blog/",
});

const blogJsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: `${brand.name} blog`,
  url: `${SITE_URL}/blog/`,
  blogPost: posts.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    datePublished: p.date,
    url: `${SITE_URL}/blog/${p.slug}/`,
  })),
};

export default function BlogPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <section className="page-hero dark" data-nav="dark" aria-labelledby="blog-title">
        <p className="br kicker">Blog</p>
        <h1 id="blog-title" className="h-page" style={{ marginTop: 18 }}>
          Made
          <br />
          clear<span className="dot">.</span>
        </h1>
        <p className="lead">Plain-English guides for brands making their first, or next, drop: what to send, what to ask and what to expect.</p>
      </section>

      <section className="section" data-nav="light" aria-label="All posts">
        <ul className="blog-grid">
          {posts.map((p, i) => (
            <Reveal as="li" key={p.slug} delay={(i % 2) * 0.08} className="blog-item">
              <Link className="blog-card" href={`/blog/${p.slug}/`}>
                <span className="blog-media">
                  <Picture id={p.image} sizes="(max-width: 860px) 92vw, 44vw" />
                  <span className="blog-tag br">{p.tag}</span>
                </span>
                <span className="blog-meta br">
                  {formatPostDate(p.date)} &nbsp;·&nbsp; {p.readMinutes} min read
                </span>
                <h2 className="blog-title">{p.title}</h2>
                <p className="blog-sum">{p.summary}</p>
                <span className="blog-more">Read the guide →</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>

      <QuoteCta />
    </>
  );
}
