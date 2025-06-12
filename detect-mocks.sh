#!/bin/bash
# detect-mocks.sh - Script de détection des données mockées dans EcoDeli

echo "🔍 SCANNING FOR MOCKED DATA IN ECODELI PROJECT..."
echo "=================================================="

# Patterns à rechercher
PATTERNS="mock|Mock|MOCK|fake|Fake|FAKE|dummy|Dummy|DUMMY|stub|Stub|STUB|todo|TODO|fixme|FIXME|hardcoded|simulated|placeholder|sleep|setTimeout.*resolve"

# Fichiers à ignorer
IGNORE="node_modules|\.next|dist|build|coverage|\.git|\.pnpm|detect-mocks\.sh"

echo -e "\n📁 SCANNING ALL TYPESCRIPT FILES..."
echo "=================================="

# Scanner tous les fichiers TypeScript
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) | grep -vE "$IGNORE" | while read file; do
  if grep -iE "$PATTERNS" "$file" > /dev/null; then
    echo "⚠️  FOUND MOCKS IN: $file"
    grep -inE "$PATTERNS" "$file" | head -10 | sed 's/^/    /'
    echo "    ---"
  fi
done

echo -e "\n🔍 CHECKING FOR STATIC RETURN ARRAYS..."
echo "======================================"
grep -r "return \[" --include="*.ts" --include="*.tsx" apps/web/src | grep -vE "$IGNORE" | head -20

echo -e "\n🔍 CHECKING FOR USESTATE WITH MOCK DATA..."
echo "========================================="
grep -r "useState(\[" --include="*.tsx" apps/web/src | grep -vE "$IGNORE" | head -20

echo -e "\n🔍 CHECKING FOR HARDCODED OBJECTS..."
echo "==================================="
grep -r "const.*=.*{.*id.*:" --include="*.ts" --include="*.tsx" apps/web/src | grep -vE "$IGNORE|type|interface|schema" | head -20

echo -e "\n🔍 CHECKING TRPC ROUTERS SPECIFICALLY..."
echo "======================================"
find apps/web/src/server/api/routers -name "*.ts" | while read file; do
  echo "📄 Checking router: $(basename $file)"
  if grep -E "return \[|return {.*:.*[0-9]|mock|fake|dummy|TODO|FIXME" "$file" > /dev/null; then
    echo "  ⚠️  ISSUES FOUND:"
    grep -n "return \[|return {.*:.*[0-9]|mock|fake|dummy|TODO|FIXME" "$file" | sed 's/^/    /'
  else
    echo "  ✅ No obvious mocks found"
  fi
  echo ""
done

echo -e "\n🔍 CHECKING FOR PROMISE DELAYS..."
echo "==============================="
grep -r "setTimeout\|sleep\|delay" --include="*.ts" --include="*.tsx" apps/web/src | grep -vE "$IGNORE" | head -10

echo -e "\n🔍 CHECKING FOR CONSOLE.LOG IMPLEMENTATIONS..."
echo "=============================================="
grep -r "console\.log.*would\|console\.log.*mock\|console\.log.*TODO" --include="*.ts" --include="*.tsx" apps/web/src | head-10

echo -e "\n📊 SUMMARY"
echo "=========="
echo "Scan completed. Review the output above to identify files that need real implementations."
echo "Priority order:"
echo "1. tRPC routers (server/api/routers/)"
echo "2. Services and lib files"
echo "3. Pages with hardcoded data"
echo "4. Components with mock states"