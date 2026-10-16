// Shared context for the evaluation scripts: which version is evaluated and
// where its evidence is written. Each version gets its own folder so a new run
// never overwrites the evidence of another version.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : '';
}

// QUALITY_COMMIT lets CI name the evaluated version when the sources were
// checked out without Git metadata.
export const commit = process.env.QUALITY_COMMIT || git(['rev-parse', 'HEAD']) || 'desconocido';
export const shortCommit = commit.slice(0, 7);
export const label = process.env.QUALITY_LABEL || shortCommit;

// QUALITY_OUT overrides the folder; by default evidence/runs/<commit>.
export const runDir = path.resolve(
  process.env.QUALITY_OUT || path.join(root, 'quality/evidence/runs', shortCommit),
);
mkdirSync(runDir, { recursive: true });

export const versionInfo = { commit, shortCommit, label };
