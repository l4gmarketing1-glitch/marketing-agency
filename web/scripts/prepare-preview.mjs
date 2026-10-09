/** Make a non-indexable GitHub Pages preview from the validated production build. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const base = process.env.PREVIEW_BASE || '/marketing-agency';
const root = new URL('../dist/', import.meta.url);
async function walk(directory) {
  for (const item of await readdir(directory,{withFileTypes:true})) {
    const path=join(directory,item.name);
    if(item.isDirectory()) {await walk(path);continue;}
    if(!/\.(html|css|xml)$/.test(item.name))continue;
    let text=await readFile(path,'utf8');
    if(item.name.endsWith('.html')){
      text=text.replace(/(href|src|data-src|action)="\/(?!\/)/g,`$1="${base}/`);
      text=text.replace(/<meta name="robots" content="[^"]*"\s*\/?\s*>/g,'<meta name="robots" content="noindex,follow">');
    }
    if(item.name.endsWith('.css'))text=text.replace(/url\((['"]?)\/(?!\/)/g,`url($1${base}/`);
    await writeFile(path,text);
  }
}
await walk(root.pathname);
await writeFile(new URL('.nojekyll',root),'');
// Crawlable pages carry noindex; canonical URLs still point to the production domain.
await writeFile(new URL('robots.txt',root),'User-agent: *\nAllow: /\n');
console.log(`Prepared non-indexable preview at ${base}/`);
