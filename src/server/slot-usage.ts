// Where each image slot appears on the site, for the admin media grid. Derived from the content files.
import { posts } from "@/content/blog";
import { hardGarments, spotify } from "@/content/clients";
import { about, collections, gallery, steps } from "@/content/copy";
import { products } from "@/content/products";

export function slotUsage(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const add = (id: string, where: string) => {
    const list = map.get(id) ?? [];
    if (!list.includes(where)) list.push(where);
    map.set(id, list);
  };
  for (const g of gallery) add(g.image, `Home gallery: ${g.title}`);
  for (const c of collections) add(c.image, `Home collections: ${c.t1} ${c.t2}`);
  for (const s of spotify.images) add(s.id, `Home client work: ${spotify.title}`);
  for (const p of hardGarments.pieces) add(p.id, `Home client work: ${p.title}`);
  for (const s of steps) add(s.image, `Process: ${s.title}`);
  for (const f of about.factory.images) add(f.image, `About: ${f.caption}`);
  for (const p of products) add(p.image, `Product: ${p.name}`);
  for (const p of posts) add(p.image, `Blog: ${p.title}`);
  return map;
}
