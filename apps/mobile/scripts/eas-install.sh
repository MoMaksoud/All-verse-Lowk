#!/bin/bash
set -e

# Ignore any command line arguments (like --platform ios)
# EAS may append these, but we don't need them

# Navigate to monorepo root
cd "$(dirname "$0")/../.."

# Install dependencies from root to resolve workspace dependencies
echo "Installing dependencies from monorepo root..."
pnpm install --frozen-lockfile

# Return to mobile app directory
cd apps/mobile

