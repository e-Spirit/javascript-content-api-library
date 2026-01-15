#!/usr/bin/env node

/**
 * Custom publish script for workspace packages.
 * This script handles the actual npm publish for workspaces,
 * and correctly handles dry-run mode by syncing versions first.
 * 
 * Environment variables provided by @release-it-plugins/workspaces:
 * - RELEASE_IT_WORKSPACES_PATH_TO_WORKSPACE: relative path to workspace
 * - RELEASE_IT_WORKSPACES_TAG: npm dist-tag (e.g., 'latest')
 * - RELEASE_IT_WORKSPACES_ACCESS: access level ('public' or 'restricted')
 * - RELEASE_IT_WORKSPACES_OTP: one-time password for 2FA (optional)
 * - RELEASE_IT_WORKSPACES_DRY_RUN: 'true' if this is a dry run
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const workspacePath = process.env.RELEASE_IT_WORKSPACES_PATH_TO_WORKSPACE;
const tag = process.env.RELEASE_IT_WORKSPACES_TAG || 'latest';
const access = process.env.RELEASE_IT_WORKSPACES_ACCESS || 'public';
const otp = process.env.RELEASE_IT_WORKSPACES_OTP;
const isDryRun = process.env.RELEASE_IT_WORKSPACES_DRY_RUN === 'true';

if (!workspacePath) {
  console.error('Error: RELEASE_IT_WORKSPACES_PATH_TO_WORKSPACE not set');
  process.exit(1);
}

// Sync version from root package.json to workspace package.json
// This is needed because in dry-run mode, the after:bump hook doesn't execute
const rootPackagePath = path.join(__dirname, '..', 'package.json');
const workspacePackagePath = path.join(__dirname, '..', workspacePath, 'package.json');

try {
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  const workspacePackage = JSON.parse(fs.readFileSync(workspacePackagePath, 'utf8'));
  
  if (rootPackage.version !== workspacePackage.version) {
    console.log(`Syncing version: ${workspacePackage.version} -> ${rootPackage.version}`);
    workspacePackage.version = rootPackage.version;
    fs.writeFileSync(workspacePackagePath, JSON.stringify(workspacePackage, null, 2) + '\n');
  }
} catch (error) {
  console.error('Error syncing version:', error.message);
  process.exit(1);
}

// Build the npm publish command
let command = `npm publish ./${workspacePath} --tag ${tag} --access ${access}`;
if (otp) {
  command += ` --otp ${otp}`;
}
if (isDryRun) {
  command += ' --dry-run';
}

console.log(`Publishing ${workspacePath}...`);
console.log(`Command: ${command}`);

try {
  execSync(command, { stdio: 'inherit' });
  console.log(`Successfully published ${workspacePath}`);
} catch (error) {
  console.error(`Failed to publish ${workspacePath}:`, error.message);
  process.exit(1);
}
