import { Request, Response } from 'express';
import { ReportService } from '../services/ReportService';
export declare class ReportController {
    private reportService;
    constructor(reportService: ReportService);
    getPlanSpendDetail: (req: Request, res: Response) => void;
    getAllPlansOverview: (req: Request, res: Response) => void;
    getDateReport: (req: Request, res: Response) => void;
    getTodayReport: (req: Request, res: Response) => void;
}
