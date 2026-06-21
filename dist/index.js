"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PlanManager_1 = require("./services/PlanManager");
const BidEngine_1 = require("./services/BidEngine");
const ReportService_1 = require("./services/ReportService");
const DataInitializer_1 = require("./services/DataInitializer");
const AntiCheatService_1 = require("./services/AntiCheatService");
const StressTestEngine_1 = require("./services/StressTestEngine");
const PlanController_1 = require("./controllers/PlanController");
const BidController_1 = require("./controllers/BidController");
const ReportController_1 = require("./controllers/ReportController");
const AntiCheatController_1 = require("./controllers/AntiCheatController");
const StressTestController_1 = require("./controllers/StressTestController");
const routes_1 = require("./routes");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const planManager = new PlanManager_1.PlanManager();
const bidEngine = new BidEngine_1.BidEngine(planManager);
const antiCheatService = new AntiCheatService_1.AntiCheatService();
const reportService = new ReportService_1.ReportService(planManager, bidEngine, antiCheatService);
const dataInitializer = new DataInitializer_1.DataInitializer(planManager, bidEngine, reportService);
const stressTestEngine = new StressTestEngine_1.StressTestEngine(bidEngine, antiCheatService, planManager);
const planController = new PlanController_1.PlanController(planManager);
const bidController = new BidController_1.BidController(bidEngine, antiCheatService);
const reportController = new ReportController_1.ReportController(reportService);
const antiCheatController = new AntiCheatController_1.AntiCheatController(antiCheatService);
const stressTestController = new StressTestController_1.StressTestController(stressTestEngine);
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
const router = (0, routes_1.createRouter)(planController, bidController, reportController, antiCheatController, stressTestController);
app.use('/api', router);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在',
    });
});
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
    });
});
console.log('========================================');
console.log('广告投放预算分配与竞价策略引擎启动中...');
console.log('========================================');
dataInitializer.initialize();
console.log('========================================');
console.log('数据初始化完成');
console.log('========================================');
app.listen(PORT, () => {
    console.log(`
========================================
服务器已启动，监听端口: ${PORT}
========================================

可用API接口:

1. 健康检查
   GET /api/health

2. 计划管理
   POST   /api/plans              - 创建投放计划
   GET    /api/plans              - 获取所有计划
   GET    /api/plans/:planId      - 获取单个计划
   POST   /api/plans/:planId/pause   - 暂停计划
   POST   /api/plans/:planId/resume  - 恢复计划

3. 竞价处理
   POST   /api/bid                - 处理竞价请求 (已集成反作弊检查)

4. 花费查询
   GET    /api/spend/plans/:planId    - 计划花费明细
   GET    /api/spend/overview         - 所有计划当日花费概览

5. 日结报表
   GET    /api/reports/today          - 今日报表
   GET    /api/reports/today?includeAntiCheat=true - 今日报表(含反作弊维度)
   GET    /api/reports/:date          - 指定日期报表 (YYYY-MM-DD)
   GET    /api/reports/:date?includeAntiCheat=true - 指定日期报表(含反作弊维度)

6. 反作弊与流量质量
   GET    /api/anticheat/blocks            - 全局拦截记录列表
   GET    /api/anticheat/blocks/:adSlotId  - 指定广告位拦截历史
   GET    /api/anticheat/reputations       - 所有广告位信誉分列表
   GET    /api/anticheat/reputations/:adSlotId - 指定广告位当前信誉分
   GET    /api/anticheat/stats             - 全局拦截统计(总拦截/按原因/低信誉广告位)
   GET    /api/anticheat/config            - 获取反作弊配置
   PUT    /api/anticheat/config            - 更新反作弊配置(动态生效)

7. 竞价模拟压测引擎
   POST   /api/stress/scenarios               - 创建压测场景
   GET    /api/stress/scenarios               - 获取所有场景
   GET    /api/stress/scenarios/:scenarioId   - 获取单个场景
   PUT    /api/stress/scenarios/:scenarioId   - 编辑场景
   DELETE /api/stress/scenarios/:scenarioId   - 删除场景
   POST   /api/stress/scenarios/:scenarioId/run - 运行场景
   POST   /api/stress/abort                   - 中止当前运行
   GET    /api/stress/progress                - 查询实时进度
   GET    /api/stress/history                 - 历史运行记录列表
   GET    /api/stress/history/:historyId      - 查看完整报告

========================================
示例请求:

# 创建计划
curl -X POST http://localhost:${PORT}/api/plans \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "新广告计划",
    "dailyBudget": 500,
    "timeSlot": { "startHour": 8, "endHour": 22 },
    "targetCPM": 15,
    "priority": 5
  }'

# 竞价请求 (先过反作弊，通过才进竞价)
curl -X POST http://localhost:${PORT}/api/bid \\
  -H "Content-Type: application/json" \\
  -d '{
    "adSlotId": "slot_home_top",
    "reservePrice": 0.005,
    "timestamp": ' + Date.now() + '
  }'

# 查看反作弊全局统计
curl http://localhost:${PORT}/api/anticheat/stats

# 查看广告位信誉分
curl http://localhost:${PORT}/api/anticheat/reputations/slot_home_top

# 获取反作弊配置
curl http://localhost:${PORT}/api/anticheat/config

# 更新反作弊配置(动态生效，无需重启)
curl -X PUT http://localhost:${PORT}/api/anticheat/config \\
  -H "Content-Type: application/json" \\
  -d '{
    "windowSizeSeconds": 60,
    "frequencyThreshold": 100,
    "timestampDuplicateThreshold": 10,
    "frequencyPenalty": 5,
    "timestampPenalty": 20,
    "reputationRecoveryPerHour": 2,
    "reputationDiscountThreshold": 60,
    "reputationRejectThreshold": 30,
    "reputationDiscountRate": 0.8
  }'

# 查看今日报表(含反作弊拦截率、通过率)
curl "http://localhost:${PORT}/api/reports/today?includeAntiCheat=true"

# 查看花费概览
curl http://localhost:${PORT}/api/spend/overview
========================================
  `);
});
//# sourceMappingURL=index.js.map