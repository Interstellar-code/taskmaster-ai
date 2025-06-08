/**
 * Analytics routes for TaskHero API
 */

import express from 'express';
import { z } from 'zod';
import { asyncHandler, createSuccessResponse, APIError } from '../middleware/errorHandler.js';
import { validateQuery } from '../middleware/validateProject.js';
import TaskDAO from '../dao/TaskDAO.js';
import PRDDAO from '../dao/PRDDAO.js';
import databaseManager from '../utils/database.js';

const router = express.Router();

// Validation schemas
const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('week'),
  includeArchived: z.boolean().default(false)
});

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Get comprehensive dashboard statistics for the project
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get('/dashboard',
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const prdDAO = PRDDAO;
    
    // Get all tasks and PRDs
    const allTasks = await taskDAO.findAll({});
    const allPrds = await prdDAO.findAll({});
    
    // Task statistics
    const taskStats = {
      total: allTasks.tasks.length,
      byStatus: {
        pending: allTasks.tasks.filter(t => t.status === 'pending').length,
        inProgress: allTasks.tasks.filter(t => t.status === 'in-progress').length,
        done: allTasks.tasks.filter(t => t.status === 'done').length,
        review: allTasks.tasks.filter(t => t.status === 'review').length,
        blocked: allTasks.tasks.filter(t => t.status === 'blocked').length,
        deferred: allTasks.tasks.filter(t => t.status === 'deferred').length,
        cancelled: allTasks.tasks.filter(t => t.status === 'cancelled').length
      },
      byPriority: {
        low: allTasks.tasks.filter(t => t.priority === 'low').length,
        medium: allTasks.tasks.filter(t => t.priority === 'medium').length,
        high: allTasks.tasks.filter(t => t.priority === 'high').length,
        urgent: allTasks.tasks.filter(t => t.priority === 'urgent').length
      },
      withPrd: allTasks.tasks.filter(t => t.prdId).length,
      withoutPrd: allTasks.tasks.filter(t => !t.prdId).length,
      subtasks: allTasks.tasks.filter(t => t.parentTaskId).length,
      parentTasks: allTasks.tasks.filter(t => !t.parentTaskId).length
    };
    
    // PRD statistics
    const prdStats = {
      total: allPrds.prds.length,
      byStatus: {
        pending: allPrds.prds.filter(p => p.status === 'pending').length,
        inProgress: allPrds.prds.filter(p => p.status === 'in-progress').length,
        done: allPrds.prds.filter(p => p.status === 'done').length,
        archived: allPrds.prds.filter(p => p.status === 'archived').length
      },
      byComplexity: {
        low: allPrds.prds.filter(p => p.complexity === 'low').length,
        medium: allPrds.prds.filter(p => p.complexity === 'medium').length,
        high: allPrds.prds.filter(p => p.complexity === 'high').length,
        veryHigh: allPrds.prds.filter(p => p.complexity === 'very-high').length
      },
      byPriority: {
        low: allPrds.prds.filter(p => p.priority === 'low').length,
        medium: allPrds.prds.filter(p => p.priority === 'medium').length,
        high: allPrds.prds.filter(p => p.priority === 'high').length,
        urgent: allPrds.prds.filter(p => p.priority === 'urgent').length
      }
    };
    
    // Completion rates
    const completionRates = {
      tasks: {
        completed: taskStats.byStatus.done,
        total: taskStats.total,
        percentage: taskStats.total > 0 ? Math.round((taskStats.byStatus.done / taskStats.total) * 100) : 0
      },
      prds: {
        completed: prdStats.byStatus.done,
        total: prdStats.total,
        percentage: prdStats.total > 0 ? Math.round((prdStats.byStatus.done / prdStats.total) * 100) : 0
      }
    };
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTasks = allTasks.tasks.filter(t => 
      new Date(t.updatedAt) >= sevenDaysAgo
    );
    
    const recentPrds = allPrds.prds.filter(p => 
      new Date(p.lastModified) >= sevenDaysAgo
    );
    
    const recentActivity = {
      tasksUpdated: recentTasks.length,
      prdsUpdated: recentPrds.length,
      tasksCompleted: recentTasks.filter(t => t.status === 'done').length,
      prdsCompleted: recentPrds.filter(p => p.status === 'done').length
    };
    
    // Database statistics
    const dbStats = await databaseManager.getStats();
    
    const dashboardData = {
      tasks: taskStats,
      prds: prdStats,
      completion: completionRates,
      recentActivity,
      database: dbStats,
      lastUpdated: new Date().toISOString()
    };
    
    res.json(createSuccessResponse(dashboardData, 'Dashboard statistics retrieved successfully'));
  })
);

/**
 * @swagger
 * /api/analytics/complexity:
 *   get:
 *     summary: Get complexity analysis
 *     description: Get complexity analysis for tasks and PRDs
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Complexity analysis retrieved successfully
 */
router.get('/complexity',
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const prdDAO = PRDDAO;
    
    // Get all tasks with complexity scores
    const allTasks = await taskDAO.findAll({});
    const tasksWithComplexity = allTasks.tasks.filter(t => t.complexityScore !== null);
    
    // Calculate complexity statistics
    const complexityStats = {
      tasks: {
        total: allTasks.tasks.length,
        withComplexityScore: tasksWithComplexity.length,
        averageComplexity: tasksWithComplexity.length > 0 
          ? tasksWithComplexity.reduce((sum, t) => sum + t.complexityScore, 0) / tasksWithComplexity.length
          : 0,
        distribution: {
          simple: tasksWithComplexity.filter(t => t.complexityScore <= 3).length,
          moderate: tasksWithComplexity.filter(t => t.complexityScore > 3 && t.complexityScore <= 6).length,
          complex: tasksWithComplexity.filter(t => t.complexityScore > 6 && t.complexityScore <= 8).length,
          veryComplex: tasksWithComplexity.filter(t => t.complexityScore > 8).length
        }
      }
    };
    
    // Get PRD complexity distribution
    const allPrds = await prdDAO.findAll({});
    const prdComplexityStats = {
      prds: {
        total: allPrds.prds.length,
        distribution: {
          low: allPrds.prds.filter(p => p.complexity === 'low').length,
          medium: allPrds.prds.filter(p => p.complexity === 'medium').length,
          high: allPrds.prds.filter(p => p.complexity === 'high').length,
          veryHigh: allPrds.prds.filter(p => p.complexity === 'very-high').length
        }
      }
    };
    
    // Complexity trends by status
    const complexityByStatus = {};
    ['pending', 'in-progress', 'done', 'review', 'blocked'].forEach(status => {
      const statusTasks = tasksWithComplexity.filter(t => t.status === status);
      complexityByStatus[status] = {
        count: statusTasks.length,
        averageComplexity: statusTasks.length > 0 
          ? statusTasks.reduce((sum, t) => sum + t.complexityScore, 0) / statusTasks.length
          : 0
      };
    });
    
    const complexityData = {
      ...complexityStats,
      ...prdComplexityStats,
      complexityByStatus,
      recommendations: generateComplexityRecommendations(complexityStats, complexityByStatus)
    };
    
    res.json(createSuccessResponse(complexityData, 'Complexity analysis retrieved successfully'));
  })
);

/**
 * @swagger
 * /api/analytics/operations:
 *   get:
 *     summary: Get AI operation statistics
 *     description: Get statistics about AI operations and usage
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering operations
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering operations
 *     responses:
 *       200:
 *         description: AI operation statistics retrieved successfully
 */
router.get('/operations',
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req, res) => {
    // This would integrate with AI operations tracking
    // For now, return placeholder data
    const operationsData = {
      totalOperations: 0,
      operationsByType: {},
      tokenUsage: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        estimatedCost: 0
      },
      modelUsage: {},
      errorRate: 0,
      averageResponseTime: 0,
      message: 'AI operations tracking not yet implemented'
    };
    
    res.json(createSuccessResponse(operationsData, 'AI operation statistics retrieved successfully'));
  })
);

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Get trend analysis
 *     description: Get trend analysis for tasks and PRDs over time
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *         description: Group trends by time period
 *     responses:
 *       200:
 *         description: Trend analysis retrieved successfully
 */
router.get('/trends',
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const prdDAO = PRDDAO;
    const { groupBy } = req.validatedQuery;
    
    // Get all tasks and PRDs
    const allTasks = await taskDAO.findAll({});
    const allPrds = await prdDAO.findAll({});
    
    // Generate trend data based on groupBy parameter
    const trends = generateTrendData(allTasks.tasks, allPrds.prds, groupBy);
    
    res.json(createSuccessResponse(trends, 'Trend analysis retrieved successfully'));
  })
);

/**
 * Helper function to generate complexity recommendations
 */
function generateComplexityRecommendations(complexityStats, complexityByStatus) {
  const recommendations = [];
  
  if (complexityStats.tasks.withComplexityScore < complexityStats.tasks.total * 0.5) {
    recommendations.push({
      type: 'complexity_scoring',
      message: 'Consider adding complexity scores to more tasks for better planning',
      priority: 'medium'
    });
  }
  
  if (complexityByStatus.blocked && complexityByStatus.blocked.averageComplexity > 7) {
    recommendations.push({
      type: 'blocked_complexity',
      message: 'High complexity tasks are getting blocked - consider breaking them down',
      priority: 'high'
    });
  }
  
  if (complexityStats.tasks.distribution.veryComplex > complexityStats.tasks.total * 0.2) {
    recommendations.push({
      type: 'task_breakdown',
      message: 'Many very complex tasks detected - consider breaking them into subtasks',
      priority: 'medium'
    });
  }
  
  return recommendations;
}

/**
 * Helper function to generate trend data
 */
function generateTrendData(tasks, prds, groupBy) {
  // This would implement actual trend calculation
  // For now, return placeholder structure
  return {
    tasks: {
      created: [],
      completed: [],
      inProgress: []
    },
    prds: {
      created: [],
      completed: []
    },
    groupBy,
    message: 'Trend calculation not yet fully implemented'
  };
}

export default router;
