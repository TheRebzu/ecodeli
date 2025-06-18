import { v2 as cloudinary } from 'cloudinary';
import { TRPCError } from '@trpc/server';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  bytes: number;
  created_at: string;
  url: string;
  width?: number;
  height?: number;
  folder?: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  tags?: string[];
  transformation?: any;
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
  allowed_formats?: string[];
  max_file_size?: number;
}

export interface CloudinaryDeleteResult {
  result: 'ok' | 'not found';
}

/**
 * Service Cloudinary pour la gestion des fichiers et médias
 */
export class CloudinaryService {
  private isConfigured: boolean = false;

  constructor() {
    // Configuration Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
      
      this.isConfigured = true;
      console.log('✅ Service Cloudinary initialisé');
    } else {
      console.warn('⚠️ Configuration Cloudinary manquante - les fichiers seront stockés localement');
      this.isConfigured = false;
    }
  }

  /**
   * Vérifie si Cloudinary est configuré
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload un fichier vers Cloudinary
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Cloudinary n\'est pas configuré'
      });
    }

    try {
      // Convertir le buffer en base64
      const base64String = `data:${this.getMimeType(fileName)};base64,${fileBuffer.toString('base64')}`;

      // Options par défaut
      const uploadOptions = {
        resource_type: options.resource_type || 'auto',
        folder: options.folder || 'ecodeli',
        public_id: options.public_id,
        tags: options.tags || ['ecodeli'],
        allowed_formats: options.allowed_formats,
        max_file_size: options.max_file_size || 10485760, // 10MB par défaut
        ...options.transformation && { transformation: options.transformation }
      };

      // Upload vers Cloudinary
      const result = await cloudinary.uploader.upload(base64String, uploadOptions);

      console.log(`✅ Fichier uploadé vers Cloudinary: ${result.public_id}`);

      return result as CloudinaryUploadResult;

    } catch (error) {
      console.error('❌ Erreur lors de l\'upload Cloudinary:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de l\'upload du fichier vers Cloudinary'
      });
    }
  }

  /**
   * Upload un document avec des options spécifiques
   */
  async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
    documentType: string,
    options: Partial<CloudinaryUploadOptions> = {}
  ): Promise<CloudinaryUploadResult> {
    const folder = `ecodeli/documents/${userId}`;
    const tags = ['document', documentType, userId];
    
    // Générer un public_id unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const public_id = `${documentType}_${timestamp}_${randomId}`;

    return this.uploadFile(fileBuffer, fileName, {
      folder,
      public_id,
      tags,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp', 'heic'],
      max_file_size: 10485760, // 10MB
      ...options
    });
  }

  /**
   * Upload une image avec redimensionnement automatique
   */
  async uploadImage(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
    options: Partial<CloudinaryUploadOptions> = {}
  ): Promise<CloudinaryUploadResult> {
    const folder = `ecodeli/images/${userId}`;
    const tags = ['image', userId];

    // Transformation pour optimiser les images
    const transformation = {
      quality: 'auto:good',
      fetch_format: 'auto',
      width: 1920,
      height: 1080,
      crop: 'limit'
    };

    return this.uploadFile(fileBuffer, fileName, {
      folder,
      tags,
      resource_type: 'image',
      transformation,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      max_file_size: 5242880, // 5MB
      ...options
    });
  }

  /**
   * Upload un avatar utilisateur
   */
  async uploadAvatar(
    fileBuffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<CloudinaryUploadResult> {
    const folder = `ecodeli/avatars`;
    const public_id = `avatar_${userId}`;
    const tags = ['avatar', userId];

    // Transformation spécifique aux avatars
    const transformation = {
      width: 300,
      height: 300,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto:good',
      fetch_format: 'auto'
    };

    return this.uploadFile(fileBuffer, fileName, {
      folder,
      public_id,
      tags,
      resource_type: 'image',
      transformation,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_file_size: 2097152 // 2MB
    });
  }

  /**
   * Supprime un fichier de Cloudinary
   */
  async deleteFile(publicId: string): Promise<CloudinaryDeleteResult> {
    if (!this.isConfigured) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Cloudinary n\'est pas configuré'
      });
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Fichier supprimé de Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression Cloudinary:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la suppression du fichier'
      });
    }
  }

  /**
   * Génère une URL signée pour un accès temporaire
   */
  generateSignedUrl(
    publicId: string,
    options: {
      expiration?: number; // en secondes
      transformation?: any;
    } = {}
  ): string {
    if (!this.isConfigured) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Cloudinary n\'est pas configuré'
      });
    }

    const expiration = Math.floor(Date.now() / 1000) + (options.expiration || 3600); // 1h par défaut

    return cloudinary.utils.private_download_url(publicId, 'pdf', {
      expires_at: expiration,
      ...options.transformation && { transformation: options.transformation }
    });
  }

  /**
   * Génère une URL de transformation pour une image
   */
  generateTransformationUrl(
    publicId: string,
    transformation: any
  ): string {
    if (!this.isConfigured) {
      return publicId; // Retourner l'ID si pas configuré
    }

    return cloudinary.url(publicId, {
      secure: true,
      transformation
    });
  }

  /**
   * Optimise automatiquement une image
   */
  getOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: 'auto' | 'auto:low' | 'auto:good' | 'auto:best' | number;
      format?: 'auto' | 'webp' | 'jpg' | 'png';
      crop?: string;
    } = {}
  ): string {
    if (!this.isConfigured) {
      return publicId;
    }

    const transformation = {
      quality: options.quality || 'auto:good',
      fetch_format: options.format || 'auto',
      ...(options.width && { width: options.width }),
      ...(options.height && { height: options.height }),
      ...(options.crop && { crop: options.crop })
    };

    return cloudinary.url(publicId, {
      secure: true,
      transformation
    });
  }

  /**
   * Liste les fichiers dans un dossier
   */
  async listFiles(
    folder: string,
    options: {
      resourceType?: 'image' | 'video' | 'raw';
      maxResults?: number;
      nextCursor?: string;
    } = {}
  ): Promise<{
    resources: any[];
    next_cursor?: string;
  }> {
    if (!this.isConfigured) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Cloudinary n\'est pas configuré'
      });
    }

    try {
      let searchQuery = cloudinary.search
        .expression(`folder:${folder}`)
        .sort_by('created_at', 'desc')
        .max_results(options.maxResults || 50);
        
      if (options.nextCursor) {
        searchQuery = searchQuery.next_cursor(options.nextCursor);
      }
      
      const result = await searchQuery.execute();

      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la liste des fichiers Cloudinary:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération de la liste des fichiers'
      });
    }
  }

  /**
   * Obtient les informations d'un fichier
   */
  async getFileInfo(publicId: string): Promise<any> {
    if (!this.isConfigured) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Cloudinary n\'est pas configuré'
      });
    }

    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des infos fichier Cloudinary:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des informations du fichier'
      });
    }
  }

  /**
   * Détermine le type MIME à partir du nom de fichier
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain'
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Valide la configuration Cloudinary
   */
  async validateConfiguration(): Promise<{
    valid: boolean;
    cloudName?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        valid: false,
        error: 'Configuration Cloudinary manquante'
      };
    }

    try {
      // Test simple : récupérer les infos du compte
      const result = await cloudinary.api.ping();
      
      return {
        valid: true,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      };
    } catch (error) {
      console.error('❌ Erreur lors de la validation Cloudinary:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// Instance singleton du service
export const cloudinaryService = new CloudinaryService();

// Export par défaut
export default CloudinaryService;