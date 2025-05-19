import { NextRequest } from 'next/server';
import { createServer } from 'http';
import { isServer } from '@/socket';

// Cette API Route gère les connexions WebSocket pour Socket.IO
// Next.js 14+ utilise un système d'API Routes avec support WebSocket
export async function GET(req: NextRequest) {
  // Cette route est conçue pour être appelée via un WebSocket upgrade
  if (!isServer) {
    return new Response('Socket.IO ne peut être initialisé que côté serveur', { status: 500 });
  }

  // Import dynamique côté serveur uniquement
  const { initializeSocketServer } = await import('@/socket/server');
  
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Cette route est uniquement pour les connexions WebSocket', { status: 426 });
  }

  try {
    // Créer un serveur HTTP temporaire pour Socket.IO
    const httpServer = createServer();
    
    // Initialiser Socket.IO sur ce serveur
    const io = await initializeSocketServer(httpServer);
    
    // Gérer la mise à niveau WebSocket
    const { socket, response } = (await new Promise((resolve) => {
      let resolved = false;
      
      // Socket.IO devrait gérer cette connexion
      io.engine.on('connection', (socket) => {
        if (!resolved) {
          resolved = true;
          resolve({ socket, response: new Response(null) });
        }
      });
      
      // En cas d'échec, retourner une erreur après un délai
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ socket: null, response: new Response('Erreur de connexion WebSocket', { status: 500 }) });
        }
      }, 5000);
    })) as { socket: any; response: Response };
    
    return response;
  } catch (error) {
    console.error('Erreur lors de la configuration de Socket.IO:', error);
    return new Response('Erreur interne du serveur', { status: 500 });
  }
}

// Cette réponse informative est retournée pour les requêtes HTTP standard
export async function POST() {
  return new Response('Endpoint Socket.IO - Utilisez une connexion WebSocket', { status: 200 });
} 