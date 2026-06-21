import { Router } from 'express';
import { PlanController } from '../controllers/PlanController';
import { BidController } from '../controllers/BidController';
import { ReportController } from '../controllers/ReportController';

export function createRouter(
  planController: PlanController,
  bidController: BidController,
  reportController: ReportController
): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: Date.now(),
      },
    });
  });

  router.post('/plans', planController.createPlan);
  router.get('/plans', planController.getAllPlans);
  router.get('/plans/:planId', planController.getPlan);
  router.post('/plans/:planId/pause', planController.pausePlan);
  router.post('/plans/:planId/resume', planController.resumePlan);

  router.post('/bid', bidController.processBid);

  router.get('/spend/plans/:planId', reportController.getPlanSpendDetail);
  router.get('/spend/overview', reportController.getAllPlansOverview);

  router.get('/reports/today', reportController.getTodayReport);
  router.get('/reports/:date', reportController.getDateReport);

  return router;
}
