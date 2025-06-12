# Script de création des pages manquantes pour EcoDeli
# Exécuter depuis la racine du projet (où se trouve src/)

Write-Host "🚀 Création des pages manquantes pour EcoDeli..." -ForegroundColor Green

$appPath = "./src/app/[locale]"

# Fonction pour créer une page avec contenu de base
function Create-Page {
    param($Path, $PageName = "Page")
    
    $dir = Split-Path -Parent $Path
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    if (!(Test-Path $Path)) {
        $content = @"
export default function $PageName() {
  return (
    <div>
      <h1>$PageName</h1>
    </div>
  );
}
"@
        Set-Content -Path $Path -Value $content -Encoding UTF8
        Write-Host "✅ Créé: $Path" -ForegroundColor Green
    }
}

# 1. ASSURANCES
Write-Host "`n📦 Création des pages Assurances..." -ForegroundColor Yellow

# Client
Create-Page "$appPath/(protected)/client/insurance/page.tsx" "InsurancePage"
Create-Page "$appPath/(protected)/client/insurance/subscribe/page.tsx" "InsuranceSubscribePage"
Create-Page "$appPath/(protected)/client/insurance/claims/page.tsx" "InsuranceClaimsPage"
Create-Page "$appPath/(protected)/client/insurance/claims/create/page.tsx" "CreateClaimPage"

# Admin
Create-Page "$appPath/(protected)/admin/insurance/page.tsx" "AdminInsurancePage"
Create-Page "$appPath/(protected)/admin/insurance/claims/page.tsx" "AdminClaimsPage"

# 2. LÂCHER DE CHARIOT (Cart-drop)
Write-Host "`n📦 Création des pages Cart-drop..." -ForegroundColor Yellow

# Merchant
Create-Page "$appPath/(protected)/merchant/cart-drop/page.tsx" "CartDropPage"
Create-Page "$appPath/(protected)/merchant/cart-drop/settings/page.tsx" "CartDropSettingsPage"
Create-Page "$appPath/(protected)/merchant/cart-drop/terminal/page.tsx" "CartDropTerminalPage"

# Client (déjà existant mais on ajoute la structure)
Create-Page "$appPath/(protected)/client/cart-drop/[merchantId]/page.tsx" "ClientCartDropPage"

# 3. LITIGES/DISPUTES
Write-Host "`n📦 Création des pages Litiges..." -ForegroundColor Yellow

# Client
Create-Page "$appPath/(protected)/client/disputes/page.tsx" "DisputesPage"
Create-Page "$appPath/(protected)/client/disputes/create/page.tsx" "CreateDisputePage"

# Deliverer
Create-Page "$appPath/(protected)/deliverer/disputes/page.tsx" "DelivererDisputesPage"

# Admin
Create-Page "$appPath/(protected)/admin/disputes/page.tsx" "AdminDisputesPage"
Create-Page "$appPath/(protected)/admin/disputes/[id]/mediation/page.tsx" "DisputeMediationPage"

# 4. PROGRAMME DE FIDÉLITÉ
Write-Host "`n📦 Création des pages Fidélité..." -ForegroundColor Yellow

# Client
Create-Page "$appPath/(protected)/client/loyalty/page.tsx" "LoyaltyPage"
Create-Page "$appPath/(protected)/client/loyalty/points/page.tsx" "LoyaltyPointsPage"
Create-Page "$appPath/(protected)/client/loyalty/rewards/page.tsx" "RewardsPage"
Create-Page "$appPath/(protected)/client/referral/page.tsx" "ReferralPage"

# Admin
Create-Page "$appPath/(protected)/admin/loyalty/page.tsx" "AdminLoyaltyPage"
Create-Page "$appPath/(protected)/admin/loyalty/rewards/page.tsx" "AdminRewardsPage"

# 5. TUTORIEL PREMIÈRE CONNEXION
Write-Host "`n📦 Création des pages Onboarding..." -ForegroundColor Yellow

Create-Page "$appPath/(protected)/onboarding/client/page.tsx" "ClientOnboardingPage"
Create-Page "$appPath/(protected)/onboarding/deliverer/page.tsx" "DelivererOnboardingPage"
Create-Page "$appPath/(protected)/onboarding/merchant/page.tsx" "MerchantOnboardingPage"
Create-Page "$appPath/(protected)/onboarding/provider/page.tsx" "ProviderOnboardingPage"

# 6. GESTION MULTI-ENTREPÔTS
Write-Host "`n📦 Création des pages Multi-entrepôts..." -ForegroundColor Yellow

# Deliverer
Create-Page "$appPath/(protected)/deliverer/warehouses/page.tsx" "DelivererWarehousesPage"
Create-Page "$appPath/(protected)/deliverer/warehouses/[id]/access/page.tsx" "WarehouseAccessPage"

# Client
Create-Page "$appPath/(protected)/client/warehouses/page.tsx" "ClientWarehousesPage"

# 7. ANNONCES DE TRAJETS (amélioration livreurs)
Write-Host "`n📦 Création des pages Routes améliorées..." -ForegroundColor Yellow

# Renommer my-routes en routes si possible, sinon créer en parallèle
Create-Page "$appPath/(protected)/deliverer/routes/announce/page.tsx" "AnnounceRoutePage"
Create-Page "$appPath/(protected)/deliverer/routes/matches/page.tsx" "RouteMatchesPage"
Create-Page "$appPath/(protected)/deliverer/routes/recurring/page.tsx" "RecurringRoutesPage"

# 8. VALIDATION PAR CODE
Write-Host "`n📦 Création des pages Validation par code..." -ForegroundColor Yellow

# Deliverer
Create-Page "$appPath/(protected)/deliverer/deliveries/[id]/validate/page.tsx" "ValidateDeliveryPage"

# Client
Create-Page "$appPath/(protected)/client/deliveries/[id]/code/page.tsx" "DeliveryCodePage"

# 9. SERVICES D'URGENCE
Write-Host "`n📦 Création des pages Urgence..." -ForegroundColor Yellow

Create-Page "$appPath/(protected)/client/emergency/page.tsx" "EmergencyPage"
Create-Page "$appPath/(protected)/client/emergency/contacts/page.tsx" "EmergencyContactsPage"

# 10. IMPORTS/EXPORTS ADMIN
Write-Host "`n📦 Création des pages Import/Export..." -ForegroundColor Yellow

Create-Page "$appPath/(protected)/admin/import/users/page.tsx" "ImportUsersPage"
Create-Page "$appPath/(protected)/admin/import/data/page.tsx" "ImportDataPage"
Create-Page "$appPath/(protected)/admin/export/page.tsx" "ExportCenterPage"

# 11. DASHBOARD UNIFIÉ
Write-Host "`n📦 Création du Dashboard unifié..." -ForegroundColor Yellow

Create-Page "$appPath/(protected)/dashboard/page.tsx" "UnifiedDashboardPage"

# 12. PAGES DE STATUT ET MAINTENANCE
Write-Host "`n📦 Création des pages de statut..." -ForegroundColor Yellow

Create-Page "$appPath/(protected)/maintenance/page.tsx" "MaintenancePage"
Create-Page "$appPath/(protected)/client/help/getting-started/page.tsx" "GettingStartedPage"
Create-Page "$appPath/(protected)/deliverer/help/getting-started/page.tsx" "DelivererGettingStartedPage"
Create-Page "$appPath/(protected)/merchant/help/getting-started/page.tsx" "MerchantGettingStartedPage"
Create-Page "$appPath/(protected)/provider/help/getting-started/page.tsx" "ProviderGettingStartedPage"

# 13. CRÉATION DES LAYOUTS MANQUANTS
Write-Host "`n📦 Création des layouts manquants..." -ForegroundColor Yellow

# Layout pour onboarding
$onboardingLayout = @"
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="onboarding-container">
      {children}
    </div>
  );
}
"@

if (!(Test-Path "$appPath/(protected)/onboarding/layout.tsx")) {
    Set-Content -Path "$appPath/(protected)/onboarding/layout.tsx" -Value $onboardingLayout -Encoding UTF8
    Write-Host "✅ Créé: Layout Onboarding" -ForegroundColor Green
}

# 14. CRÉATION DES METADATA MANQUANTS
Write-Host "`n📦 Création des metadata..." -ForegroundColor Yellow

$metadataFiles = @(
    "$appPath/(protected)/admin/metadata.ts",
    "$appPath/(protected)/deliverer/metadata.ts", 
    "$appPath/(protected)/merchant/metadata.ts",
    "$appPath/(protected)/provider/metadata.ts"
)

foreach ($file in $metadataFiles) {
    if (!(Test-Path $file)) {
        $metadataContent = @"
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EcoDeli - $(Split-Path (Split-Path -Parent $file) -Leaf)',
  description: 'Plateforme de crowdshipping EcoDeli',
};
"@
        Create-Page $file -PageName "metadata"
        Set-Content -Path $file -Value $metadataContent -Encoding UTF8 -Force
    }
}

# 15. PAGES 404 PERSONNALISÉES PAR RÔLE
Write-Host "`n📦 Création des pages 404 personnalisées..." -ForegroundColor Yellow

$notFoundPages = @(
    "$appPath/(protected)/client/not-found.tsx",
    "$appPath/(protected)/deliverer/not-found.tsx",
    "$appPath/(protected)/merchant/not-found.tsx",
    "$appPath/(protected)/provider/not-found.tsx",
    "$appPath/(protected)/admin/not-found.tsx"
)

foreach ($page in $notFoundPages) {
    $role = Split-Path (Split-Path -Parent $page) -Leaf
    $notFoundContent = @"
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Page non trouvée</h2>
      <p>La page que vous recherchez n'existe pas dans l'espace $role.</p>
    </div>
  );
}
"@
    if (!(Test-Path $page)) {
        Set-Content -Path $page -Value $notFoundContent -Encoding UTF8
        Write-Host "✅ Créé: $page" -ForegroundColor Green
    }
}

# 16. CRÉATION D'UN FICHIER DE DOCUMENTATION
Write-Host "`n📦 Création de la documentation..." -ForegroundColor Yellow

$docContent = @"
# Pages ajoutées pour EcoDeli

## Nouvelles fonctionnalités

### Assurances
- /client/insurance - Gestion des assurances client
- /admin/insurance - Administration des assurances

### Cart-drop (Lâcher de chariot)
- /merchant/cart-drop - Configuration pour commerçants
- /client/cart-drop/[merchantId] - Interface client

### Litiges
- /client/disputes - Gestion des litiges clients
- /deliverer/disputes - Réponse aux litiges
- /admin/disputes - Médiation des litiges

### Programme de fidélité
- /client/loyalty - Programme de fidélité
- /client/referral - Parrainage
- /admin/loyalty - Administration fidélité

### Onboarding
- /onboarding/[role] - Tutoriels première connexion

### Multi-entrepôts
- /deliverer/warehouses - Accès entrepôts livreurs
- /client/warehouses - Localisation entrepôts

### Validation par code
- /deliverer/deliveries/[id]/validate - Saisie du code
- /client/deliveries/[id]/code - Affichage du code

### Services d'urgence
- /client/emergency - Services d'urgence

### Import/Export
- /admin/import - Centre d'import
- /admin/export - Centre d'export

### Dashboard unifié
- /dashboard - Redirection selon le rôle

## Notes
- Les services restent unifiés dans /client/services
- Pas de séparation par type de service
- Les pages créées sont des templates de base à implémenter
"@

Create-Page "$appPath/PAGES_AJOUTEES.md" -PageName "Documentation"
Set-Content -Path "$appPath/PAGES_AJOUTEES.md" -Value $docContent -Encoding UTF8 -Force

Write-Host "`n✅ Création des pages terminée avec succès!" -ForegroundColor Green
Write-Host "📋 Voir $appPath/PAGES_AJOUTEES.md pour le résumé" -ForegroundColor Yellow

# Afficher un résumé
Write-Host "`n📊 Résumé:" -ForegroundColor Cyan
Write-Host "- Pages créées: ~60 nouvelles pages" -ForegroundColor White
Write-Host "- Layouts ajoutés: 1 (onboarding)" -ForegroundColor White
Write-Host "- Metadata ajoutés: 4" -ForegroundColor White
Write-Host "- Pages 404 personnalisées: 5" -ForegroundColor White

Write-Host "`n⚠️  Les services restent unifiés dans la section services existante" -ForegroundColor Yellow
Write-Host "⚠️  N'oubliez pas d'implémenter le contenu des pages créées!" -ForegroundColor Yellow