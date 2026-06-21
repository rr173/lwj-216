"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StressTestController = void 0;
class StressTestController {
    constructor(engine) {
        this.createScenario = (req, res) => {
            try {
                const request = req.body;
                const scenario = this.engine.createScenario(request);
                res.status(201).json({
                    success: true,
                    data: scenario,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '创建场景失败',
                });
            }
        };
        this.updateScenario = (req, res) => {
            try {
                const { scenarioId } = req.params;
                const request = req.body;
                const scenario = this.engine.updateScenario(scenarioId, request);
                res.json({
                    success: true,
                    data: scenario,
                });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : '更新场景失败';
                const status = msg.includes('不允许') ? 409 : msg.includes('不存在') ? 404 : 400;
                res.status(status).json({
                    success: false,
                    error: msg,
                });
            }
        };
        this.deleteScenario = (req, res) => {
            try {
                const { scenarioId } = req.params;
                this.engine.deleteScenario(scenarioId);
                res.json({
                    success: true,
                    message: '场景已删除',
                });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : '删除场景失败';
                const status = msg.includes('不允许') ? 409 : msg.includes('不存在') ? 404 : 400;
                res.status(status).json({
                    success: false,
                    error: msg,
                });
            }
        };
        this.getScenario = (req, res) => {
            const { scenarioId } = req.params;
            const scenario = this.engine.getScenario(scenarioId);
            if (!scenario) {
                res.status(404).json({
                    success: false,
                    error: '场景不存在',
                });
                return;
            }
            res.json({
                success: true,
                data: scenario,
            });
        };
        this.getAllScenarios = (_req, res) => {
            const scenarios = this.engine.getAllScenarios();
            res.json({
                success: true,
                data: scenarios,
            });
        };
        this.runScenario = (req, res) => {
            try {
                const { scenarioId } = req.params;
                const progress = this.engine.runScenario(scenarioId);
                res.json({
                    success: true,
                    data: progress,
                });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : '运行场景失败';
                const status = msg.includes('已有') ? 409 : msg.includes('不存在') ? 404 : 400;
                res.status(status).json({
                    success: false,
                    error: msg,
                });
            }
        };
        this.abortRun = (_req, res) => {
            try {
                const progress = this.engine.abortRun();
                res.json({
                    success: true,
                    data: progress,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '中止场景失败',
                });
            }
        };
        this.getProgress = (_req, res) => {
            const progress = this.engine.getProgress();
            if (!progress) {
                res.json({
                    success: true,
                    data: null,
                    message: '当前没有正在运行的场景',
                });
                return;
            }
            res.json({
                success: true,
                data: progress,
            });
        };
        this.getHistoryList = (_req, res) => {
            const list = this.engine.getHistoryList();
            res.json({
                success: true,
                data: list,
            });
        };
        this.getHistoryReport = (req, res) => {
            const { historyId } = req.params;
            const record = this.engine.getHistoryReport(historyId);
            if (!record) {
                res.status(404).json({
                    success: false,
                    error: '历史记录不存在',
                });
                return;
            }
            res.json({
                success: true,
                data: record,
            });
        };
        this.engine = engine;
    }
}
exports.StressTestController = StressTestController;
//# sourceMappingURL=StressTestController.js.map