#!/bin/bash
set -e

V1=$(node -p "require('./package.json').version")
V2=$(node -p "require('./pkg/hetzner-node-driver/package.json').version")

if [ "$V1" != "$V2" ]; then
  echo "❌ Versões diferentes!"
  echo "   Root: $V1"
  echo "   Plugin: $V2"
  exit 1
fi

echo "✅ Versões sincronizadas: $V1"
