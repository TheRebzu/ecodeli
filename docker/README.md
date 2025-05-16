# Configuration Docker pour EcoDeli

Cette documentation explique comment déployer le projet EcoDeli à l'aide de Docker, conformément aux exigences du cahier des charges stipulant que "Les parties 1 et 2 doivent être déployées via docker en cas de panne".

## Structure des fichiers

```
docker/
├── Dockerfile                # Dockerfile principal multi-stage pour l'application Next.js
├── docker-compose.yml        # Configuration docker-compose de développement
├── docker-compose.prod.yml   # Configuration docker-compose optimisée pour la production
├── entrypoint.sh             # Script d'entrée pour exécuter les migrations et démarrer l'application
├── backup-scripts/
│   └── backup.sh             # Script de sauvegarde automatique de la base de données
├── postgres/
│   ├── init.sql              # Script d'initialisation de PostgreSQL
│   └── postgresql.conf       # Configuration optimisée pour PostgreSQL
├── nginx/
│   ├── nginx.conf            # Configuration globale de Nginx
│   └── conf.d/
│       └── default.conf      # Configuration du site EcoDeli
└── README.md                 # Documentation (ce fichier)
```

## Prérequis

- Docker Engine 24.x ou supérieur
- Docker Compose v2.x ou supérieur
- Au moins 4 Go de RAM disponible sur la machine hôte
- Accès réseau pour télécharger les images Docker

## Configuration

1. Copiez le fichier `.env.example` vers `.env` et configurez les variables d'environnement :

```bash
cp docker/.env.example docker/.env
```

2. Modifiez les variables d'environnement selon votre environnement :

```
# Variables essentielles à configurer
POSTGRES_PASSWORD=changez_moi
REDIS_PASSWORD=changez_moi_aussi
NEXTAUTH_SECRET=une_clé_secrète_de_32_caractères_aléatoires
NEXTAUTH_URL=http://votre-domaine.com
```

## Déploiement en développement

Pour démarrer l'environnement de développement :

```bash
cd docker
docker-compose up -d
```

L'application sera accessible à l'adresse [http://localhost:3000](http://localhost:3000).

## Déploiement en production

Pour un environnement de production :

```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

## Sauvegarde et restauration

### Sauvegarde manuelle

Pour effectuer une sauvegarde manuelle de la base de données :

```bash
docker exec ecodeli-backup /scripts/run-backup.sh
```

Les sauvegardes sont stockées dans le volume Docker `postgres-backup`.

### Restauration

Pour restaurer une sauvegarde :

```bash
# Arrêter l'application
docker-compose -f docker-compose.prod.yml stop web

# Restaurer la base de données
docker exec -it ecodeli-postgres bash
zcat /backups/ecodeli_20250101_120000.sql.gz | psql -U postgres -d ecodeli

# Redémarrer l'application
docker-compose -f docker-compose.prod.yml start web
```

## Maintenance

### Logs

Pour consulter les logs de l'application :

```bash
docker logs -f ecodeli-app
```

### Mise à jour

Pour mettre à jour l'application :

```bash
# Arrêter les conteneurs
docker-compose -f docker-compose.prod.yml down

# Reconstruire l'image avec les dernières modifications
docker-compose -f docker-compose.prod.yml build --no-cache web

# Redémarrer les conteneurs
docker-compose -f docker-compose.prod.yml up -d
```

## Déploiement sur l'infrastructure réseau spécifiée

Conformément au cahier des charges, cette configuration Docker permet un déploiement rapide sur l'infrastructure spécifiée d'EcoDeli :

1. Sur le site principal de Paris (110, rue de Flandre, 19ème arrondissement)
2. Sur le site de Lyon pour le backup des serveurs

La configuration assure :

- Une haute disponibilité de l'application
- Des sauvegardes automatiques journalières
- Une restauration rapide en cas de panne

## Résolution des problèmes courants

### L'application ne démarre pas

Vérifiez les logs :

```bash
docker logs ecodeli-app
```

### Erreur de connexion à la base de données

Vérifiez que PostgreSQL est en cours d'exécution et accessible :

```bash
docker exec ecodeli-postgres pg_isready -U postgres
```

### Problèmes de performances

Ajustez les limites de ressources dans le fichier `docker-compose.prod.yml` selon votre infrastructure.
