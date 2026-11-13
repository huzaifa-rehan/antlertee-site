# Go live: leads inbox, uploads and media admin

These are the steps the **owner** does once, in the Vercel dashboard and on this computer. Nothing here has been done for you: no database, store, env var or deploy exists yet. Until these steps are done, the live site keeps working as before, except "Send to Antlertee" shows "This service is not set up yet" and points visitors to WhatsApp / email.

Project: Vercel project **antlertee-site**.

## 1. Database: Neon Postgres
1. Vercel dashboard → antlertee-site → **Storage** (or Marketplace) → **Neon** → Create / Connect a database. Pick a region close to the visitors and the functions (the same region as the project's functions).
2. Connect it to the project for **Production** (and Preview if you want previews to work). Vercel adds `DATABASE_URL` and a few other variables automatically. The site only reads `DATABASE_URL`.

## 2. Files: two Vercel Blob stores
The site uses two stores on purpose: customer files are **private**, site images are **public**.

1. Storage → **Blob** → Create store, access **Public**, name e.g. `antlertee-media`. Connect it to the project. Its read-write token must be in the variable **`BLOB_READ_WRITE_TOKEN`** (the default name when connecting).
2. Storage → **Blob** → Create store, access **Private**, name e.g. `antlertee-leads`. Connect it to the project with the environment variable **prefix `LEADS`**, so its token lands in **`LEADS_BLOB_READ_WRITE_TOKEN`**. If the dashboard names it differently, open the store's settings, copy its read-write token and add it yourself under Settings → Environment Variables as `LEADS_BLOB_READ_WRITE_TOKEN` (Production, mark it Sensitive).
3. Check in Settings → Environment Variables that `BLOB_READ_WRITE_TOKEN` belongs to the public store and `LEADS_BLOB_READ_WRITE_TOKEN` to the private one. Swapping them would make customer files public.

## 3. Admin password and session secret
On this computer, in the site folder:
```sh
npm run admin:hash          # type a password of at least 12 characters; it prints scrypt:...
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # a random SESSION_SECRET
```
In Vercel → Settings → Environment Variables (Production, Sensitive) add:
- `ADMIN_PASSWORD_HASH` = the `scrypt:...` line
- `SESSION_SECRET` = the random string

Keep the password in your password manager. Changing `ADMIN_PASSWORD_HASH` or `SESSION_SECRET` later logs every admin session out.

Optional: `NEXT_PUBLIC_SITE_URL` (your domain, e.g. `https://antlertee.com`) and `IP_HASH_SALT`.

## 4. Create the tables (migrations)
On this computer, in the site folder, with the production `DATABASE_URL`:
```sh
# Either pull the env vars from Vercel (needs the Vercel CLI and a login):
vercel env pull .env.local --environment=production
# or paste DATABASE_URL=... into .env.local yourself. Then:
npm run db:migrate
```
It prints `applied 001_init.sql` the first time and `skip` after that (safe to run again). Delete `.env.local` afterwards if you pulled production secrets into it, or keep it out of anything you share (it is gitignored).

Do this **before** the first deploy: the build reads the image replacements table.

## 5. Deploy
Push / merge to the branch Vercel deploys, or press **Redeploy** in the dashboard, so the new variables take effect.

## 6. Test on the live site
1. Open `/process/`, "Send your own tech pack": fill in the form, add a small PDF and a photo, press **Send to Antlertee**. You should see "Sent." with a reference like `ACS-3F9A21`.
2. Open `/admin/` → log in → the lead is at the top with a "new" mark. Open it: details, files (View / Download work), mark it done.
3. Open `/contact/`, send a quote without files. It appears in the inbox.
4. Admin → **Site images** → Replace one image with a JPG → open the home page in a private window: the new image shows within a few seconds. Press **Reset** to bring back the original.
5. Admin → **Library** → upload a short MP4 → it plays in the preview.
6. Log out, then open `/admin/leads/` again: you must land on the login page.
7. Delete the test leads (Delete on each lead also deletes its files).

## Good to know
- Leads are only visible in the admin inbox: there are no email or WhatsApp notifications, so check `/admin/` regularly.
- Limits: 5 leads per hour per connection, 8 files per lead, 25 MB per file, 60 MB per lead. Admin login locks for 15 minutes after 8 wrong passwords from one connection.
- Uploads that never became a lead (a visitor uploaded files and closed the page) stay in the private store under `leads/incoming/`. They are not linked anywhere. A cleanup job is planned for a later update.
- Costs: Neon and Blob both have free tiers; heavy video use in the Library counts towards Blob storage and transfer.
