"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRouter = createRouter;
const express_1 = require("express");
function createRouter(planController, bidController, reportController, antiCheatController, stressTestController) {
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
    if (antiCheatController) {
        router.get('/anticheat/blocks', antiCheatController.getAllBlockRecords);
        router.get('/anticheat/blocks/:adSlotId', antiCheatController.getBlockRecords);
        router.get('/anticheat/reputations', antiCheatController.getAllReputations);
        router.get('/anticheat/reputations/:adSlotId', antiCheatController.getReputation);
        router.get('/anticheat/stats', antiCheatController.getGlobalStats);
        router.get('/anticheat/config', antiCheatController.getConfig);
        router.put('/anticheat/config', antiCheatController.updateConfig);
    }
    if (stressTestController) {
        router.post('/stress/scenarios', stressTestController.createScenario);
        router.get('/stress/scenarios', stressTestController.getAllScenarios);
        router.get('/stress/scenarios/:scenarioId', stressTestController.getScenario);
        router.put('/stress/scenarios/:scenarioId', stressTestController.updateScenario);
        router.delete('/stress/scenarios/:scenarioId', stressTestController.deleteScenario);
        router.post('/stress/scenarios/:scenarioId/run', stressTestController.runScenario);
        router.post('/stress/abort', stressTestController.abortRun);
        router.get('/stress/progress', stressTestController.getProgress);
        router.get('/stress/history', stressTestController.getHistoryList);
        router.get('/stress/history/:historyId', stressTestController.getHistoryReport);
    }
    return router;
}
//# sourceMappingURL=index.js.map