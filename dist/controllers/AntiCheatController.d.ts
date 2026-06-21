import { Request, Response } from 'express';
import { AntiCheatService } from '../services/AntiCheatService';
export declare class AntiCheatController {
    private antiCheatService;
    constructor(antiCheatService: AntiCheatService);
    getBlockRecords: (req: Request, res: Response) => void;
    getAllBlockRecords: (req: Request, res: Response) => void;
    getReputation: (req: Request, res: Response) => void;
    getAllReputations: (req: Request, res: Response) => void;
    getGlobalStats: (req: Request, res: Response) => void;
    getConfig: (req: Request, res: Response) => void;
    updateConfig: (req: Request, res: Response) => void;
}
