// Vérifie si l'environnement est en production
import { mockDb } from './db-mock';

// Exporter le mock dans tous les cas pour le développement
export const db = mockDb; 