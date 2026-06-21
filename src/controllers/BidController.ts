import { Request, Response } from 'express';
import { BidEngine } from '../services/BidEngine';
import { BidRequest } from '../types';

export class BidController {
  private bidEngine: BidEngine;

  constructor(bidEngine: BidEngine) {
    this.bidEngine = bidEngine;
  }

  processBid = (req: Request, res: Response): void => {
    try {
      const request = req.body as BidRequest;

      if (!request.adSlotId || request.reservePrice === undefined || !request.timestamp) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数: adSlotId, reservePrice, timestamp',
        });
        return;
      }

      const result = this.bidEngine.processBidRequest(request);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '竞价处理失败',
      });
    }
  };
}
