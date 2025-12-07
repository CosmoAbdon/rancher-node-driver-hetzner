#!/bin/bash
set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERSION=$(node -p "require('./package.json').version")
TAG="hetzner-node-driver-$VERSION"

echo -e "${BLUE}📦 Versão detectada: ${GREEN}$VERSION${NC}"
echo -e "${BLUE}🏷️  Tag que será criada: ${GREEN}$TAG${NC}"
echo ""

echo -e "${YELLOW}🗑️  Deletando tag antiga...${NC}"
git tag -d $TAG 2>/dev/null || true
git push origin :refs/tags/$TAG 2>/dev/null || true

echo -e "${YELLOW}🗑️  Deletando release antigo...${NC}"
gh release delete $TAG --yes 2>/dev/null || true

echo -e "${BLUE}🏷️  Criando nova tag...${NC}"
git tag $TAG

echo -e "${BLUE}🚀 Pushing tag...${NC}"
git push origin $TAG

echo ""
echo -e "${GREEN}✅ Pronto! GitHub Actions criará novo release.${NC}"
