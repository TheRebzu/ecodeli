#!/bin/bash

# Installation des dépendances
npm install

# Génération des types Prisma
npx prisma generate

# Configuration de l'environnement
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Migration de la base de données
npx prisma migrate dev

# Build du projet
npm run build
