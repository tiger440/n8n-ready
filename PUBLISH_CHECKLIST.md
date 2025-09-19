# 📦 Publication Checklist for n8n-ready

This checklist ensures everything is ready before publishing to NPM and helps verify the release process.

## 🔍 Pre-Release Validation

### 1. Local Development Test

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Verify build artifacts exist
ls -la packages/cli/dist/
ls -la packages/cli/dist/templates/

# Test CLI locally
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js init test-project --profile local
cd test-project && ls -la

# Clean up test
cd .. && rm -rf test-project
```

### 2. Package Content Verification

```bash
# Dry run npm pack to see what will be included
npm pack --dry-run

# Check package size and file list
npm pack --dry-run | grep -E "(npm notice|files:|unpacked size:)"

# Verify only these directories are included:
# - packages/cli/dist/
# - packages/cli/templates/
```

### 3. Lint and Format Check

```bash
# Run linting
pnpm lint

# Check formatting
pnpm format

# Fix any issues before proceeding
```

## 📋 Release Preparation Checklist

- [ ] **Version bumped** in `package.json` (e.g., 0.1.0 → 0.1.1)
- [ ] **CHANGELOG.md updated** with new features/fixes
- [ ] **README.md reviewed** and updated if needed
- [ ] **All tests passing** locally
- [ ] **Clean git status** (no uncommitted changes)

## 🚀 GitHub Release Process

### 1. Create GitHub Release

```bash
# Tag the release
git tag v0.1.0
git push origin v0.1.0

# Or create release via GitHub UI:
# 1. Go to repository > Releases > "Create a new release"
# 2. Tag: v0.1.0
# 3. Title: "Release v0.1.0"
# 4. Description: Copy from CHANGELOG.md
# 5. Click "Publish release"
```

### 2. Monitor GitHub Actions

- [ ] **Workflow triggered** on release publication
- [ ] **Build succeeds** in GitHub Actions
- [ ] **Tests pass** in CI
- [ ] **NPM publish succeeds** in workflow logs

## ✅ Post-Publication Verification

### 1. NPM Package Verification

```bash
# Wait 2-3 minutes for NPM propagation, then test:

# Test global installation
npx n8n-ready --help

# Test project creation
npx n8n-ready init test-npm-install --profile local

# Verify templates are included
cd test-npm-install
ls -la  # Should see docker-compose.yml, .env.example

# Test CLI commands
npx n8n-ready doctor
# (Expected: should check Docker, etc.)

# Clean up
cd .. && rm -rf test-npm-install
```

### 2. Alternative Package Name Test (if needed)

If `n8n-ready` is unavailable, test with scoped package:

```bash
# Test scoped package
npx @YOUR_SCOPE/n8n-ready --help
npx @YOUR_SCOPE/n8n-ready init test-scoped --profile prod
```

### 3. Documentation Verification

- [ ] **NPM page looks correct**: https://www.npmjs.com/package/n8n-ready
- [ ] **README renders properly** on NPM
- [ ] **Keywords are set** for discoverability
- [ ] **License is visible**

## 🐛 Troubleshooting Common Issues

### Build Fails
```bash
# Check TypeScript errors
pnpm build

# Verify all imports are correct
# Ensure templates directory exists
```

### Templates Missing in Package
```bash
# Verify files field in package.json includes:
# "files": ["packages/cli/dist", "packages/cli/templates"]

# Check .npmignore doesn't exclude templates
cat .npmignore
```

### CLI Not Executable
```bash
# Verify shebang in packages/cli/src/index.ts:
head -1 packages/cli/src/index.ts
# Should be: #!/usr/bin/env node

# Verify bin field in package.json:
# "bin": { "n8n-ready": "packages/cli/dist/index.js" }
```

### Import Path Issues
```bash
# Verify ES module imports use .js extensions
# Check that template paths use import.meta.url correctly
```

## 🔧 Emergency Rollback

If something goes wrong after publication:

```bash
# Deprecate the broken version (DON'T unpublish)
npm deprecate n8n-ready@0.1.0 "Broken release, use 0.1.1 instead"

# Fix issues and release a patch version
# Update version to 0.1.1
# Follow this checklist again
```

## 📝 Scoped Package Alternative

If `n8n-ready` is not available on NPM, prepare scoped version:

### Update package.json:
```json
{
  "name": "@YOUR_SCOPE/n8n-ready",
  "publishConfig": {
    "access": "public"
  }
}
```

### Update documentation:
```bash
# Replace all instances of:
npx n8n-ready

# With:
npx @YOUR_SCOPE/n8n-ready
```

## ✨ Success Criteria

After completing this checklist, verify:

- [ ] ✅ CLI installs via `npx n8n-ready`
- [ ] ✅ All commands work (`init`, `doctor`, `up`, `down`)
- [ ] ✅ Templates are correctly copied
- [ ] ✅ Both profiles (local/prod) work
- [ ] ✅ Error messages are helpful
- [ ] ✅ README renders correctly on NPM
- [ ] ✅ GitHub Actions workflow completed successfully

---

🎉 **Congratulations!** Your n8n-ready CLI is now published and ready for the community to use!