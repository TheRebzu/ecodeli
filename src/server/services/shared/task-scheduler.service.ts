import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

/**
 * Interface pour une tâche planifiée
 */
export interface ScheduledTask {
  id: string;
  orderId: string;
  taskType: "PAYMENT_TIMEOUT" | "PREPARATION_TIMEOUT" | "PICKUP_TIMEOUT" | "DELIVERY_TIMEOUT";
  scheduledAt: Date;
  executeAt: Date;
  isCompleted: boolean;
  isActive: boolean;
  maxRetries: number;
  currentRetries: number;
  metadata?: Record<string, any>;
}

/**
 * Interface pour les options de planification
 */
export interface TaskSchedulingOptions {
  maxRetries?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  metadata?: Record<string, any>;
}

/**
 * Service de planification des tâches pour les workflows cart-drop
 * Remplace les setTimeout par des tâches persistantes en base de données
 */
export class TaskSchedulerService {
  private static instance: TaskSchedulerService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(private prisma: PrismaClient) {
    this.initializeCronJob();
  }

  static getInstance(prisma: PrismaClient): TaskSchedulerService {
    if (!TaskSchedulerService.instance) {
      TaskSchedulerService.instance = new TaskSchedulerService(prisma);
    }
    return TaskSchedulerService.instance;
  }

  /**
   * Planifie une tâche de timeout de paiement
   */
  async schedulePaymentTimeout(
    orderId: string, 
    timeoutMinutes: number,
    options: TaskSchedulingOptions = {}
  ): Promise<ScheduledTask> {
    const executeAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    
    return this.createScheduledTask({
      orderId,
      taskType: "PAYMENT_TIMEOUT",
      executeAt,
      maxRetries: options.maxRetries || 3,
      metadata: options.metadata
    });
  }

  /**
   * Planifie une tâche de timeout de préparation
   */
  async schedulePreparationTimeout(
    orderId: string, 
    timeoutMinutes: number,
    options: TaskSchedulingOptions = {}
  ): Promise<ScheduledTask> {
    const executeAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    
    return this.createScheduledTask({
      orderId,
      taskType: "PREPARATION_TIMEOUT",
      executeAt,
      maxRetries: options.maxRetries || 2,
      metadata: options.metadata
    });
  }

  /**
   * Planifie une tâche de timeout de collecte
   */
  async schedulePickupTimeout(
    orderId: string, 
    timeoutMinutes: number,
    options: TaskSchedulingOptions = {}
  ): Promise<ScheduledTask> {
    const executeAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    
    return this.createScheduledTask({
      orderId,
      taskType: "PICKUP_TIMEOUT",
      executeAt,
      maxRetries: options.maxRetries || 2,
      metadata: options.metadata
    });
  }

  /**
   * Planifie une tâche de timeout de livraison
   */
  async scheduleDeliveryTimeout(
    orderId: string, 
    timeoutMinutes: number,
    options: TaskSchedulingOptions = {}
  ): Promise<ScheduledTask> {
    const executeAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    
    return this.createScheduledTask({
      orderId,
      taskType: "DELIVERY_TIMEOUT",
      executeAt,
      maxRetries: options.maxRetries || 3,
      metadata: options.metadata
    });
  }

  /**
   * Annule toutes les tâches actives pour une commande
   */
  async cancelOrderTasks(orderId: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        UPDATE scheduled_tasks 
        SET is_active = false, updated_at = NOW()
        WHERE order_id = ${orderId} 
        AND is_active = true 
        AND is_completed = false
      `;
    } catch (error) {
      console.error("Erreur annulation tâches:", error);
    }
  }

  /**
   * Annule un type de tâche spécifique pour une commande
   */
  async cancelTaskType(orderId: string, taskType: ScheduledTask["taskType"]): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        UPDATE scheduled_tasks 
        SET is_active = false, updated_at = NOW()
        WHERE order_id = ${orderId} 
        AND task_type = ${taskType}
        AND is_active = true 
        AND is_completed = false
      `;
    } catch (error) {
      console.error("Erreur annulation tâche type:", error);
    }
  }

  /**
   * Démarre le processeur de tâches
   */
  start(): void {
    if (this.cronJob && !this.isRunning) {
      this.cronJob.start();
      this.isRunning = true;
      console.log("🚀 TaskScheduler: Processeur de tâches démarré");
    }
  }

  /**
   * Arrête le processeur de tâches
   */
  stop(): void {
    if (this.cronJob && this.isRunning) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log("⏹️ TaskScheduler: Processeur de tâches arrêté");
    }
  }

  /**
   * Initialise le job cron qui traite les tâches
   */
  private initializeCronJob(): void {
    // Exécute toutes les minutes pour traiter les tâches dues
    this.cronJob = cron.schedule("* * * * *", async () => {
      await this.processPendingTasks();
    }, {
      scheduled: false, // Ne démarre pas automatiquement
      name: "cart-drop-task-scheduler"
    });
  }

  /**
   * Traite les tâches en attente
   */
  private async processPendingTasks(): Promise<void> {
    try {
      const now = new Date();
      
      const dueTasks = await this.prisma.$queryRaw`
        SELECT * FROM scheduled_tasks 
        WHERE execute_at <= ${now}
        AND is_active = true 
        AND is_completed = false
        ORDER BY execute_at ASC
        LIMIT 50
      `;

      if (!Array.isArray(dueTasks) || dueTasks.length === 0) {
        return;
      }

      console.log(`📋 TaskScheduler: Traitement de ${dueTasks.length} tâches dues`);

      for (const task of dueTasks) {
        await this.executeTask(task);
      }

    } catch (error) {
      console.error("❌ TaskScheduler: Erreur lors du traitement des tâches:", error);
    }
  }

  /**
   * Exécute une tâche spécifique
   */
  private async executeTask(task: any): Promise<void> {
    try {
      console.log(`⚡ TaskScheduler: Exécution tâche ${task.task_type} pour commande ${task.order_id}`);
      
      // Récupérer l'état actuel de la commande
      const currentOrder = await this.getOrderStatus(task.order_id);
      
      if (!currentOrder) {
        await this.markTaskCompleted(task.id, "Commande non trouvée");
        return;
      }

      // Exécuter selon le type de tâche
      let executed = false;
      
      switch (task.task_type) {
        case "PAYMENT_TIMEOUT":
          executed = await this.handlePaymentTimeout(task.order_id, currentOrder);
          break;
        case "PREPARATION_TIMEOUT":
          executed = await this.handlePreparationTimeout(task.order_id, currentOrder);
          break;
        case "PICKUP_TIMEOUT":
          executed = await this.handlePickupTimeout(task.order_id, currentOrder);
          break;
        case "DELIVERY_TIMEOUT":
          executed = await this.handleDeliveryTimeout(task.order_id, currentOrder);
          break;
      }

      if (executed) {
        await this.markTaskCompleted(task.id, "Exécutée avec succès");
      } else {
        await this.handleTaskRetry(task);
      }

    } catch (error) {
      console.error(`❌ TaskScheduler: Erreur exécution tâche ${task.id}:`, error);
      await this.handleTaskRetry(task);
    }
  }

  /**
   * Créé une nouvelle tâche planifiée
   */
  private async createScheduledTask(taskData: {
    orderId: string;
    taskType: ScheduledTask["taskType"];
    executeAt: Date;
    maxRetries: number;
    metadata?: Record<string, any>;
  }): Promise<ScheduledTask> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.prisma.$executeRaw`
      INSERT INTO scheduled_tasks (
        id, order_id, task_type, scheduled_at, execute_at, 
        is_completed, is_active, max_retries, current_retries, metadata
      ) VALUES (
        ${taskId}, ${taskData.orderId}, ${taskData.taskType}, 
        ${new Date()}, ${taskData.executeAt}, false, true, 
        ${taskData.maxRetries}, 0, ${JSON.stringify(taskData.metadata || {})}
      )
    `;

    console.log(`📅 TaskScheduler: Tâche planifiée ${taskData.taskType} pour ${taskData.orderId} à ${taskData.executeAt.toISOString()}`);
    
    return {
      id: taskId,
      orderId: taskData.orderId,
      taskType: taskData.taskType,
      scheduledAt: new Date(),
      executeAt: taskData.executeAt,
      isCompleted: false,
      isActive: true,
      maxRetries: taskData.maxRetries,
      currentRetries: 0,
      metadata: taskData.metadata
    };
  }

  /**
   * Marque une tâche comme terminée
   */
  private async markTaskCompleted(taskId: string, result?: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE scheduled_tasks 
      SET is_completed = true, is_active = false, 
          completed_at = NOW(), result = ${result || "Terminée"}, 
          updated_at = NOW()
      WHERE id = ${taskId}
    `;
  }

  /**
   * Gère les tentatives de répétition d'une tâche
   */
  private async handleTaskRetry(task: any): Promise<void> {
    if (task.current_retries >= task.max_retries) {
      await this.prisma.$executeRaw`
        UPDATE scheduled_tasks 
        SET is_active = false, is_completed = true, 
            result = 'Échec après toutes les tentatives', 
            updated_at = NOW()
        WHERE id = ${task.id}
      `;
    } else {
      // Programmer une nouvelle tentative dans 5 minutes
      const nextExecuteAt = new Date(Date.now() + 5 * 60 * 1000);
      
      await this.prisma.$executeRaw`
        UPDATE scheduled_tasks 
        SET current_retries = ${task.current_retries + 1}, 
            execute_at = ${nextExecuteAt}, 
            updated_at = NOW()
        WHERE id = ${task.id}
      `;
    }
  }

  /**
   * Récupère l'état d'une commande
   */
  private async getOrderStatus(orderId: string): Promise<any> {
    const result = await this.prisma.$queryRaw`
      SELECT id, status, updated_at 
      FROM cart_drop_orders 
      WHERE id = ${orderId}
    `;
    
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * Gère le timeout de paiement
   */
  private async handlePaymentTimeout(orderId: string, order: any): Promise<boolean> {
    if (order.status === "PAYMENT_PENDING") {
      await this.prisma.$executeRaw`
        UPDATE cart_drop_orders 
        SET status = 'PAYMENT_FAILED', updated_at = NOW()
        WHERE id = ${orderId}
      `;
      
      console.log(`💳 Timeout de paiement pour la commande ${orderId}`);
      return true;
    }
    return false;
  }

  /**
   * Gère le timeout de préparation
   */
  private async handlePreparationTimeout(orderId: string, order: any): Promise<boolean> {
    if (order.status === "PREPARING") {
      console.log(`⏰ Retard de préparation pour la commande ${orderId}`);
      
      await this.prisma.$executeRaw`
        INSERT INTO cart_drop_events (
          id, order_id, event_type, message, triggered_by, created_at
        ) VALUES (
          ${`event_${Date.now()}`}, ${orderId}, 'PREPARATION_DELAYED',
          'Retard de préparation détecté', 'SYSTEM', NOW()
        )
      `;
      
      return true;
    }
    return false;
  }

  /**
   * Gère le timeout de collecte
   */
  private async handlePickupTimeout(orderId: string, order: any): Promise<boolean> {
    if (order.status === "ASSIGNED") {
      console.log(`🚚 Timeout de collecte pour la commande ${orderId} - Réassignation nécessaire`);
      
      await this.prisma.$executeRaw`
        INSERT INTO cart_drop_events (
          id, order_id, event_type, message, triggered_by, created_at
        ) VALUES (
          ${`event_${Date.now()}`}, ${orderId}, 'PICKUP_TIMEOUT',
          'Échec de collecte - Réassignation automatique', 'SYSTEM', NOW()
        )
      `;
      
      return true;
    }
    return false;
  }

  /**
   * Gère le timeout de livraison
   */
  private async handleDeliveryTimeout(orderId: string, order: any): Promise<boolean> {
    if (order.status === "IN_DELIVERY") {
      console.log(`📦 Timeout de livraison pour la commande ${orderId} - Escalade nécessaire`);
      
      await this.prisma.$executeRaw`
        INSERT INTO cart_drop_events (
          id, order_id, event_type, message, triggered_by, created_at
        ) VALUES (
          ${`event_${Date.now()}`}, ${orderId}, 'DELIVERY_TIMEOUT',
          'Retard de livraison détecté - Escalade automatique', 'SYSTEM', NOW()
        )
      `;
      
      return true;
    }
    return false;
  }
}

export default TaskSchedulerService; 