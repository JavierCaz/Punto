#!/usr/bin/env node
/**
 * Cross-platform wrapper around `expo export -p web`.
 *
 * Defaults to the production app variant so the desktop build is branded
 * "Punto" (see app.config.ts) rather than "Punto Dev". Override with
 * `EAS_BUILD_PROFILE=development npm run export:web` when needed.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const result = spawnSync(npx, ['expo', 'export', '-p', 'web'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    EAS_BUILD_PROFILE: process.env.EAS_BUILD_PROFILE ?? 'production',
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
