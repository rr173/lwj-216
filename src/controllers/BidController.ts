import { Request, Response } from 'express';
import { BidEngine } from '../services/BidEngine';
import { AntiCheatService } from '../services/AntiCheatService';
import { BidRequest, BlockReason } from '../types';

const BLOCK_REASON_MESSAGES: Record<BlockReason, string> = {
  frequency_exceeded: '广告位请求频率超限',
  timestamp_duplicate: '检测到批量时间戳重复请求',
  reputation_too_low: '广告位信誉分过低，请求被拒绝',
};

export class BidController {
  private bidEngine: BidEngine;
  private antiCheatService: AntiCheatService;

  constructor(bidEngine: BidEngine, antiCheatService: AntiCheatService) {
    this.bidEngine = bidEngine;
    this.antiCheatService = antiCheatService;
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

      const antiCheatResult = this.antiCheatService.checkRequest(request);

      if (antiCheatResult.blocked) {
        res.json({
          success: false,
          blocked: true,
          blockReason: antiCheatResult.reason,
          blockMessage: antiCheatResult.reason ? BLOCK_REASON_MESSAGES[antiCheatResult.reason] : '请求被拦截',
          blockDetails: antiCheatResult.blockDetails,
          reputationAdjustment: antiCheatResult.reputationAdjustment,
          data: {
            winnerPlanId: null,
            actualCost: 0,
            timestamp: request.timestamp,
            adSlotId: request.adSlotId,
          },
        });
        return;
      }

      const bidOptions: { discountRate?: number } = {};
      if (antiCheatResult.applyDiscount && antiCheatResult.discountRate) {
        bidOptions.discountRate = antiCheatResult.discountRate;
      }

      const result = this.bidEngine.processBidRequest(request, bidOptions);

      res.json({
        success: true,
        blocked: false,
        reputationAdjustment: antiCheatResult.reputationAdjustment,
        applyDiscount: antiCheatResult.applyDiscount,
        discountRate: antiCheatResult.discountRate,
        reputationScore: antiCheatResult.blockDetails?.reputationScore,
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

