import { Request, Response } from 'express';
import { BidEngine } from '../services/BidEngine';
import { AntiCheatService } from '../services/AntiCheatService';
export declare class BidController {
    private bidEngine;
    private antiCheatService;
    constructor(bidEngine: BidEngine, antiCheatService: AntiCheatService);
    processBid: (req: Request, res: Response) => void;
}
