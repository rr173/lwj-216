"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRouter = createRouter;
const express_1 = require("express");
function createRouter(planController, bidController, reportController) {
    const router = (0, express_1.Router)();
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
//# sourceMappingURL=index.js.map