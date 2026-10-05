import fs from 'node:fs';
import path from 'node:path';
export function preparePages(destination = '.pages-site') {
  const root = path.resolve(import.meta.dirname, '..');
  const output = path.resolve(destination);
  if (output === root) throw new Error('Output must be separate from the repository');
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const file of ['index.html','services.html','projects.html','about.html','reviews.html','contact.html','robots.txt','sitemap.xml','CNAME','assets','app']) {
    fs.cpSync(path.join(root, file), path.join(output, file), { recursive: true });
  }
  fs.writeFileSync(path.join(output, '.nojekyll'), '');
  return output;
}
if (process.argv[1] === import.meta.filename) preparePages();
