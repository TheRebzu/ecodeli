# Script PowerShell pour corriger les imports de cn
Write-Host "🔧 Correction des imports cn depuis @/utils/document-utils vers @/lib/utils/common..." -ForegroundColor Green

$sourceFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx"
$totalFiles = 0
$totalChanges = 0

foreach ($file in $sourceFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Pattern 1: import { cn } from '@/utils/document-utils'
    $content = $content -replace "import\s*{\s*cn\s*}\s*from\s*[`"']@/utils/document-utils[`"']", "import { cn } from '@/lib/utils/common'"
    
    # Pattern 2: import { cn, other } from '@/utils/document-utils'
    $content = $content -replace "import\s*{\s*cn\s*,\s*([^}]+)\s*}\s*from\s*[`"']@/utils/document-utils[`"']", "import { cn } from '@/lib/utils/common';`nimport { `$1 } from '@/utils/document-utils'"
    
    # Pattern 3: import { other, cn } from '@/utils/document-utils'
    $content = $content -replace "import\s*{\s*([^}]+),\s*cn\s*}\s*from\s*[`"']@/utils/document-utils[`"']", "import { `$1 } from '@/utils/document-utils';`nimport { cn } from '@/lib/utils/common'"
    
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline
        $totalFiles++
        Write-Host "✓ Corrigé: $($file.FullName)" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Résultats:" -ForegroundColor Green
Write-Host "- Fichiers corrigés: $totalFiles" -ForegroundColor Cyan
Write-Host "- Correction terminée!" -ForegroundColor Green 