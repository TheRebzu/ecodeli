#!/bin/bash

# Script d'installation pour EcoDeli Desktop
echo "📦 === Installation EcoDeli Desktop Analytics ==="

# Variables
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-/opt/ecodeli-desktop}"
BIN_DIR="${BIN_DIR:-/usr/local/bin}"
DESKTOP_DIR="${DESKTOP_DIR:-/usr/share/applications}"
ICON_DIR="${ICON_DIR:-/usr/share/icons}"
USER_INSTALL=false
CREATE_SHORTCUT=true

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help                 Affiche cette aide"
    echo "  -u, --user                 Installation utilisateur (~/Applications)"
    echo "  -p, --prefix DIR           Répertoire d'installation (défaut: /opt/ecodeli-desktop)"
    echo "  --no-shortcut              Ne pas créer de raccourci bureau"
    echo "  --bin-dir DIR              Répertoire des binaires (défaut: /usr/local/bin)"
    echo ""
    echo "Variables d'environnement:"
    echo "  INSTALL_DIR               Répertoire d'installation"
    echo "  BIN_DIR                   Répertoire des binaires"
    echo "  DESKTOP_DIR               Répertoire des fichiers .desktop"
    echo ""
    echo "Exemples:"
    echo "  sudo $0                                    # Installation système"
    echo "  $0 --user                                  # Installation utilisateur"
    echo "  sudo $0 --prefix /usr/local/ecodeli       # Installation personnalisée"
}

# Fonction de vérification des permissions
check_permissions() {
    if [ "$USER_INSTALL" = false ]; then
        if [ "$EUID" -ne 0 ]; then
            echo "❌ Les droits root sont requis pour l'installation système"
            echo "   Utilisez 'sudo $0' ou '--user' pour une installation utilisateur"
            exit 1
        fi
        echo "✅ Droits administrateur détectés"
    else
        # Installation utilisateur
        INSTALL_DIR="$HOME/Applications/EcoDeli-Desktop"
        BIN_DIR="$HOME/.local/bin"
        DESKTOP_DIR="$HOME/.local/share/applications"
        ICON_DIR="$HOME/.local/share/icons"
        echo "👤 Installation utilisateur dans: $INSTALL_DIR"
    fi
}

# Fonction de vérification des prérequis
check_prerequisites() {
    echo "📋 Vérification des prérequis..."
    
    # Vérifier Java
    if ! command -v java &> /dev/null; then
        echo "❌ Java n'est pas installé"
        echo "💡 Installation de Java requise:"
        
        # Détection du gestionnaire de paquets
        if command -v apt-get &> /dev/null; then
            echo "   sudo apt-get update && sudo apt-get install openjdk-17-jre"
        elif command -v yum &> /dev/null; then
            echo "   sudo yum install java-17-openjdk"
        elif command -v pacman &> /dev/null; then
            echo "   sudo pacman -S jre17-openjdk"
        elif command -v brew &> /dev/null; then
            echo "   brew install openjdk@17"
        else
            echo "   Veuillez installer Java 17 ou supérieur manuellement"
        fi
        exit 1
    fi
    
    # Vérifier la version Java
    JAVA_VER=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [ "$JAVA_VER" -lt "17" ]; then
        echo "❌ Java 17 ou supérieur requis (version actuelle: $JAVA_VER)"
        exit 1
    fi
    
    echo "✅ Java $JAVA_VER détecté"
    
    # Vérifier que l'application est buildée
    JAR_FILE="$PROJECT_DIR/target/ecodeli-desktop-1.0.0-jar-with-dependencies.jar"
    if [ ! -f "$JAR_FILE" ]; then
        echo "❌ Application non buildée"
        echo "💡 Buildez d'abord l'application:"
        echo "   ./scripts/build.sh"
        exit 1
    fi
    
    echo "✅ Application buildée trouvée"
}

# Fonction de création des répertoires
create_directories() {
    echo "📁 Création des répertoires..."
    
    mkdir -p "$INSTALL_DIR" || {
        echo "❌ Impossible de créer $INSTALL_DIR"
        exit 1
    }
    
    mkdir -p "$BIN_DIR" || {
        echo "❌ Impossible de créer $BIN_DIR"
        exit 1
    }
    
    if [ "$CREATE_SHORTCUT" = true ]; then
        mkdir -p "$DESKTOP_DIR" || {
            echo "❌ Impossible de créer $DESKTOP_DIR"
            exit 1
        }
        
        mkdir -p "$ICON_DIR" || {
            echo "❌ Impossible de créer $ICON_DIR"
            exit 1
        }
    fi
    
    echo "✅ Répertoires créés"
}

# Fonction de copie des fichiers
copy_files() {
    echo "📋 Copie des fichiers..."
    
    # Copier le JAR principal
    cp "$PROJECT_DIR/target/ecodeli-desktop-1.0.0-jar-with-dependencies.jar" \
       "$INSTALL_DIR/ecodeli-desktop.jar" || {
        echo "❌ Erreur lors de la copie du JAR"
        exit 1
    }
    
    # Copier les scripts
    cp "$PROJECT_DIR/scripts/run.sh" "$INSTALL_DIR/run.sh" || {
        echo "❌ Erreur lors de la copie du script de lancement"
        exit 1
    }
    
    chmod +x "$INSTALL_DIR/run.sh"
    
    # Copier la documentation si elle existe
    if [ -f "$PROJECT_DIR/README.md" ]; then
        cp "$PROJECT_DIR/README.md" "$INSTALL_DIR/"
    fi
    
    if [ -f "$PROJECT_DIR/LICENSE" ]; then
        cp "$PROJECT_DIR/LICENSE" "$INSTALL_DIR/"
    fi
    
    echo "✅ Fichiers copiés"
}

# Fonction de création du script de lancement
create_launcher_script() {
    echo "🚀 Création du script de lancement..."
    
    cat > "$BIN_DIR/ecodeli-desktop" << EOF
#!/bin/bash
# EcoDeli Desktop Analytics Launcher
cd "$INSTALL_DIR"
java -jar "$INSTALL_DIR/ecodeli-desktop.jar" "\$@"
EOF
    
    chmod +x "$BIN_DIR/ecodeli-desktop" || {
        echo "❌ Erreur lors de la création du lanceur"
        exit 1
    }
    
    echo "✅ Script de lancement créé: $BIN_DIR/ecodeli-desktop"
}

# Fonction de création du raccourci bureau
create_desktop_shortcut() {
    if [ "$CREATE_SHORTCUT" = false ]; then
        return
    fi
    
    echo "🖥️ Création du raccourci bureau..."
    
    # Créer un icône simple (peut être remplacé par un vrai icône)
    cat > "$DESKTOP_DIR/ecodeli-desktop.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=EcoDeli Desktop Analytics
Comment=Dashboard analytics pour la plateforme EcoDeli
Icon=applications-development
Exec=$BIN_DIR/ecodeli-desktop
Terminal=false
Categories=Office;Development;
Keywords=ecodeli;analytics;dashboard;business;
StartupNotify=true
EOF
    
    chmod +x "$DESKTOP_DIR/ecodeli-desktop.desktop" || {
        echo "❌ Erreur lors de la création du raccourci"
        exit 1
    }
    
    echo "✅ Raccourci bureau créé"
}

# Fonction de création du service systemd (optionnel)
create_systemd_service() {
    if [ "$USER_INSTALL" = true ]; then
        return
    fi
    
    read -p "🔧 Créer un service systemd ? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi
    
    echo "🔧 Création du service systemd..."
    
    cat > "/etc/systemd/system/ecodeli-desktop.service" << EOF
[Unit]
Description=EcoDeli Desktop Analytics Service
After=network.target

[Service]
Type=simple
User=ecodeli
Group=ecodeli
WorkingDirectory=$INSTALL_DIR
ExecStart=$BIN_DIR/ecodeli-desktop --api-url http://localhost:3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    echo "✅ Service systemd créé (désactivé par défaut)"
    echo "💡 Pour activer: sudo systemctl enable ecodeli-desktop"
    echo "💡 Pour démarrer: sudo systemctl start ecodeli-desktop"
}

# Fonction de vérification de l'installation
verify_installation() {
    echo "🔍 Vérification de l'installation..."
    
    # Vérifier les fichiers
    if [ ! -f "$INSTALL_DIR/ecodeli-desktop.jar" ]; then
        echo "❌ JAR principal manquant"
        return 1
    fi
    
    if [ ! -f "$BIN_DIR/ecodeli-desktop" ]; then
        echo "❌ Script de lancement manquant"
        return 1
    fi
    
    if [ ! -x "$BIN_DIR/ecodeli-desktop" ]; then
        echo "❌ Script de lancement non exécutable"
        return 1
    fi
    
    # Test de lancement rapide
    if timeout 10s "$BIN_DIR/ecodeli-desktop" --help &>/dev/null; then
        echo "✅ Test de lancement réussi"
    else
        echo "⚠️ Test de lancement échoué (peut être normal si l'aide n'est pas implémentée)"
    fi
    
    echo "✅ Installation vérifiée"
}

# Fonction d'affichage des informations post-installation
show_installation_info() {
    echo ""
    echo "🎉 === Installation Terminée ==="
    echo "📁 Répertoire d'installation: $INSTALL_DIR"
    echo "🚀 Commande de lancement: ecodeli-desktop"
    
    if [ "$USER_INSTALL" = false ]; then
        echo "👥 Installation système (tous les utilisateurs)"
    else
        echo "👤 Installation utilisateur"
        echo "💡 Ajoutez $BIN_DIR à votre PATH si nécessaire:"
        echo "   echo 'export PATH=\"$BIN_DIR:\$PATH\"' >> ~/.bashrc"
    fi
    
    echo ""
    echo "🎯 Pour lancer l'application:"
    echo "   ecodeli-desktop"
    echo "   ou"
    echo "   ecodeli-desktop --api-url http://your-api-server:3000"
    
    if [ "$CREATE_SHORTCUT" = true ]; then
        echo ""
        echo "🖥️ Un raccourci bureau a été créé"
    fi
    
    echo ""
    echo "📖 Pour désinstaller:"
    echo "   $PROJECT_DIR/scripts/uninstall.sh"
}

# Analyse des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--user)
            USER_INSTALL=true
            shift
            ;;
        -p|--prefix)
            INSTALL_DIR="$2"
            shift 2
            ;;
        --no-shortcut)
            CREATE_SHORTCUT=false
            shift
            ;;
        --bin-dir)
            BIN_DIR="$2"
            shift 2
            ;;
        *)
            echo "❌ Option inconnue: $1"
            echo "Utilisez --help pour voir les options disponibles"
            exit 1
            ;;
    esac
done

# Exécution principale
main() {
    check_permissions
    check_prerequisites
    create_directories
    copy_files
    create_launcher_script
    create_desktop_shortcut
    create_systemd_service
    verify_installation
    show_installation_info
}

# Point d'entrée
main "$@"