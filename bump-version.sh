#!/bin/bash
set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

increment_version() {
  local version=$1
  local type=$2

  IFS='.' read -r -a parts <<<"$version"
  major="${parts[0]}"
  minor="${parts[1]}"
  patch="${parts[2]}"

  case $type in
  patch)
    patch=$((patch + 1))
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  esac

  echo "$major.$minor.$patch"
}

CURRENT_VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}📦 Versão atual: ${GREEN}$CURRENT_VERSION${NC}"
echo ""
echo "Escolha o tipo de atualização:"
echo ""
echo -e "  ${YELLOW}1)${NC} patch  → $(increment_version $CURRENT_VERSION patch) ${GREEN}(correções de bugs)${NC}"
echo -e "  ${YELLOW}2)${NC} minor  → $(increment_version $CURRENT_VERSION minor) ${GREEN}(novas funcionalidades)${NC}"
echo -e "  ${YELLOW}3)${NC} major  → $(increment_version $CURRENT_VERSION major) ${GREEN}(breaking changes)${NC}"
echo -e "  ${YELLOW}4)${NC} custom → ${GREEN}(versão personalizada)${NC}"
echo -e "  ${RED}0)${NC} cancelar"
echo ""
read -p "Opção: " option

case $option in
1)
  NEW_VERSION=$(increment_version $CURRENT_VERSION patch)
  ;;
2)
  NEW_VERSION=$(increment_version $CURRENT_VERSION minor)
  ;;
3)
  NEW_VERSION=$(increment_version $CURRENT_VERSION major)
  ;;
4)
  read -p "Digite a nova versão: " NEW_VERSION
  ;;
0)
  echo -e "${RED}❌ Cancelado${NC}"
  exit 0
  ;;
*)
  echo -e "${RED}❌ Opção inválida${NC}"
  exit 1
  ;;
esac

if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}❌ Formato de versão inválido. Use: X.Y.Z${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}📦 Nova versão: ${GREEN}$NEW_VERSION${NC}"
echo ""
read -p "Confirma a atualização? (y/n): " confirm

if [[ $confirm != "y" ]]; then
  echo -e "${RED}❌ Cancelado${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}📝 Atualizando package.json principal...${NC}"
npm version $NEW_VERSION --no-git-tag-version

echo -e "${BLUE}📝 Atualizando ./pkg/hetzner-node-driver/package.json...${NC}"
cd pkg/hetzner-node-driver
npm version $NEW_VERSION --no-git-tag-version --allow-same-version
cd ../..

echo ""
echo -e "${GREEN}✅ Versão atualizada para: $NEW_VERSION${NC}"
echo ""
echo -e "${BLUE}🔄 Commitando mudanças...${NC}"
git add package.json pkg/hetzner-node-driver/package.json
git commit -m "chore: bump version to $NEW_VERSION"

echo ""
echo -e "${YELLOW}Deseja criar release agora? (y/n):${NC} "
read -r release_confirm

if [[ $release_confirm == "y" ]]; then
  if [ -f "./update-release.sh" ]; then
    ./update-release.sh
  else
    echo -e "${YELLOW}⚠️  Script update-release.sh não encontrado${NC}"
    echo -e "${BLUE}💡 Execute manualmente: ./update-release.sh${NC}"
  fi
else
  echo ""
  echo -e "${GREEN}✅ Pronto!${NC}"
  echo -e "${BLUE}💡 Para criar o release depois, execute: ./update-release.sh${NC}"
fi
