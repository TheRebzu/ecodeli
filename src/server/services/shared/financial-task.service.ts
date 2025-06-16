import {
  PrismaClient,
  FinancialTaskPriority,
  FinancialTaskCategory} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  CreateFinancialTaskInput,
  UpdateFinancialTaskInput,
  FinancialTaskFilters,
  FinancialTaskSortOptions} from "@/server/services/shared/financial-task.service";
import { db } from "@/server/db";

export class FinancialTaskService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = db;
  }

  /**
   * Crée une nouvelle tâche financière
   */
  async createFinancialTask(userId: string, data: CreateFinancialTaskInput) {
    try {
      return await this.db.financialTask.create({
        data: {
          ...data,
          userId}});
    } catch (error) {
      console.error(
        "Erreur lors de la création de la tâche financière:",
        error,
      );
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de créer la tâche financière" });
    }
  }

  /**
   * Récupère une tâche financière par son ID
   */
  async getFinancialTaskById(id: string, userId?: string) {
    try {
      const task = await this.db.financialTask.findUnique({
        where: { id }});

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Tâche financière non trouvée" });
      }

      // Vérifier si l'utilisateur est autorisé à accéder à cette tâche
      if (userId && task.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à cette tâche" });
      }

      return task;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error(
        "Erreur lors de la récupération de la tâche financière:",
        error,
      );
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de récupérer la tâche financière" });
    }
  }

  /**
   * Récupère les tâches financières d'un utilisateur avec filtres et pagination
   */
  async getFinancialTasks(
    userId: string,
    page = 1,
    limit = 10,
    filters: FinancialTaskFilters = {},
    sort: FinancialTaskSortOptions = { field: "createdAt", direction: "desc" },
  ) {
    try {
      const skip = (page - 1) * limit;

      // Construction des filtres pour la requête Prisma
      const where: any = {
        userId};

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } }];
      }

      if (filters.priority) {
        where.priority = filters.priority;
      }

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.completed !== undefined) {
        where.completed = filters.completed;
      }

      if (filters.dueDateFrom || filters.dueDateTo) {
        where.dueDate = {};

        if (filters.dueDateFrom) {
          where.dueDate.gte = filters.dueDateFrom;
        }

        if (filters.dueDateTo) {
          where.dueDate.lte = filters.dueDateTo;
        }
      }

      // Construction des options de tri
      const orderBy: any = {
        [sort.field]: sort.direction};

      // Récupération du nombre total de tâches correspondant aux filtres
      const totalTasks = await this.db.financialTask.count({ where  });

      // Récupération des tâches avec pagination
      const tasks = await this.db.financialTask.findMany({ where,
        orderBy,
        skip,
        take: limit });

      return {
        tasks,
        total: totalTasks,
        page,
        limit,
        totalPages: Math.ceil(totalTasks / limit)};
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des tâches financières:",
        error,
      );
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de récupérer les tâches financières" });
    }
  }

  /**
   * Met à jour une tâche financière
   */
  async updateFinancialTask(data: UpdateFinancialTaskInput, userId: string) {
    try {
      // Vérifier si la tâche existe et appartient à l'utilisateur
      const existingTask = await this.getFinancialTaskById(data.id, userId);

      // Si aucune erreur n'est lancée, l'utilisateur est autorisé à modifier cette tâche
      const updatedTask = await this.db.financialTask.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          priority: data.priority,
          category: data.category,
          completed: data.completed,
          // Si la tâche est marquée comme terminée, définir la date de complétion
          completedAt: data.completed ? new Date() : null}});

      return updatedTask;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error(
        "Erreur lors de la mise à jour de la tâche financière:",
        error,
      );
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de mettre à jour la tâche financière" });
    }
  }

  /**
   * Change le statut (terminé/non terminé) d'une tâche
   */
  async toggleFinancialTaskStatus(
    id: string,
    completed: boolean,
    userId: string,
  ) {
    try {
      // Vérifier si la tâche existe et appartient à l'utilisateur
      await this.getFinancialTaskById(id, userId);

      // Mettre à jour le statut de la tâche
      return await this.db.financialTask.update({
        where: { id },
        data: {
          completed,
          completedAt: completed ? new Date() : null}});
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error(
        "Erreur lors du changement de statut de la tâche financière:",
        error,
      );
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de changer le statut de la tâche financière" });
    }
  }

  /**
   * Supprime une tâche financière
   */
  async deleteFinancialTask(id: string, userId: string) {
    try {
      // Vérifier si la tâche existe et appartient à l'utilisateur
      await this.getFinancialTaskById(id, userId);

      // Supprimer la tâche
      await this.db.financialTask.delete({
        where: { id }});

      return { success };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error(
        "Erreur lors de la suppression de la tâche financière:",
        error,
      );
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Impossible de supprimer la tâche financière" });
    }
  }

  /**
   * Récupère les statistiques des tâches financières d'un utilisateur
   */
  async getFinancialTaskStats(userId: string) {
    try {
      // Nombre total de tâches
      const totalTasks = await this.db.financialTask.count({
        where: { userId }});

      // Nombre de tâches terminées
      const completedTasks = await this.db.financialTask.count({
        where: { userId, completed: true }});

      // Nombre de tâches par priorité
      const tasksByPriority = await this.db.financialTask.groupBy({
        by: ["priority"],
        where: { userId },
        count: true});

      // Nombre de tâches par catégorie
      const tasksByCategory = await this.db.financialTask.groupBy({
        by: ["category"],
        where: { userId },
        count: true});

      // Tâches avec date d'échéance dépassée (en retard)
      const overdueTasks = await this.db.financialTask.count({
        where: {
          userId,
          dueDate: { lt: new Date() },
          completed: false}});

      // Tâches à venir (dans les 7 prochains jours)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingTasks = await this.db.financialTask.count({
        where: {
          userId,
          dueDate: {
            gte: new Date(),
            lte: nextWeek},
          completed: false}});

      // Formater les statistiques par priorité
      const priorityStats = Object.values(FinancialTaskPriority).map(
        (priority) => {
          const count =
            tasksByPriority.find((t) => t.priority === priority)?.count || 0;
          return { priority, count };
        },
      );

      // Formater les statistiques par catégorie
      const categoryStats = Object.values(FinancialTaskCategory).map(
        (category) => {
          const count =
            tasksByCategory.find((t) => t.category === category)?.count || 0;
          return { category, count };
        },
      );

      return {
        totalTasks,
        completedTasks,
        incompleteTasks: totalTasks - completedTasks,
        completionRate:
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        overdueTasks,
        upcomingTasks,
        priorityStats,
        categoryStats};
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message:
          "Impossible de récupérer les statistiques des tâches financières" });
    }
  }
}

// Exporter une instance du service pour l'utiliser dans le routeur tRPC
export const financialTaskService = new FinancialTaskService();
