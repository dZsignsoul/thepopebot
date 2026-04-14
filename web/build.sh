#!/bin/bash
set -e
# Run from repo root (one level up from web/)
cd "$(dirname "$0")/.."
npm install
node_modules/.bin/esbuild lib/chat/components/*.jsx lib/chat/components/**/*.jsx --outdir=lib/chat/components --format=esm --jsx=automatic --outbase=lib/chat/components
node_modules/.bin/esbuild lib/auth/components/*.jsx lib/auth/components/**/*.jsx --outdir=lib/auth/components --format=esm --jsx=automatic --outbase=lib/auth/components
node_modules/.bin/esbuild lib/code/*.jsx --outdir=lib/code --format=esm --jsx=automatic
node_modules/.bin/esbuild lib/cluster/components/*.jsx --outdir=lib/cluster/components --format=esm --jsx=automatic
node_modules/.bin/next build web
