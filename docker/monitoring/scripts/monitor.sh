#!/bin/bash

# Script de monitoring simple pour EcoDeli
echo "Service de monitoring EcoDeli démarré..."
echo "Monitoring des services: ${SERVICES_TO_MONITOR:-ecodeli-web,ecodeli-db,ecodeli-nginx}"

while true; do
    echo "$(date): Health check en cours..."
    
    # Vérifier chaque service
    for service in ${SERVICES_TO_MONITOR//,/ }; do
        if docker ps | grep -q "$service"; then
            echo "✓ $service: OK"
        else
            echo "✗ $service: PROBLÈME"
        fi
    done
    
    # Attendre 5 minutes avant le prochain check
    sleep 300
done