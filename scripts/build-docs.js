import fs from 'fs/promises';
import path from 'path';

const rootDir = process.cwd();
const docsDir = path.join(rootDir, 'docs');
const entries = ['index.html', 'game.js', 'assets', 'img'];

async function copyRecursive(src, dest) {
  const stat = await fs.stat(src);

  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const children = await fs.readdir(src);
    for (const child of children) {
      await copyRecursive(path.join(src, child), path.join(dest, child));
    }
    return;
  }

  await fs.copyFile(src, dest);
}

async function build() {
  await fs.rm(docsDir, { recursive: true, force: true });
  await fs.mkdir(docsDir, { recursive: true });

  for (const entry of entries) {
    const src = path.join(rootDir, entry);
    const dest = path.join(docsDir, entry);
    await copyRecursive(src, dest);
  }

  console.log('Built GitHub Pages site in docs/');
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
