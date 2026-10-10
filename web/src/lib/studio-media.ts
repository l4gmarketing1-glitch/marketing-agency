import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Astro's build runs from web/. Publish the cinematic layer only as a complete set.
const required = ['manifest.json', 'hero.mp4', 'hero-poster.webp', 'detail-ads.webp', 'detail-web.webp', 'detail-brand.webp', 'social.jpg'];
export const studioMediaReady = required.every(name => existsSync(resolve('public/media/studio', name)));
