#!/bin/bash

# Script de build pour EcoDeli Android
# Usage: ./scripts/build.sh [debug|release]

set -e

# Configuration
BUILD_TYPE=${1:-debug}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🏗️  Building EcoDeli Android - $BUILD_TYPE"
echo "Project directory: $PROJECT_DIR"

# Aller dans le répertoire du projet
cd "$PROJECT_DIR"

# Nettoyer le projet
echo "🧹 Cleaning project..."
./gradlew clean

# Vérifier les dépendances
echo "🔍 Checking dependencies..."
./gradlew dependencies --configuration debugRuntimeClasspath

# Lancer les tests unitaires
echo "🧪 Running unit tests..."
./gradlew testDebugUnitTest

# Build selon le type
if [ "$BUILD_TYPE" = "release" ]; then
    echo "🚀 Building release APK..."
    
    # Vérifier que les clés de signature sont présentes
    if [ ! -f "keystore.jks" ]; then
        echo "❌ Error: keystore.jks not found for release build"
        echo "Please generate a keystore first:"
        echo "keytool -genkey -v -keystore keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ecodeli"
        exit 1
    fi
    
    # Build release
    ./gradlew assembleRelease
    
    # Vérifier l'APK
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        echo "✅ Release APK built successfully: $APK_PATH"
        
        # Afficher la taille de l'APK
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo "📦 APK size: $APK_SIZE"
        
        # Optionnel: Uploader vers Play Console
        if [ "$UPLOAD_TO_PLAY" = "true" ] && [ -f "play-console-key.json" ]; then
            echo "📤 Uploading to Google Play Console..."
            # Utiliser l'API Google Play Developer pour uploader
            # Nécessite fastlane ou un script personnalisé
        fi
    else
        echo "❌ Error: Release APK not found"
        exit 1
    fi
    
else
    echo "🔧 Building debug APK..."
    ./gradlew assembleDebug
    
    # Vérifier l'APK
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        echo "✅ Debug APK built successfully: $APK_PATH"
        
        # Afficher la taille de l'APK
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo "📦 APK size: $APK_SIZE"
        
        # Optionnel: Installer sur un appareil connecté
        if [ "$INSTALL_ON_DEVICE" = "true" ]; then
            echo "📱 Installing on connected device..."
            adb install -r "$APK_PATH"
        fi
    else
        echo "❌ Error: Debug APK not found"
        exit 1
    fi
fi

echo "🎉 Build completed successfully!"

# Afficher les informations de l'APK
echo ""
echo "📊 Build Summary:"
echo "=================="
echo "Build type: $BUILD_TYPE"
echo "APK location: $APK_PATH"
echo "APK size: $APK_SIZE"

# Générer le rapport de build
BUILD_REPORT="build_report_$(date +%Y%m%d_%H%M%S).txt"
echo "Generating build report: $BUILD_REPORT"

cat > "$BUILD_REPORT" << EOF
EcoDeli Android Build Report
===========================
Date: $(date)
Build Type: $BUILD_TYPE
APK Path: $APK_PATH
APK Size: $APK_SIZE
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")

Build Configuration:
- Min SDK: 24
- Target SDK: 34
- Compile SDK: 34
- Version Code: $(grep "versionCode" app/build.gradle.kts | head -1 | sed 's/.*= //' | sed 's/ .*//')
- Version Name: $(grep "versionName" app/build.gradle.kts | head -1 | sed 's/.*= "//' | sed 's/".*//')

Dependencies:
$(./gradlew dependencies --configuration debugRuntimeClasspath 2>/dev/null | grep -E "^[+\\\\]" | head -20)
EOF

echo "✅ Build report saved to: $BUILD_REPORT"