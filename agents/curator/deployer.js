import { access } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import axios from 'axios';
import { CONFIG } from './config.js';
import { appendLog } from './logger.js';

// ─── DEPLOY WEBSITE ──────────────────────────────────────

export async function deploy({ roomTypes = [], communities = [], photoCount = 0 } = {}) {
  const repoDir = CONFIG.paths.websiteRepo;

  // Verify repo exists
  try {
    await access(repoDir);
  } catch {
    throw new Error(`Website repo not found: ${repoDir}`);
  }

  console.log('[curator] Deploying website changes...');

  // Check for changes
  const status = execSync('git status --porcelain', { cwd: repoDir, encoding: 'utf-8' }).trim();
  if (!status) {
    console.log('[curator] No changes to deploy');
    return { deployed: false, reason: 'no changes' };
  }

  const changedFiles = status.split('\n').length;
  console.log(`  [deploy] ${changedFiles} files changed`);

  // Build commit message
  const rooms = roomTypes.length > 0 ? roomTypes.join(', ') : 'various';
  const areas = communities.length > 0 ? ` — ${communities.join(', ')}` : '';
  const message = `curator: added ${photoCount} photos — ${rooms}${areas}`;

  // Try deploy script first
  try {
    await access(CONFIG.paths.deployScript);
    console.log('  [deploy] Using deploy script...');
    const output = execSync(`bash ${CONFIG.paths.deployScript}`, {
      cwd: repoDir,
      encoding: 'utf-8',
      timeout: 60000,
    });
    console.log(`  [deploy] ${output.trim()}`);
    await appendLog(`DEPLOY via script — ${message}`);
    return { deployed: true, method: 'script', message };
  } catch {
    // Fall through to git commands
  }

  // Git add, commit, push
  try {
    execSync('git add -A', { cwd: repoDir, encoding: 'utf-8' });
    execSync(`git commit -m "${message}"`, { cwd: repoDir, encoding: 'utf-8' });
    console.log(`  [deploy] Committed: ${message}`);

    execSync('git push origin main', { cwd: repoDir, encoding: 'utf-8', timeout: 30000 });
    console.log('  [deploy] Pushed to origin/main');

    await appendLog(`DEPLOY git push — ${message}`);

    // Verify deployment (non-fatal)
    try {
      await new Promise(r => setTimeout(r, 5000)); // Wait for Vercel
      const { status: httpStatus } = await axios.get('https://unicornrenovations.com', { timeout: 10000 });
      console.log(`  [deploy] Site verified: HTTP ${httpStatus}`);
    } catch {
      console.log('  [deploy] Site verification skipped (may still be deploying)');
    }

    return { deployed: true, method: 'git', message, files: changedFiles };

  } catch (err) {
    const msg = err.message || String(err);
    await appendLog(`DEPLOY_ERROR ${msg}`);
    throw new Error(`Deploy failed: ${msg}`);
  }
}
