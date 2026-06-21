"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanController = void 0;
class PlanController {
    constructor(planManager) {
        this.createPlan = (req, res) => {
            try {
                const request = req.body;
                const plan = this.planManager.createPlan(request);
                res.status(201).json({
                    success: true,
                    data: plan,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '创建计划失败',
                });
            }
        };
        this.getPlan = (req, res) => {
            const { planId } = req.params;
            const plan = this.planManager.getPlan(planId);
            if (!plan) {
                res.status(404).json({
                    success: false,
                    error: '计划不存在',
                });
                return;
            }
            res.json({
                success: true,
                data: plan,
            });
        };
        this.getAllPlans = (req, res) => {
            const plans = this.planManager.getAllPlans();
            res.json({
                success: true,
                data: plans,
            });
        };
        this.pausePlan = (req, res) => {
            const { planId } = req.params;
            const plan = this.planManager.pausePlan(planId);
            if (!plan) {
                res.status(404).json({
                    success: false,
                    error: '计划不存在',
                });
                return;
            }
            res.json({
                success: true,
                data: plan,
            });
        };
        this.resumePlan = (req, res) => {
            const { planId } = req.params;
            const plan = this.planManager.resumePlan(planId);
            if (!plan) {
                res.status(404).json({
                    success: false,
                    error: '计划不存在',
                });
                return;
            }
            res.json({
                success: true,
                data: plan,
            });
        };
        this.planManager = planManager;
    }
}
exports.PlanController = PlanController;
//# sourceMappingURL=PlanController.js.map