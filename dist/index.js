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
const PlanController_1 = require("./controllers/PlanController");
const BidController_1 = require("./controllers/BidController");
const ReportController_1 = require("./controllers/ReportController");
const routes_1 = require("./routes");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const planManager = new PlanManager_1.PlanManager();
const bidEngine = new BidEngine_1.BidEngine(planManager);
const reportService = new ReportService_1.ReportService(planManager, bidEngine);
const dataInitializer = new DataInitializer_1.DataInitializer(planManager, bidEngine, reportService);
const planController = new PlanController_1.PlanController(planManager);
const bidController = new BidController_1.BidController(bidEngine);
const reportController = new ReportController_1.ReportController(reportService);
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
const router = (0, routes_1.createRouter)(planController, bidController, reportController);
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
   POST   /api/bid                - 处理竞价请求

4. 花费查询
   GET    /api/spend/plans/:planId    - 计划花费明细
   GET    /api/spend/overview         - 所有计划当日花费概览

5. 日结报表
   GET    /api/reports/today          - 今日报表
   GET    /api/reports/:date          - 指定日期报表 (YYYY-MM-DD)

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

# 竞价请求
curl -X POST http://localhost:${PORT}/api/bid \\
  -H "Content-Type: application/json" \\
  -d '{
    "adSlotId": "slot_home_top",
    "reservePrice": 0.005,
    "timestamp": ' + Date.now() + '
  }'

# 查看花费概览
curl http://localhost:${PORT}/api/spend/overview

# 查看今日报表
curl http://localhost:${PORT}/api/reports/today
========================================
  `);
});
//# sourceMappingURL=index.js.map