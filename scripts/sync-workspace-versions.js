#!/usr/bin/env node

/**
 * Synchronizes the version from root package.json to all workspace package.json files.
 * Used as a release-it hook after version bump.
 */

const fs = require('fs');
const path = require('path');

const rootPackagePath = path.join(__dirname, '..', 'package.json');
const workspaces = ['proxy'];

try {
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  const newVersion = rootPackage.version;

  console.log(`Syncing version ${newVersion} to workspaces...`);

  workspaces.forEach((workspace) => {
    const workspacePackagePath = path.join(__dirname, '..', workspace, 'package.json');
    
    if (fs.existsSync(workspacePackagePath)) {
      const workspacePackage = JSON.parse(fs.readFileSync(workspacePackagePath, 'utf8'));
      const oldVersion = workspacePackage.version;
      
      workspacePackage.version = newVersion;
      fs.writeFileSync(workspacePackagePath, JSON.stringify(workspacePackage, null, 2) + '\n');
      
      console.log(`  ${workspace}/package.json: ${oldVersion} -> ${newVersion}`);
    } else {
      console.warn(`  Warning: ${workspacePackagePath} not found`);
    }
  });

  console.log('Version sync complete.');
} catch (error) {
  console.error('Error syncing versions:', error.message);
  process.exit(1);
}
