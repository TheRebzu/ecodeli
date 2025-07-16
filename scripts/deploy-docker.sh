#!/bin/bash

# Script de déploiement Docker pour EcoDeli

show_help() {
  echo "Usage: $0 [COMMAND]"
  echo ""
  echo "Commands:"
  echo "  start     - Démarrer les services Docker"
  echo "  stop      - Arrêter les services Docker"
  echo "  restart   - Redémarrer les services Docker"
  echo "  build     - Construire les images Docker"
  echo "  logs      - Afficher les logs"
  echo "  status    - Afficher le statut des services"
  echo "  clean     - Nettoyer les ressources Docker"
  echo ""
}

start_services() {
  echo "🚀 Démarrage des services EcoDeli..."
  docker compose --env-file docker.env up -d
  
  if [ $? -eq 0 ]; then
    echo "✅ Services démarrés avec succès"
    echo "📍 Application : http://localhost:3000"
    echo "💾 PgAdmin : http://localhost:8080"
    echo "📊 Grafana : http://localhost:3001"
  else
    echo "❌ Erreur lors du démarrage"
    exit 1
  fi
}

stop_services() {
  echo "🛑 Arrêt des services EcoDeli..."
  docker compose --env-file docker.env down
  echo "✅ Services arrêtés"
}

restart_services() {
  echo "🔄 Redémarrage des services EcoDeli..."
  stop_services
  start_services
}

build_images() {
  echo "🏗️  Construction des images Docker..."
  docker compose --env-file docker.env build --no-cache
  echo "✅ Images construites"
}

show_logs() {
  echo "📋 Logs des services EcoDeli..."
  docker compose --env-file docker.env logs -f
}

show_status() {
  echo "📊 Statut des services EcoDeli..."
  docker compose --env-file docker.env ps
}

clean_resources() {
  echo "🧹 Nettoyage des ressources Docker..."
  docker compose --env-file docker.env down -v
  docker system prune -f
  echo "✅ Nettoyage terminé"
}

# Vérifier que docker.env existe
if [ ! -f "docker.env" ]; then
  echo "❌ Fichier docker.env non trouvé"
  echo "   Créez d'abord le fichier docker.env avec les variables d'environnement"
  exit 1
fi

# Traiter les commandes
case "$1" in
  start)
    start_services
    ;;
  stop)
    stop_services
    ;;
  restart)
    restart_services
    ;;
  build)
    build_images
    ;;
  logs)
    show_logs
    ;;
  status)
    show_status
    ;;
  clean)
    clean_resources
    ;;
  *)
    show_help
    exit 1
    ;;
esac 