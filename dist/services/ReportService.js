"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const utils_1 = require("../utils");
class ReportService {
    constructor(planManager, bidEngine) {
        this.historicalData = new Map();
        this.planManager = planManager;
        this.bidEngine = bidEngine;
    }
    getPlanSpendDetail(planId, timestamp) {
        const plan = this.planManager.getPlan(planId);
        if (!plan)
            return null;
        this.planManager.checkAndResetDailyBudget(plan, timestamp);
        const today = (0, utils_1.formatDate)(timestamp);
        const records = this.bidEngine.getSpendRecordsByPlanAndDate(planId, today);
        const remainingBudget = (0, utils_1.roundToCents)(plan.dailyBudget - plan.todaySpent);
        let currentTimeSlot = null;
        const currentSlotIndex = (0, utils_1.getCurrentSlotIndex)(timestamp, plan.timeSlot.startHour);
        const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
        if (currentSlot) {
            currentTimeSlot = {
                slotIndex: currentSlotIndex,
                allocatedBudget: (0, utils_1.roundToCents)(currentSlot.allocatedBudget),
                spentBudget: (0, utils_1.roundToCents)(currentSlot.spentBudget),
                remainingBudget: (0, utils_1.roundToCents)(currentSlot.allocatedBudget - currentSlot.spentBudget),
                startTime: currentSlot.startTime,
                endTime: currentSlot.endTime,
            };
        }
        return {
            planId: plan.id,
            planName: plan.name,
            records,
            todaySpent: (0, utils_1.roundToCents)(plan.todaySpent),
            remainingBudget,
            currentTimeSlot,
        };
    }
    getAllPlansOverview(timestamp) {
        const today = (0, utils_1.formatDate)(timestamp);
        return this.planManager.getAllPlans().map(plan => {
            this.planManager.checkAndResetDailyBudget(plan, timestamp);
            const consumptionRate = plan.dailyBudget > 0
                ? (0, utils_1.roundToDecimals)((plan.todaySpent / plan.dailyBudget) * 100, 4)
                : 0;
            return {
                planId: plan.id,
                name: plan.name,
                dailyBudget: plan.dailyBudget,
                todaySpent: (0, utils_1.roundToCents)(plan.todaySpent),
                consumptionRate,
                status: plan.status,
            };
        });
    }
    getDateReport(date) {
        const reports = [];
        const spendRecords = this.bidEngine.getSpendRecordsByDate(date);
        const today = (0, utils_1.formatDate)(Date.now());
        for (const plan of this.planManager.getAllPlans()) {
            let totalSpent = 0;
            let totalImpressions = 0;
            let bidCount = 0;
            let winCount = 0;
            if (date === today) {
                totalSpent = plan.todaySpent;
                totalImpressions = plan.todayImpressions;
                bidCount = plan.todayBidCount;
                winCount = plan.todayWinCount;
            }
            else {
                const planRecords = spendRecords.filter(r => r.planId === plan.id);
                totalSpent = planRecords.reduce((sum, r) => sum + r.amount, 0);
                totalImpressions = planRecords.length;
                const historical = this.historicalData.get(date);
                if (historical) {
                    const planData = historical.find(h => h.planId === plan.id);
                    if (planData) {
                        bidCount = planData.bidCount;
                        winCount = planData.winCount;
                    }
                }
            }
            const actualCPM = totalImpressions > 0
                ? (0, utils_1.roundToCents)((totalSpent / totalImpressions) * 1000)
                : 0;
            const budgetUtilization = plan.dailyBudget > 0
                ? (0, utils_1.roundToDecimals)(totalSpent / plan.dailyBudget, 4)
                : 0;
            const winRate = bidCount > 0
                ? (0, utils_1.roundToCents)((winCount / bidCount) * 100)
                : 0;
            reports.push({
                planId: plan.id,
                planName: plan.name,
                totalSpent: (0, utils_1.roundToCents)(totalSpent),
                totalImpressions,
                actualCPM,
                budgetUtilization,
                bidCount,
                winCount,
                winRate,
            });
        }
        return {
            date,
            reports,
        };
    }
    setHistoricalPlanData(date, planId, data) {
        if (!this.historicalData.has(date)) {
            this.historicalData.set(date, []);
        }
        this.historicalData.get(date).push({
            ...data,
            planId,
        });
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=ReportService.js.map