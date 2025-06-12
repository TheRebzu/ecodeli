#!/bin/bash

# Script de tests pour EcoDeli Android
# Usage: ./scripts/test.sh [unit|integration|all]

set -e

# Configuration
TEST_TYPE=${1:-all}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🧪 Running EcoDeli Android Tests - $TEST_TYPE"
echo "Project directory: $PROJECT_DIR"

# Aller dans le répertoire du projet
cd "$PROJECT_DIR"

# Fonction pour exécuter les tests unitaires
run_unit_tests() {
    echo "🔬 Running unit tests..."
    ./gradlew testDebugUnitTest
    
    # Générer le rapport de couverture
    echo "📊 Generating test coverage report..."
    ./gradlew jacocoTestReport
    
    # Afficher les résultats
    UNIT_RESULTS="app/build/reports/tests/testDebugUnitTest/index.html"
    if [ -f "$UNIT_RESULTS" ]; then
        echo "✅ Unit test results: $UNIT_RESULTS"
    fi
    
    COVERAGE_RESULTS="app/build/reports/jacoco/jacocoTestReport/html/index.html"
    if [ -f "$COVERAGE_RESULTS" ]; then
        echo "📈 Coverage report: $COVERAGE_RESULTS"
    fi
}

# Fonction pour exécuter les tests d'intégration
run_integration_tests() {
    echo "🔗 Running integration tests..."
    
    # Vérifier qu'un émulateur ou appareil est connecté
    DEVICES=$(adb devices | grep -v "List of devices" | wc -l)
    if [ "$DEVICES" -eq 0 ]; then
        echo "❌ No Android device/emulator found"
        echo "Please start an emulator or connect a device"
        exit 1
    fi
    
    echo "📱 Found $DEVICES Android device(s)"
    
    # Exécuter les tests instrumentés
    ./gradlew connectedDebugAndroidTest
    
    # Afficher les résultats
    INTEGRATION_RESULTS="app/build/reports/androidTests/connected/index.html"
    if [ -f "$INTEGRATION_RESULTS" ]; then
        echo "✅ Integration test results: $INTEGRATION_RESULTS"
    fi
}

# Fonction pour exécuter l'analyse statique
run_static_analysis() {
    echo "🔍 Running static analysis..."
    
    # Lint Android
    echo "🧹 Running Android Lint..."
    ./gradlew lintDebug
    
    LINT_RESULTS="app/build/reports/lint-results-debug.html"
    if [ -f "$LINT_RESULTS" ]; then
        echo "📋 Lint report: $LINT_RESULTS"
    fi
    
    # Détekt (analyse statique Kotlin)
    if grep -q "detekt" build.gradle.kts; then
        echo "🔎 Running Detekt..."
        ./gradlew detekt
        
        DETEKT_RESULTS="app/build/reports/detekt/detekt.html"
        if [ -f "$DETEKT_RESULTS" ]; then
            echo "🔍 Detekt report: $DETEKT_RESULTS"
        fi
    fi
}

# Exécuter les tests selon le type demandé
case $TEST_TYPE in
    "unit")
        run_unit_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "static")
        run_static_analysis
        ;;
    "all")
        run_unit_tests
        run_static_analysis
        
        # Demander si on veut exécuter les tests d'intégration
        read -p "Run integration tests? (requires device/emulator) [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_integration_tests
        fi
        ;;
    *)
        echo "❌ Invalid test type: $TEST_TYPE"
        echo "Valid options: unit, integration, static, all"
        exit 1
        ;;
esac

# Générer un rapport de synthèse
REPORT_FILE="test_report_$(date +%Y%m%d_%H%M%S).txt"
echo ""
echo "📋 Generating test summary report: $REPORT_FILE"

cat > "$REPORT_FILE" << EOF
EcoDeli Android Test Report
===========================
Date: $(date)
Test Type: $TEST_TYPE
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")

Test Results:
EOF

# Ajouter les résultats des tests unitaires si disponibles
if [ -f "app/build/test-results/testDebugUnitTest/TEST-*.xml" ]; then
    UNIT_TESTS=$(grep -o 'tests="[0-9]*"' app/build/test-results/testDebugUnitTest/TEST-*.xml | head -1 | grep -o '[0-9]*')
    UNIT_FAILURES=$(grep -o 'failures="[0-9]*"' app/build/test-results/testDebugUnitTest/TEST-*.xml | head -1 | grep -o '[0-9]*')
    echo "Unit Tests: $UNIT_TESTS total, $UNIT_FAILURES failures" >> "$REPORT_FILE"
fi

# Ajouter les résultats Lint si disponibles
if [ -f "app/build/reports/lint-results-debug.xml" ]; then
    LINT_ERRORS=$(grep -c 'severity="Error"' app/build/reports/lint-results-debug.xml 2>/dev/null || echo "0")
    LINT_WARNINGS=$(grep -c 'severity="Warning"' app/build/reports/lint-results-debug.xml 2>/dev/null || echo "0")
    echo "Lint: $LINT_ERRORS errors, $LINT_WARNINGS warnings" >> "$REPORT_FILE"
fi

echo ""
echo "🎉 Tests completed!"
echo "📄 Full report: $REPORT_FILE"

# Ouvrir les rapports en option
if command -v open >/dev/null 2>&1; then
    read -p "Open test reports in browser? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        [ -f "app/build/reports/tests/testDebugUnitTest/index.html" ] && open "app/build/reports/tests/testDebugUnitTest/index.html"
        [ -f "app/build/reports/lint-results-debug.html" ] && open "app/build/reports/lint-results-debug.html"
    fi
fi