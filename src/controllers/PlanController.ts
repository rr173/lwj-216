import { Request, Response } from 'express';
import { PlanManager } from '../services/PlanManager';
import { CreatePlanRequest } from '../types';

export class PlanController {
  private planManager: PlanManager;

  constructor(planManager: PlanManager) {
    this.planManager = planManager;
  }

  createPlan = (req: Request, res: Response): void => {
    try {
      const request = req.body as CreatePlanRequest;
      const plan = this.planManager.createPlan(request);
      res.status(201).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '创建计划失败',
      });
    }
  };

  getPlan = (req: Request, res: Response): void => {
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

  getAllPlans = (req: Request, res: Response): void => {
    const plans = this.planManager.getAllPlans();
    res.json({
      success: true,
      data: plans,
    });
  };

  pausePlan = (req: Request, res: Response): void => {
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

  resumePlan = (req: Request, res: Response): void => {
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
}
