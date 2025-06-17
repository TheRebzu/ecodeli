import { initializeApp, getApps, cert, ServiceAccount } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import { getMessaging, Messaging } from "firebase-admin/messaging";

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket?: string;
  databaseURL?: string;
}

class FirebaseService {
  private auth: Auth | null = null;
  private firestore: Firestore | null = null;
  private storage: Storage | null = null;
  private messaging: Messaging | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        console.warn("[Firebase] Configuration incomplète - service désactivé");
        console.warn("Variables requises: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
        return;
      }

      // Éviter la réinitialisation si l'app existe déjà
      if (getApps().length === 0) {
        const serviceAccount: ServiceAccount = {
          projectId,
          clientEmail,
          privateKey,
        };

        const app = initializeApp({
          credential: cert(serviceAccount),
          projectId,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
          databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`,
        });

        this.auth = getAuth(app);
        this.firestore = getFirestore(app);
        this.storage = getStorage(app);
        this.messaging = getMessaging(app);
      } else {
        // Utiliser l'app existante
        const app = getApps()[0];
        this.auth = getAuth(app);
        this.firestore = getFirestore(app);
        this.storage = getStorage(app);
        this.messaging = getMessaging(app);
      }

      this.isConfigured = true;
      console.log("[Firebase] Service initialisé avec succès");
    } catch (error) {
      console.error("[Firebase] Erreur d'initialisation:", error);
      this.isConfigured = false;
    }
  }

  // === AUTHENTICATION ===
  async verifyIdToken(idToken: string) {
    if (!this.auth) {
      throw new Error("Firebase Auth non initialisé");
    }
    
    try {
      return await this.auth.verifyIdToken(idToken);
    } catch (error) {
      console.error("[Firebase Auth] Erreur vérification token:", error);
      throw error;
    }
  }

  async createCustomToken(uid: string, additionalClaims?: object) {
    if (!this.auth) {
      throw new Error("Firebase Auth non initialisé");
    }
    
    try {
      return await this.auth.createCustomToken(uid, additionalClaims);
    } catch (error) {
      console.error("[Firebase Auth] Erreur création token:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    if (!this.auth) {
      throw new Error("Firebase Auth non initialisé");
    }
    
    try {
      return await this.auth.getUserByEmail(email);
    } catch (error) {
      console.error("[Firebase Auth] Erreur récupération utilisateur:", error);
      return null;
    }
  }

  // === FIRESTORE ===
  getFirestore() {
    if (!this.firestore) {
      throw new Error("Firestore non initialisé");
    }
    return this.firestore;
  }

  async saveDocument(collection: string, docId: string, data: any) {
    if (!this.firestore) {
      console.warn("[Firestore] Service non initialisé");
      return false;
    }
    
    try {
      await this.firestore.collection(collection).doc(docId).set(data);
      return true;
    } catch (error) {
      console.error("[Firestore] Erreur sauvegarde:", error);
      return false;
    }
  }

  async getDocument(collection: string, docId: string) {
    if (!this.firestore) {
      console.warn("[Firestore] Service non initialisé");
      return null;
    }
    
    try {
      const doc = await this.firestore.collection(collection).doc(docId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error("[Firestore] Erreur récupération:", error);
      return null;
    }
  }

  // === STORAGE ===
  async uploadFile(filePath: string, buffer: Buffer, metadata?: any) {
    if (!this.storage) {
      console.warn("[Firebase Storage] Service non initialisé");
      return null;
    }
    
    try {
      const bucket = this.storage.bucket();
      const file = bucket.file(filePath);
      
      await file.save(buffer, {
        metadata: metadata || {},
        public: false,
      });
      
      // Générer URL de téléchargement
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 jours
      });
      
      return url;
    } catch (error) {
      console.error("[Firebase Storage] Erreur upload:", error);
      return null;
    }
  }

  // === MESSAGING ===
  async sendNotification(message: {
    token?: string;
    topic?: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    if (!this.messaging) {
      console.warn("[Firebase Messaging] Service non initialisé");
      return false;
    }
    
    try {
      const messagePayload: any = {
        notification: {
          title: message.title,
          body: message.body,
        },
        data: message.data || {},
      };

      if (message.token) {
        messagePayload.token = message.token;
      } else if (message.topic) {
        messagePayload.topic = message.topic;
      } else {
        throw new Error("Token ou topic requis");
      }

      const response = await this.messaging.send(messagePayload);
      console.log("[Firebase Messaging] Message envoyé:", response);
      return true;
    } catch (error) {
      console.error("[Firebase Messaging] Erreur envoi:", error);
      return false;
    }
  }

  // === ANALYTICS CUSTOM ===
  async logEvent(eventName: string, parameters: Record<string, any>, userId?: string) {
    if (!this.firestore) {
      console.warn("[Firebase Analytics] Firestore non initialisé");
      return false;
    }
    
    try {
      const eventData = {
        eventName,
        parameters,
        userId,
        timestamp: new Date(),
        app: "ecodeli",
      };
      
      await this.firestore.collection("analytics_events").add(eventData);
      return true;
    } catch (error) {
      console.error("[Firebase Analytics] Erreur log:", error);
      return false;
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

// Instance singleton
export const firebaseService = new FirebaseService();

// Helper functions
export const getFirebaseAuth = () => firebaseService;
export const getFirebaseFirestore = () => firebaseService.getFirestore();
export const uploadToFirebaseStorage = (filePath: string, buffer: Buffer, metadata?: any) => 
  firebaseService.uploadFile(filePath, buffer, metadata);
export const sendFirebaseNotification = (message: any) => 
  firebaseService.sendNotification(message);
export const logFirebaseEvent = (eventName: string, parameters: Record<string, any>, userId?: string) => 
  firebaseService.logEvent(eventName, parameters, userId);

export default firebaseService;