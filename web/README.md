# L4G presentation website

Static Romanian website built with Astro, self-hosted variable fonts, and a small TypeScript interaction layer. The current creative-studio design uses native CSS 3D geometry: campaign boards, a dimensional frame, web layouts and brand materials. Scroll moves the camera through three narrative chapters. It requires no video, external renderer, API credentials or runtime generation. The user explicitly chose to continue without video while Higgsfield API credits are unavailable. Only Higgsfield **Seedance 2.5** is permitted for future generated media.

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

In the managed cloud machine use `npm --cache /tmp/l4g-npm` if its default cache is not writable. For installed system Chromium use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`. Browser tests cover navigation, mobile widths, contact validation, reduced motion, accessibility, SEO files and the active hero (CSS camera movement, or real video scrubbing when a complete Seedance asset set is present).

## GitHub preview

The **L4G · Website checks & preview** Action builds and tests the site on `main` changes. To publish a preview, first set repository **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then open **Actions → L4G · Website checks & preview → Run workflow → main → Run workflow**. The manual run validates the site and publishes it through the official GitHub Pages deployment actions. This does not generate new media or consume Higgsfield credits. Automatic push/PR runs execute checks only; publish each approved update with a manual run. The earlier `gh-pages` branch is retained as a snapshot and is no longer the deployment mechanism.

Expected preview URL after GitHub confirms deployment: `https://l4gmarketing1-glitch.github.io/marketing-agency/`. The preview carries `noindex` and production canonical URLs, so it does not compete with the eventual real domain. Preview links and media paths are rewritten for the repository subpath by `scripts/prepare-preview.mjs`.

The Action also stores `l4g-production-site`, containing the root-path production build. A production build should be deployed at the root of `https://l4g.ro`, using the supplied `dist` directory. No production DNS has been changed. Configure the hosting provider for HTTPS and verify its caching and security headers; `_headers` is supported by Netlify/Cloudflare Pages but is not applied automatically by every host.

## Content and contact

- Home: `src/pages/index.astro`
- Service content: `src/pages/servicii/[slug].astro`
- Contact: `src/pages/contact.astro`
- Shared SEO and agency schema: `src/layouts/Layout.astro`
- Styling: `src/styles/global.css` and `src/styles/studio.css`
- Native 3D scene: `src/components/StudioScene.astro`
- Scroll, navigation and form interactions: `src/scripts/site.ts`

The contact form opens a prefilled email. It **does not** send mail from a backend or claim that a message was delivered. Phone and WhatsApp links are also available. No analytics, ad pixels, external font requests or browser storage are configured. The privacy text describes this implementation; add the company's full legal identity and verify its retention/hosting details before public commercial launch.

## Media provenance and regeneration

The old chrome concept remains archived in `public/media/`; the redesigned pages do not load it. No client projects or performance results are implied by the conceptual campaign graphics. `public/studio-social.png` is a browser capture of our own HTML/CSS scene, not AI-generated imagery.

The planned cinematic specification is `assets/seedance/studio.json` at repository root. Its generation failed because the Higgsfield API balance was insufficient; sanitized diagnostics are in `public/media/studio/generation-status.json`. The API key itself worked. The working Actions secret remains `HF_CREDENTIALS`.

To generate the new clip **after funding the API account and intentionally authorizing another paid attempt**: open **Actions → L4G · Creative studio — Seedance 2.5 → Run workflow**, choose `main`, and enable `retry_failed`. Leave it disabled to resume/check the recorded job without starting another attempt. Re-running the same Action retains its attempt identifier. The generator persists the request ID before waiting, reuses idempotency keys, and skips a matching completed asset set. It permits only `bytedance/seedance-2.5/text-to-video`.

A complete generated set in `public/media/studio/` automatically enables the video and extracted stills at the next website build. `src/lib/studio-media.ts` requires all files, preventing partial generations from causing broken images. Inspect the resulting art direction before publishing it. While the native studio is active, its interaction is tested; paid-video validation is not claimed. Reduced-motion visitors receive a stationary scene, and the motion button can stop all animation. There are no wheel handlers that hijack scrolling. For future video, the poster is prioritized and video is deferred until idle; reduced-motion and Save-Data users retain the poster.

## SEO launch checks

Production includes indexable HTML, dedicated service URLs, unique titles/descriptions, canonical tags, Open Graph, sitemap, robots.txt and agency/service/FAQ structured data. These make the site technically ready for indexing; they do not guarantee rankings or rich results.

Before launching at l4g.ro: confirm domain ownership and www/non-www redirects, legal entity details, contact routing and HTTPS; publish the production build; submit `https://l4g.ro/sitemap-index.xml` in the owner's Google Search Console. The preview deliberately remains non-indexable. No unverified addresses, reviews, client work or performance statistics are published.
