# Release Process

## Steps to Release

1. **Update CHANGELOG.md and README.md** - Add new version entry with changes
2. **Update package.json version** - Bump version number manually
3. **Commit changes** 
5. **Push to main** - `git push origin main`
6. **Create and push tag from main** - This triggers the automated release:
   ```bash
   git tag v0.*.* 
   git push origin v0.*.*
   ```
## Version Format
Use semantic versioning: `v0.54.3` (major.minor.patch)