const fs = require('fs');
const path = require('path');

const root = path.join(
  'c:',
  'Users',
  'thugg',
  'OneDrive',
  'Desktop',
  'a',
  'Local Dev Enviorment',
  'Complete',
  'rnk ready for release',
  'rnk-crimson-blood',
  'crimson-scaler'
);

const glob = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...glob(full));
    else files.push(full);
  }
  return files;
};

const jsonFiles = glob(path.join(root, 'data')).filter((f) => f.endsWith('.json'));
const regex = /modules\/ld-crimson-scaler\/assets\/portraits\/[\w\-]+\.png/g;
const missing = new Set();
const referenced = new Set();

for (const file of jsonFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(regex);
  if (matches) {
    for (const m of matches) {
      referenced.add(m);
      const rel = m.replace('modules/ld-crimson-scaler/', '');
      const abs = path.join(root, rel);
      if (!fs.existsSync(abs)) missing.add(m);
    }
  }
}

console.log('Total json files scanned:', jsonFiles.length);
console.log('Total referenced images:', referenced.size);
if (missing.size) {
  console.log('Missing images (broken links):');
  console.log(Array.from(missing).sort().join('\n'));
} else {
  console.log('No missing referenced portrait images found.');
}
