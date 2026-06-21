import { Request, Response } from 'express';
import { ReportService } from '../services/ReportService';
import { formatDate } from '../utils';

export class ReportController {
  private reportService: ReportService;

  constructor(reportService: ReportService) {
    this.reportService = reportService;
  }

  getPlanSpendDetail = (req: Request, res: Response): void => {
    const { planId } = req.params;
    const timestamp = Date.now();

    const detail = this.reportService.getPlanSpendDetail(planId, timestamp);

    if (!detail) {
      res.status(404).json({
        success: false,
        error: '计划不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: detail,
    });
  };

  getAllPlansOverview = (req: Request, res: Response): void => {
    const timestamp = Date.now();
    const overview = this.reportService.getAllPlansOverview(timestamp);

    res.json({
      success: true,
      data: overview,
    });
  };

  getDateReport = (req: Request, res: Response): void => {
    const { date } = req.params;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        error: '日期格式无效，请使用 YYYY-MM-DD 格式',
      });
      return;
    }

    const includeAntiCheat = req.query.includeAntiCheat === 'true';

    if (includeAntiCheat) {
      const report = this.reportService.getDateReportWithAntiCheat(date);
      res.json({
        success: true,
        data: report,
      });
      return;
    }

    const report = this.reportService.getDateReport(date);

    res.json({
      success: true,
      data: report,
    });
  };

  getTodayReport = (req: Request, res: Response): void => {
    const today = formatDate(Date.now());
    const includeAntiCheat = req.query.includeAntiCheat === 'true';

    if (includeAntiCheat) {
      const report = this.reportService.getDateReportWithAntiCheat(today);
      res.json({
        success: true,
        data: report,
      });
      return;
    }

    const report = this.reportService.getDateReport(today);

    res.json({
      success: true,
      data: report,
    });
  };
}

