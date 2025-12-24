#!/bin/bash
set -e

# Navigate to monorepo root
cd "$(dirname "$0")/../.."

# Install dependencies from root to resolve workspace dependencies
pnpm install --frozen-lockfile

