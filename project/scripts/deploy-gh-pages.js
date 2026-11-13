import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gitRoot = path.resolve(__dirname, '..', '..');
const distPath = path.resolve(gitRoot, 'project', 'dist');

console.log('Building frontend project for GitHub Pages...');
execSync('npm run build', { cwd: path.resolve(gitRoot, 'project'), stdio: 'inherit' });

// สร้าง .nojekyll และ 404.html สำหรับ GitHub Pages
fs.writeFileSync(path.join(distPath, '.nojekyll'), '');
fs.copyFileSync(path.join(distPath, 'index.html'), path.join(distPath, '404.html'));

const tempIndex = path.resolve(gitRoot, '.git', 'temp-gh-pages-index');
if (fs.existsSync(tempIndex)) {
  fs.unlinkSync(tempIndex);
}

const env = {
  ...process.env,
  GIT_INDEX_FILE: tempIndex,
  GIT_WORK_TREE: distPath,
};

try {
  execSync('git add -A', { cwd: gitRoot, env });
  const treeSha = execSync('git write-tree', { cwd: gitRoot, env }).toString().trim();
  const commitMsg = 'deploy(pages): build frontend and export to gh-pages';
  let parentArg = '';
  try {
    const parentSha = execSync('git rev-parse --verify refs/heads/gh-pages', { cwd: gitRoot })
      .toString()
      .trim();
    if (parentSha) {
      parentArg = `-p ${parentSha}`;
    }
  } catch {
    // ไม่มี branch gh-pages มาก่อน ปล่อยเป็น commit แรก
  }

  const commitSha = execSync(`git commit-tree ${treeSha} ${parentArg} -m "${commitMsg}"`, {
    cwd: gitRoot,
    env,
  })
    .toString()
    .trim();
  execSync(`git update-ref refs/heads/gh-pages ${commitSha}`, { cwd: gitRoot });
  console.log(`Successfully prepared branch 'gh-pages' at commit: ${commitSha}`);
} finally {
  if (fs.existsSync(tempIndex)) {
    fs.unlinkSync(tempIndex);
  }
}

