# L4G presentation website

Static Romanian website built with Astro, self-hosted variable fonts, and a small TypeScript interaction layer. All generated imagery comes from one Higgsfield **Seedance 2.5** video. The hero scrubs its timeline as visitors scroll. Posters and service stills are extracted with FFmpeg; no other generation model is used.

## Local development

```bash
cd /workspace/marketing-agency/web
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev
```

Production build and checks:

```bash
ASTRO_TELEMETRY_DISABLED=1 npm run build
npx playwright install chromium
npm test
```

In the managed cloud machine use `npm --cache /tmp/l4g-npm` if its default cache is not writable. For installed system Chromium use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`. Browser tests cover navigation, mobile widths, contact validation, reduced motion, accessibility, SEO files and actual video scrubbing.

## GitHub preview

The **L4G · Website checks & preview** Action builds and tests the site on `main` changes. When checks pass, it publishes a preview build to the `gh-pages` branch. Enable the preview once in repository **Settings → Pages → Build and deployment → Deploy from a branch → gh-pages → /(root) → Save**.

Expected preview URL after GitHub confirms deployment: `https://l4gmarketing1-glitch.github.io/marketing-agency/`. The preview carries `noindex` and production canonical URLs, so it does not compete with the eventual real domain. Preview links and media paths are rewritten for the repository subpath by `scripts/prepare-preview.mjs`.

The Action also stores `l4g-production-site`, containing the root-path production build. A production build should be deployed at the root of `https://l4g.ro`, using the supplied `dist` directory. No production DNS has been changed. Configure the hosting provider for HTTPS and verify its caching and security headers; `_headers` is supported by Netlify/Cloudflare Pages but is not applied automatically by every host.

## Content and contact

- Home: `src/pages/index.astro`
- Service content: `src/pages/servicii/[slug].astro`
- Contact: `src/pages/contact.astro`
- Shared SEO and agency schema: `src/layouts/Layout.astro`
- Styling: `src/styles/global.css`
- Scroll, navigation and form interactions: `src/scripts/site.ts`

The contact form opens a prefilled email. It **does not** send mail from a backend or claim that a message was delivered. Phone and WhatsApp links are also available. No analytics, ad pixels, external font requests or browser storage are configured. The privacy text describes this implementation; add the company's full legal identity and verify its retention/hosting details before public commercial launch.

## Media provenance and regeneration

`public/media/manifest.json` records the exact model, generation request ID and specification hash. `assets/seedance/hero.json` at repository root contains the creative direction and input schema. The media Action runs when the specification/pipeline changes, uses the existing Actions secret `HF_CREDENTIALS`, and commits optimized media. It skips an existing matching generation; repeated requests with the same specification use the same idempotency key. Changes to the specification are a **billable generation intent**. Only Seedance 2.5 is permitted by the script.

The browser fetches the lightweight poster first. The 6-second H.264 video uses frequent keyframes for seeking and is deferred until idle. Reduced-motion and Save-Data users keep the still. A visible motion toggle provides user control. There are no scroll-jacking wheel handlers.

## SEO launch checks

Production includes indexable HTML, dedicated service URLs, unique titles/descriptions, canonical tags, Open Graph, sitemap, robots.txt and agency/service/FAQ structured data. These make the site technically ready for indexing; they do not guarantee rankings or rich results.

Before launching at l4g.ro: confirm domain ownership and www/non-www redirects, legal entity details, contact routing and HTTPS; publish the production build; submit `https://l4g.ro/sitemap-index.xml` in the owner's Google Search Console. The preview deliberately remains non-indexable. No unverified addresses, reviews, client work or performance statistics are published.
