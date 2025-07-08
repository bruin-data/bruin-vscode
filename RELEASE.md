# Release Process

This document outlines the automated release process for the Bruin VS Code extension.

## Quick Release

The release process is now fully automated. Simply run one command based on the type of changes:

### Bug fixes (patch release):
```bash
npm run tag:patch
```

### New features (minor release):
```bash
npm run tag:minor
```

### Breaking changes (major release):
```bash
npm run tag:major
```

## What Happens Automatically

1. **Version Calculation**: Script automatically calculates the next version based on the latest git tag
2. **Confirmation**: Shows current version → new version and asks for confirmation
3. **Tag Creation**: Creates the new git tag locally
4. **Tag Push**: Pushes the tag to GitHub
5. **GitHub Actions**: Automatically triggers the release workflow which:
   - Updates package.json version to match the tag
   - Builds the extension
   - Publishes to VS Code Marketplace and Open VSX

## Manual Steps (Optional)

If you need to create tags manually:

```bash
# Get current version
git describe --tags --abbrev=0

# Create new tag
git tag v1.2.3

# Push tag
git push origin v1.2.3
```

## Requirements

- Must be on `main` branch
- No uncommitted changes
- Git repository must have at least one existing tag

## Changelog and README

The CHANGELOG.md and README.md should be updated manually when significant changes are made. The release process doesn't automatically update the changelog and README to give maintainers full control over release notes.

## Version Format

Use semantic versioning: `v0.54.3` (major.minor.patch)

## Troubleshooting

- **"No tags found"**: If this is the first release, create an initial tag: `git tag v0.1.0`
- **Permission denied**: Ensure you have push access to the repository
- **GitHub Actions failing**: Check that `VSCE_PAT` and `OVSX_PAT` secrets are configured

## GitHub Actions Secrets

The following secrets must be configured in the GitHub repository:

- `VSCE_PAT`: Personal Access Token for VS Code Marketplace
- `OVSX_PAT`: Personal Access Token for Open VSX Registry