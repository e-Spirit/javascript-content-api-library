#!/usr/bin/env node

/**
 * Custom publish script for workspace packages.
 * This script handles the actual npm publish for workspaces.
 * 
 * Called from release-it after:npm:release hook.
 * Uses --dry-run flag from npm command line args if present.
 */

const { execSync } = require('child_process');
const path = require('path');

const workspaces = ['proxy'];
const isDryRun = process.argv.includes('--dry-run') || process.env.RELEASE_IT_DRY_RUN === 'true';

workspaces.forEach((workspacePath) => {
  const workspacePackagePath = path.join(__dirname, '..', workspacePath, 'package.json');
  
  // Build the npm publish command
  let command = `npm publish ./${workspacePath} --tag latest --access public`;
  if (isDryRun) {
    command += ' --dry-run';
  }

  console.log(`Publishing ${workspacePath}...`);
  console.log(`Command: ${command}`);

  try {
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(`Successfully published ${workspacePath}`);
  } catch (error) {
    console.error(`Failed to publish ${workspacePath}:`, error.message);
    process.exit(1);
  }
});
