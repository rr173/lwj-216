import { Request, Response } from 'express';
import { AntiCheatService } from '../services/AntiCheatService';
import { AntiCheatConfig } from '../types';

export class AntiCheatController {
  private antiCheatService: AntiCheatService;

  constructor(antiCheatService: AntiCheatService) {
    this.antiCheatService = antiCheatService;
  }

  getBlockRecords = (req: Request, res: Response): void => {
    try {
      const { adSlotId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const records = this.antiCheatService.getBlockRecords(adSlotId, limit);

      res.json({
        success: true,
        data: records,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取拦截记录失败',
      });
    }
  };

  getAllBlockRecords = (req: Request, res: Response): void => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const records = this.antiCheatService.getBlockRecords(undefined, limit);

      res.json({
        success: true,
        data: records,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取拦截记录失败',
      });
    }
  };

  getReputation = (req: Request, res: Response): void => {
    try {
      const { adSlotId } = req.params;
      const reputation = this.antiCheatService.getReputation(adSlotId);

      res.json({
        success: true,
        data: reputation,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取信誉分失败',
      });
    }
  };

  getAllReputations = (req: Request, res: Response): void => {
    try {
      const reputations = this.antiCheatService.getAllReputations();

      res.json({
        success: true,
        data: reputations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取信誉分列表失败',
      });
    }
  };

  getGlobalStats = (req: Request, res: Response): void => {
    try {
      const stats = this.antiCheatService.getGlobalStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取全局统计失败',
      });
    }
  };

  getConfig = (req: Request, res: Response): void => {
    try {
      const config = this.antiCheatService.getConfig();

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取配置失败',
      });
    }
  };

  updateConfig = (req: Request, res: Response): void => {
    try {
      const newConfig = req.body as Partial<AntiCheatConfig>;

      if (newConfig.windowSizeSeconds !== undefined && newConfig.windowSizeSeconds <= 0) {
        res.status(400).json({
          success: false,
          error: 'windowSizeSeconds 必须大于 0',
        });
        return;
      }
      if (newConfig.frequencyThreshold !== undefined && newConfig.frequencyThreshold <= 0) {
        res.status(400).json({
          success: false,
          error: 'frequencyThreshold 必须大于 0',
        });
        return;
      }
      if (newConfig.timestampDuplicateThreshold !== undefined && newConfig.timestampDuplicateThreshold <= 0) {
        res.status(400).json({
          success: false,
          error: 'timestampDuplicateThreshold 必须大于 0',
        });
        return;
      }
      if (newConfig.frequencyPenalty !== undefined && newConfig.frequencyPenalty < 0) {
        res.status(400).json({
          success: false,
          error: 'frequencyPenalty 不能为负数',
        });
        return;
      }
      if (newConfig.timestampPenalty !== undefined && newConfig.timestampPenalty < 0) {
        res.status(400).json({
          success: false,
          error: 'timestampPenalty 不能为负数',
        });
        return;
      }
      if (newConfig.reputationRecoveryPerHour !== undefined && newConfig.reputationRecoveryPerHour < 0) {
        res.status(400).json({
          success: false,
          error: 'reputationRecoveryPerHour 不能为负数',
        });
        return;
      }
      if (newConfig.reputationDiscountThreshold !== undefined &&
          newConfig.reputationRejectThreshold !== undefined &&
          newConfig.reputationDiscountThreshold <= newConfig.reputationRejectThreshold) {
        res.status(400).json({
          success: false,
          error: 'reputationDiscountThreshold 必须大于 reputationRejectThreshold',
        });
        return;
      }
      if (newConfig.reputationDiscountRate !== undefined &&
          (newConfig.reputationDiscountRate <= 0 || newConfig.reputationDiscountRate > 1)) {
        res.status(400).json({
          success: false,
          error: 'reputationDiscountRate 必须在 (0, 1] 之间',
        });
        return;
      }
      if (newConfig.maxReputation !== undefined && newConfig.maxReputation <= 0) {
        res.status(400).json({
          success: false,
          error: 'maxReputation 必须大于 0',
        });
        return;
      }
      if (newConfig.initialReputation !== undefined &&
          (newConfig.initialReputation < 0 || newConfig.initialReputation > (newConfig.maxReputation || 100))) {
        res.status(400).json({
          success: false,
          error: 'initialReputation 必须在 [0, maxReputation] 之间',
        });
        return;
      }

      const updatedConfig = this.antiCheatService.updateConfig(newConfig);

      res.json({
        success: true,
        data: updatedConfig,
        message: '配置已更新，立即生效',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '更新配置失败',
      });
    }
  };
}
