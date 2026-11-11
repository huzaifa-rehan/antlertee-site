# Antlertee Creative Studios website

Production site for Antlertee Creative Studios (private-label streetwear manufacturer, Karachi). Next.js App Router, static export, so the `out/` folder can be hosted anywhere.

## Run
```sh
npm install
npm run dev        # http://127.0.0.1:5192 (one dev server at a time: this machine runs low on memory)
npm run check      # typecheck + lint + static build
npm run build      # writes the static site to out/
npm start          # serves out/ on http://127.0.0.1:5192
npm run images     # rebuilds optimised WebP images (scripts/build-images.mjs)
```

## Stack
Next.js (static export), TypeScript, Tailwind CSS, motion (Framer Motion) for UI and the rack-to-product shared-element transition, GSAP + ScrollTrigger for pinned scroll scenes, Lenis for smooth scroll, three + @react-three/fiber + drei for the 3D hero. Versions are pinned in `package.json`.

## Where things live
- `src/content/site.ts`: business facts, contact details and every **unconfirmed figure** (marked `TODO confirm with client`).
- `src/content/products.ts`: the 23 products on the rack (copy written from the Instagram captions).
- `src/content/copy.ts`: page copy (statement, about, process, FAQs).
- `src/content/images.ts`: the **image manifest**. All images are placeholders taken from Instagram reel covers (some with baked-in text); swap the files in `public/img/` after the product shoot and update this manifest.
- `src/content/credits.ts`: model and asset credits.
- `src/components/product/`: the products wardrobe. `Wardrobe.tsx` (cabinet, compartments, hooks; wood is CSS only), `Rack.tsx` (category tabs, open/close and the shared-element flight), `ProductView.tsx` (the product dialog), `TurnStage.tsx` (drag to turn), `RailScroller.tsx` (swipeable rails), `ProductDetails.tsx` (info column shared with `/products/[slug]/`).
- `src/components/process/YarnToPack.tsx`: the home hero's auto-playing "Yarn to pack." loop (2D SVG, time-based, pause/play, pauses offscreen, static under reduced motion). Styles in `process.css`.
- `src/components/techpack/` + `src/content/techpack.ts`: the tech pack section, which is the /process/ hero (`#tech-pack`, `#build-tech-pack`, `#send-tech-pack`): an 8-step builder saved in localStorage, a printable A4 sheet (print CSS in `techpack.css`), and "send your own" hand-off. Output goes out via WhatsApp / email; nothing is uploaded. Hero layout styles are in `hero.css`.
  - The hero hoodie: `TechPackSection.tsx` makes the hero a tall zone with a one-screen CSS-sticky pin inside it. `ProcessHoodie.tsx` turns the zone's scroll position into `heroProgress` (0 to 0.84), which drives the home hero's 3D scene (`hero/HeroCanvas.tsx`): the hoodie goes from a transparent ghost, through cut and stitch, to the grey acid wash. It falls back to the 2D drawing (`hero/HeroSvg.tsx`) on low-end devices, and shows the finished garment with no pin under reduced motion. `?hero=3d|svg|static` forces a variant for QA.
- `src/content/blog.ts` + `src/app/blog/`: the blog. Posts are plain data (paragraphs, headings, lists), rendered as static pages at `/blog/` and `/blog/<slug>/`, listed in the sitemap. Add a post by adding an entry to `posts`.
- `src/components/hero/`: the hero. `HeroCanvas.tsx` is the R3F scene, `HeroSvg.tsx` the 2D fallback (reduced motion, no WebGL, low-end devices), `store.ts` the shared scroll progress.
- `public/models/hoodie.glb`: the 3D hoodie (1.6 MB, meshopt-compressed; two meshes: garment + stitches).
- `public/brand/`: logo cut from the client's artwork (`MARKETING/Antlertee/Untitled Design (7).png`): `logo-lockup-mask.png` (stag + wordmark, used as a CSS mask so it takes the nav/footer colour), `logo-full-ink.png` (loader), `logo-full-white.png` (the woven brand label in hero step 4). `src/app/icon.png` / `apple-icon.png` are the app icons.
- Product photos: Instagram thumbnails plus higher-res unbranded photos from the client's Drive folder "ACS CONTENT" (`RESEARCH/drive-photos-web/`). Client-branded pieces (Prophetic Living, Just Sunnah It, team jerseys, etc.) are deliberately left off until permission is given.

## The scroll hero ("Yarn to pack.", now the Process page hoodie)
A pinned, scroll-scrubbed scene in four phases matching the side labels:
1. Pattern & cut: a ghostly hoodie turns slowly.
2. Stitch: plain greige fabric materialises behind a glowing yellow thread front and the stitching sews in.
3. Wash: the garment dyes to the real black textures with the flame print.
4. Print & brand: a hero turn and a "YOUR BRAND." label.
The 3D code loads only where it is used (dynamic import, no SSR). On /process/ the timeline stops at the end of the wash phase. Pinned sections on the home page (`Orbit`, `WorkGallery`) sit inside a `.pin-host` wrapper so React can unmount them cleanly after GSAP wraps them in a pin-spacer.

## Facts to confirm with the client (see `src/content/site.ts`)
500+ brands / 6 years, founding year, export markets (USA, UK, Canada, Kuwait), standard MOQ (50–100 per colour/design), 30-pc MOQ on the heat-reactive puffer, 3–4 week turnaround, pre-order delivery times, "500 pcs 450+ GSM hoodies to the USA", which clients may be named (none are shown on the site), and the domain (`NEXT_PUBLIC_SITE_URL` at build time).

## Credits
3D model: "Classic Black Flame Hoodie" by klir (sketchfab.com/krrril_), licensed CC BY 4.0, optimised for the web. Credited in the footer and on /credits; keep that credit if the model is used.

## Not done yet
- Real product photography (cut-outs, 360° turntable shots for drag-to-turn).
- Logo vector files (the site uses a text wordmark).
- A custom domain (the site is live on antlertee-site.vercel.app); the quote form opens WhatsApp or email (no backend).
