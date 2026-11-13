import Link from "next/link";
import { notFound } from "next/navigation";
import { Picture } from "@/components/Picture";
import { QuoteCta } from "@/components/QuoteCta";
import { formatPostDate, getPost, posts, type Block } from "@/content/blog";
import { getImage } from "@/content/images";
import { SITE_URL, brand } from "@/content/site";
import { pageMeta } from "@/lib/meta";

interface Params {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const img = getImage(post.image);
  return pageMeta({
    title: post.title,
    description: post.summary,
    path: `/blog/${post.slug}/`,
    image: { url: `/img/${img.id}-${img.widths.at(-1)}.webp`, width: img.width, height: img.height, alt: img.alt },
  });
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2 key={i} className="post-h2">
          {block.text}
        </h2>
      );
    case "ul":
      return (
        <ul key={i} className="post-list">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "note":
      return (
        <p key={i} className="post-note">
          {block.text}
        </p>
      );
    default:
      return <p key={i}>{block.text}</p>;
  }
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 2);
  const img = getImage(post.image);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    image: `${SITE_URL}/img/${img.id}-${img.widths.at(-1)}.webp`,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}/`,
    author: { "@type": "Organization", name: brand.name },
    publisher: { "@type": "Organization", name: brand.name },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article aria-labelledby="post-title">
        <header className="page-hero dark post-hero" data-nav="dark">
          <p className="br kicker">
            <Link href="/blog/">Blog</Link> &nbsp;/&nbsp; {post.tag}
          </p>
          <h1 id="post-title" className="h-page post-title">
            {post.title}
          </h1>
          <p className="lead">{post.summary}</p>
          <p className="br kicker post-byline">
            {formatPostDate(post.date)} &nbsp;·&nbsp; {post.readMinutes} min read
          </p>
        </header>

        <div className="post-body-wrap" data-nav="light">
          <figure className="post-cover">
            <Picture id={post.image} sizes="(max-width: 860px) 92vw, 900px" priority />
          </figure>
          <div className="post-body prose-lg">{post.body.map(renderBlock)}</div>
        </div>
      </article>

      <section className="section post-more" data-nav="light" aria-labelledby="more-title">
        <h2 id="more-title" className="br kicker">
          Keep reading
        </h2>
        <ul className="blog-grid" style={{ marginTop: 28 }}>
          {more.map((p) => (
            <li key={p.slug} className="blog-item">
              <Link className="blog-card" href={`/blog/${p.slug}/`}>
                <span className="blog-media">
                  <Picture id={p.image} sizes="(max-width: 860px) 92vw, 44vw" />
                  <span className="blog-tag br">{p.tag}</span>
                </span>
                <span className="blog-meta br">
                  {formatPostDate(p.date)} &nbsp;·&nbsp; {p.readMinutes} min read
                </span>
                <h3 className="blog-title">{p.title}</h3>
                <span className="blog-more">Read the guide →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <QuoteCta />
    </>
  );
}
