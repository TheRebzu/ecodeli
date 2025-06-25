#!/bin/bash
# Script Bash pour configurer la base de données EcoDeli avec Docker (WSL)

echo "🐳 Configuration de la base de données EcoDeli avec Docker..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    echo "💡 Installation de Docker pour WSL..."
    echo "Exécutez ces commandes dans WSL :"
    echo "  sudo apt update"
    echo "  sudo apt install docker.io docker-compose"
    echo "  sudo usermod -aG docker \$USER"
    echo "  newgrp docker"
    exit 1
fi

echo "✅ Docker détecté: $(docker --version)"

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

echo "✅ Docker Compose détecté"

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

# Demander si supprimer les volumes
read -p "Voulez-vous supprimer les données existantes ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ Suppression des volumes..."
    docker-compose down -v 2>/dev/null || docker compose down -v 2>/dev/null || true
    docker volume prune -f
fi

# Démarrer les services
echo "🚀 Démarrage des services PostgreSQL..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de la disponibilité de PostgreSQL..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    sleep 2
    
    if docker exec ecodeli_postgres pg_isready -U postgres -d ecodeli >/dev/null 2>&1; then
        echo "✅ PostgreSQL est prêt!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Timeout: PostgreSQL n'est pas disponible après $max_attempts tentatives"
        exit 1
    fi
    
    echo "⏳ Tentative $attempt/$max_attempts..."
done

# Afficher les informations de connexion
echo ""
echo "🎉 Base de données EcoDeli configurée avec succès!"
echo ""
echo "📊 Informations de connexion:"
echo "  🔗 Host: localhost"
echo "  🔢 Port: 5432"
echo "  🗄️ Database: ecodeli"
echo "  👤 Username: postgres"
echo "  🔑 Password: password"
echo "  📄 Connection String: postgresql://postgres:password@localhost:5432/ecodeli?schema=public"
echo ""
echo "🌐 pgAdmin (Interface Web):"
echo "  🔗 URL: http://localhost:8080"
echo "  📧 Email: admin@ecodeli.com"
echo "  🔑 Password: admin123"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Exécuter: npx prisma migrate dev"
echo "  2. Exécuter: npx prisma db seed"
echo "  3. Redémarrer le serveur Next.js"
echo ""
echo "🐳 Commandes utiles:"
echo "  • Voir les logs: docker-compose logs -f (ou docker compose logs -f)"
echo "  • Arrêter: docker-compose down (ou docker compose down)"
echo "  • Redémarrer: docker-compose restart (ou docker compose restart)"
echo "  • Accès PostgreSQL: docker exec -it ecodeli_postgres psql -U postgres -d ecodeli" 