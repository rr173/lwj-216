import { Request, Response } from 'express';
import { BidEngine } from '../services/BidEngine';
export declare class BidController {
    private bidEngine;
    constructor(bidEngine: BidEngine);
    processBid: (req: Request, res: Response) => void;
}
