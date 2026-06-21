import { Request, Response } from 'express';
import { PlanManager } from '../services/PlanManager';
export declare class PlanController {
    private planManager;
    constructor(planManager: PlanManager);
    createPlan: (req: Request, res: Response) => void;
    getPlan: (req: Request, res: Response) => void;
    getAllPlans: (req: Request, res: Response) => void;
    pausePlan: (req: Request, res: Response) => void;
    resumePlan: (req: Request, res: Response) => void;
}
