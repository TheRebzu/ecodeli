#!/bin/bash

# Script de déploiement pour EcoDeli Android
# Usage: ./scripts/deploy.sh [staging|production]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Deploying EcoDeli Android to $ENVIRONMENT"
echo "Project directory: $PROJECT_DIR"

# Aller dans le répertoire du projet
cd "$PROJECT_DIR"

# Vérifications préliminaires
echo "🔍 Pre-deployment checks..."

# Vérifier que nous sommes sur la bonne branche
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
if [ "$ENVIRONMENT" = "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Production deployment must be from 'main' branch"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Vérifier qu'il n'y a pas de changements non commités
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: Uncommitted changes detected"
    echo "Please commit or stash your changes before deploying"
    exit 1
fi

# Vérifier les fichiers de configuration requis
if [ "$ENVIRONMENT" = "production" ]; then
    if [ ! -f "keystore.jks" ]; then
        echo "❌ Error: Production keystore not found"
        exit 1
    fi
    
    if [ ! -f "google-services.json" ]; then
        echo "❌ Error: google-services.json not found"
        exit 1
    fi
fi

# Fonction de déploiement staging
deploy_staging() {
    echo "🔧 Deploying to staging..."
    
    # Build debug
    echo "🏗️  Building debug version..."
    ./gradlew assembleDebug
    
    # Exécuter les tests
    echo "🧪 Running tests..."
    ./gradlew testDebugUnitTest
    
    # Déployer vers Firebase App Distribution
    if command -v firebase >/dev/null 2>&1; then
        echo "📤 Uploading to Firebase App Distribution..."
        
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
        RELEASE_NOTES="Staging build from branch $CURRENT_BRANCH at $(date)"
        
        firebase appdistribution:distribute "$APK_PATH" \
            --app "1:123456789:android:abcdef" \
            --groups "internal-testers" \
            --release-notes "$RELEASE_NOTES"
            
        echo "✅ Staging deployment successful!"
    else
        echo "⚠️  Firebase CLI not found, skipping App Distribution upload"
        echo "📱 APK available at: app/build/outputs/apk/debug/app-debug.apk"
    fi
}

# Fonction de déploiement production
deploy_production() {
    echo "🚀 Deploying to production..."
    
    # Vérifications supplémentaires pour la production
    echo "🔒 Additional production checks..."
    
    # Vérifier les variables d'environnement
    if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ] || [ -z "$KEY_PASSWORD" ]; then
        echo "❌ Error: Keystore credentials not set"
        echo "Required environment variables: KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD"
        exit 1
    fi
    
    # Créer un tag Git pour cette release
    VERSION_NAME=$(grep "versionName" app/build.gradle.kts | head -1 | sed 's/.*= "//' | sed 's/".*//')
    TAG_NAME="v$VERSION_NAME-$TIMESTAMP"
    
    echo "🏷️  Creating Git tag: $TAG_NAME"
    git tag -a "$TAG_NAME" -m "Production release $VERSION_NAME"
    
    # Build release
    echo "🏗️  Building release version..."
    ./gradlew assembleRelease
    
    # Exécuter tous les tests
    echo "🧪 Running comprehensive tests..."
    ./gradlew testReleaseUnitTest
    ./gradlew lintRelease
    
    # Signer l'APK si nécessaire
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    
    # Générer l'AAB pour le Play Store
    echo "📦 Building Android App Bundle..."
    ./gradlew bundleRelease
    
    AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
    
    # Déployer vers Google Play Console
    if [ -f "play-console-key.json" ] && command -v fastlane >/dev/null 2>&1; then
        echo "📤 Uploading to Google Play Console..."
        
        fastlane supply \
            --aab "$AAB_PATH" \
            --track "internal" \
            --json_key "play-console-key.json" \
            --package_name "me.ecodeli"
            
        echo "✅ Production deployment successful!"
        echo "🎉 App uploaded to Google Play Console (Internal Testing track)"
    else
        echo "⚠️  Fastlane or Play Console key not found"
        echo "📱 Manual upload required:"
        echo "   APK: $APK_PATH"
        echo "   AAB: $AAB_PATH"
    fi
    
    # Pousser le tag
    git push origin "$TAG_NAME"
    
    # Notifier l'équipe (Slack, Discord, etc.)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 EcoDeli Android $VERSION_NAME deployed to production! Tag: $TAG_NAME\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Exécuter le déploiement selon l'environnement
case $ENVIRONMENT in
    "staging")
        deploy_staging
        ;;
    "production")
        # Confirmation pour la production
        echo "⚠️  You are about to deploy to PRODUCTION"
        echo "Current branch: $CURRENT_BRANCH"
        echo "Version: $(grep "versionName" app/build.gradle.kts | head -1 | sed 's/.*= "//' | sed 's/".*//')"
        echo ""
        read -p "Are you sure you want to proceed? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            deploy_production
        else
            echo "❌ Deployment cancelled"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Valid options: staging, production"
        exit 1
        ;;
esac

# Générer le rapport de déploiement
DEPLOYMENT_REPORT="deployment_report_${ENVIRONMENT}_${TIMESTAMP}.txt"
echo ""
echo "📋 Generating deployment report: $DEPLOYMENT_REPORT"

cat > "$DEPLOYMENT_REPORT" << EOF
EcoDeli Android Deployment Report
=================================
Date: $(date)
Environment: $ENVIRONMENT
Branch: $CURRENT_BRANCH
Commit: $(git rev-parse HEAD)
Version: $(grep "versionName" app/build.gradle.kts | head -1 | sed 's/.*= "//' | sed 's/".*//')
Version Code: $(grep "versionCode" app/build.gradle.kts | head -1 | sed 's/.*= //' | sed 's/ .*//')

Deployment Status: SUCCESS
EOF

if [ "$ENVIRONMENT" = "production" ]; then
    echo "Git Tag: $TAG_NAME" >> "$DEPLOYMENT_REPORT"
    echo "AAB Path: $AAB_PATH" >> "$DEPLOYMENT_REPORT"
fi

echo "APK Path: $APK_PATH" >> "$DEPLOYMENT_REPORT"

echo "✅ Deployment completed successfully!"
echo "📄 Full report: $DEPLOYMENT_REPORT"