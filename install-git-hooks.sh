#!/bin/sh
# install-git-hooks.sh
# Run this after git init to install security hooks

if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository. Run 'git init' first."
    exit 1
fi

mkdir -p .git/hooks

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Pre-commit hook to prevent committing sensitive files

# Check if .env is being committed
if git diff --cached --name-only | grep -q "^\.env$"; then
    echo "❌ ERROR: .env file detected in commit!"
    echo "This file contains sensitive secrets and should NEVER be committed."
    exit 1
fi

# Check if data/ directory is being committed
if git diff --cached --name-only | grep -q "^data/"; then
    echo "❌ ERROR: data/ directory detected in commit!"
    echo "This directory contains encrypted tokens and user data."
    exit 1
fi

# Check for potential secrets in code
if git diff --cached | grep -E "(PLAID_SECRET|PLAID_CLIENT_ID|JWT_SECRET|ENCRYPTION_KEY)\s*=" | grep -v "process.env"; then
    echo "⚠️  WARNING: Potential hardcoded secret detected!"
    echo "Use environment variables instead."
    exit 1
fi

echo "✅ Pre-commit checks passed"
exit 0
EOF

chmod +x .git/hooks/pre-commit
echo "✅ Git security hooks installed!"
echo "   This will prevent committing .env and data/ files"

