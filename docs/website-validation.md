# L4G creative-studio redesign — validation

Validated 10 October 2026. These results supersede the earlier chrome/green design.

- Production build: 7 static HTML pages.
- Chromium browser suite: **9 passed**. Desktop/mobile navigation, contact form validation, reduced motion, no horizontal overflow at 360/768/1440px, accessible service/contact/home content, SEO files, CSS camera movement, scroll chapters, keyboard operation of the connected-services section, and motion controls.
- Python integration suite: **14 passed**. No live paid API calls in this suite.
- GitHub workflow syntax: actionlint passed.
- Lighthouse mobile simulation on the local production server: **99 Performance / 100 Accessibility / 100 Best Practices / 100 SEO**. LCP **1.7 s**, CLS **0.001**, total blocking time **0 ms**, transferred **106 KiB**. These are lab results for the current CSS scene, not production field measurements or ranking guarantees.
- GitHub Pages subpath preview checked locally: styles/fonts, navigation, interactive service destinations, contact and noindex metadata; no HTTP or JavaScript errors.
- Visual captures: `docs/l4g-hero.png`, `docs/l4g-desktop.png`, `docs/l4g-mobile.png`. Full-page captures use reduced motion to expose all content without sticky overlap.

## Current media status

The user explicitly chose to continue **without video generation** after Higgsfield returned insufficient API credit balance. The current site renders a lightweight native CSS 3D studio, with no generated video, no WebGL dependency and no paid calls from the browser. Its campaign graphics are concepts, not client projects. The social image is a browser screenshot of that scene. No alternative AI model was used.

The new Seedance prompt and workflow are prepared. The failed request and sanitized provider error are recorded in `web/public/media/studio/`. The prior chrome assets remain archived under `web/public/media/` and are no longer loaded by the site. A complete new studio media set will enable video at build time; its appearance and real video scrubbing must be validated before publication. Current validation does **not** claim that the new Seedance video succeeded.

## Publication

Source changes alone do not update GitHub Pages. Run **L4G · Website checks & preview** manually on `main` to validate and deploy the current preview. Repository Pages Source must be **GitHub Actions**. A green push run means checks passed; its preview job is intentionally skipped.

No production domain or DNS changes were made. Before a commercial launch at l4g.ro, verify hosting, legal entity details and Search Console ownership. The contact form prepares a message in the visitor's email application; it is not backend email delivery.
