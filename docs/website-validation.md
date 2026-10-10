# L4G website validation

Validated 10 October 2026 (Europe/Bucharest).

- Production build: 7 static HTML pages.
- Browser tests: 7 passed, using Chromium. Includes desktop/mobile navigation, contact validation, reduced motion, actual video scrubbing, content without JavaScript, and axe accessibility checks.
- Existing Python integration tests: 14 passed.
- GitHub workflow validation: actionlint passed.
- npm production dependency audit: no vulnerabilities reported.
- Lighthouse mobile simulation, local production server, with the real generated media: Performance **99**, Accessibility **100**, Best Practices **100**, SEO **100**. LCP **1.6 s**, CLS **0.004**, total blocking time **0 ms**, transfer size **538 KiB**. These are lab measurements, not live-domain field results or ranking guarantees.
- Seedance video: 6.04 seconds, 1280×720 H.264, 428,959 bytes, no audio. Hero poster: 7,684 bytes. Media provenance: `web/public/media/manifest.json`.
- GitHub Pages subpath preview verified locally: navigation, fonts, media, contact and noindex metadata work; no HTTP errors observed.

Desktop and mobile captures are `docs/l4g-desktop.png` and `docs/l4g-mobile.png`.

Remaining launch configuration: set GitHub Pages Source to GitHub Actions and manually run the website workflow; connect the approved production hosting/domain, verify legal entity information, and submit the production sitemap in the domain owner's Search Console. The contact form opens the user's email application; it is not a server-side mail service.
