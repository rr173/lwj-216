import { Request, Response } from 'express';
import { StressTestEngine } from '../services/StressTestEngine';
export declare class StressTestController {
    private engine;
    constructor(engine: StressTestEngine);
    createScenario: (req: Request, res: Response) => void;
    updateScenario: (req: Request, res: Response) => void;
    deleteScenario: (req: Request, res: Response) => void;
    getScenario: (req: Request, res: Response) => void;
    getAllScenarios: (_req: Request, res: Response) => void;
    runScenario: (req: Request, res: Response) => void;
    abortRun: (_req: Request, res: Response) => void;
    getProgress: (_req: Request, res: Response) => void;
    getHistoryList: (_req: Request, res: Response) => void;
    getHistoryReport: (req: Request, res: Response) => void;
}
