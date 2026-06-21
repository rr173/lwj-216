"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const utils_1 = require("../utils");
class ReportController {
    constructor(reportService) {
        this.getPlanSpendDetail = (req, res) => {
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
        this.getAllPlansOverview = (req, res) => {
            const timestamp = Date.now();
            const overview = this.reportService.getAllPlansOverview(timestamp);
            res.json({
                success: true,
                data: overview,
            });
        };
        this.getDateReport = (req, res) => {
            const { date } = req.params;
            if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                res.status(400).json({
                    success: false,
                    error: '日期格式无效，请使用 YYYY-MM-DD 格式',
                });
                return;
            }
            const report = this.reportService.getDateReport(date);
            res.json({
                success: true,
                data: report,
            });
        };
        this.getTodayReport = (req, res) => {
            const today = (0, utils_1.formatDate)(Date.now());
            const report = this.reportService.getDateReport(today);
            res.json({
                success: true,
                data: report,
            });
        };
        this.reportService = reportService;
    }
}
exports.ReportController = ReportController;
//# sourceMappingURL=ReportController.js.map