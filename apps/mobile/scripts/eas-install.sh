#!/bin/bash
set -e

# Navigate to monorepo root
cd "$(dirname "$0")/../.."

# Install dependencies from root to resolve workspace dependencies
echo "Installing dependencies from monorepo root..."
pnpm install --frozen-lockfile

# Return to mobile app directory
cd apps/mobile

