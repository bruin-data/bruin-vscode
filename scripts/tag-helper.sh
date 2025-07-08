#!/bin/bash

# Get the latest tag
latest_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")

# Remove 'v' prefix and split version
version=${latest_tag#v}
IFS='.' read -ra VERSION_PARTS <<< "$version"

major=${VERSION_PARTS[0]:-0}
minor=${VERSION_PARTS[1]:-0}
patch=${VERSION_PARTS[2]:-0}

case "$1" in
    "patch")
        new_patch=$((patch + 1))
        new_version="v$major.$minor.$new_patch"
        ;;
    "minor")
        new_minor=$((minor + 1))
        new_version="v$major.$new_minor.0"
        ;;
    "major")
        new_major=$((major + 1))
        new_version="v$new_major.0.0"
        ;;
    *)
        echo "Usage: $0 {patch|minor|major}"
        echo "Current version: $latest_tag"
        exit 1
        ;;
esac

echo "Current version: $latest_tag"
echo "New version: $new_version"

# Confirm
read -p "Create and push tag $new_version? (y/N): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    git tag "$new_version"
    git push origin "$new_version"
    echo "✅ Tag $new_version created and pushed!"
    echo "🚀 GitHub Actions will now build and publish the extension"
else
    echo "❌ Tag creation cancelled"
fi