"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanManager = void 0;
const uuid_1 = require("uuid");
const utils_1 = require("../utils");
const MAX_PLANS = 50;
class PlanManager {
    constructor() {
        this.plans = new Map();
    }
    createPlan(request) {
        if (this.plans.size >= MAX_PLANS) {
            throw new Error(`最多只能同时运行 ${MAX_PLANS} 个计划`);
        }
        if (request.priority < 1 || request.priority > 10) {
            throw new Error('优先级必须在 1-10 之间');
        }
        if (request.dailyBudget <= 0) {
            throw new Error('日预算必须大于 0');
        }
        if (request.targetCPM <= 0) {
            throw new Error('目标 CPM 必须大于 0');
        }
        if (request.timeSlot.startHour < 0 || request.timeSlot.startHour >= 24 ||
            request.timeSlot.endHour <= request.timeSlot.startHour || request.timeSlot.endHour > 24) {
            throw new Error('投放时段无效');
        }
        const now = Date.now();
        const planId = (0, uuid_1.v4)();
        const today = (0, utils_1.formatDate)(now);
        const timeSlotBudgets = this.initializeTimeSlotBudgets(request.dailyBudget, request.timeSlot, now);
        const plan = {
            id: planId,
            name: request.name,
            dailyBudget: (0, utils_1.roundToCents)(request.dailyBudget),
            timeSlot: request.timeSlot,
            targetCPM: (0, utils_1.roundToCents)(request.targetCPM),
            priority: request.priority,
            status: 'running',
            createdAt: now,
            todaySpent: 0,
            todayImpressions: 0,
            todayBidCount: 0,
            todayWinCount: 0,
            timeSlotBudgets,
            lastResetDate: today,
        };
        this.plans.set(planId, plan);
        return plan;
    }
    initializeTimeSlotBudgets(dailyBudget, timeSlot, timestamp) {
        const totalSlots = (0, utils_1.getTotalSlotCount)(timeSlot.startHour, timeSlot.endHour);
        const budgetPerSlot = (0, utils_1.roundToCents)(dailyBudget / totalSlots);
        const budgets = [];
        for (let i = 0; i < totalSlots; i++) {
            budgets.push({
                slotIndex: i,
                startTime: (0, utils_1.getTimeSlotStart)(timestamp, timeSlot.startHour, i),
                endTime: (0, utils_1.getTimeSlotEnd)(timestamp, timeSlot.startHour, i),
                allocatedBudget: budgetPerSlot,
                spentBudget: 0,
                isPaused: false,
            });
        }
        return budgets;
    }
    getPlan(planId) {
        return this.plans.get(planId);
    }
    getAllPlans() {
        return Array.from(this.plans.values());
    }
    pausePlan(planId) {
        const plan = this.plans.get(planId);
        if (!plan)
            return undefined;
        if (plan.status === 'running') {
            plan.status = 'paused';
        }
        return plan;
    }
    resumePlan(planId) {
        const plan = this.plans.get(planId);
        if (!plan)
            return undefined;
        if (plan.status === 'paused') {
            plan.status = 'running';
        }
        return plan;
    }
    checkAndResetDailyBudget(plan, timestamp) {
        const today = (0, utils_1.formatDate)(timestamp);
        if (plan.lastResetDate !== today) {
            plan.todaySpent = 0;
            plan.todayImpressions = 0;
            plan.todayBidCount = 0;
            plan.todayWinCount = 0;
            plan.timeSlotBudgets = this.initializeTimeSlotBudgets(plan.dailyBudget, plan.timeSlot, timestamp);
            plan.lastResetDate = today;
            if (plan.status === 'budget_exhausted') {
                plan.status = 'running';
            }
        }
    }
    getEligiblePlans(timestamp) {
        return this.getAllPlans().filter(plan => {
            this.checkAndResetDailyBudget(plan, timestamp);
            if (plan.status !== 'running')
                return false;
            if (!(0, utils_1.isInTimeSlot)(timestamp, plan.timeSlot.startHour, plan.timeSlot.endHour))
                return false;
            const currentSlotIndex = (0, utils_1.getCurrentSlotIndex)(timestamp, plan.timeSlot.startHour);
            const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
            if (!currentSlot || currentSlot.isPaused)
                return false;
            return true;
        });
    }
    incrementBidCount(planId) {
        const plan = this.plans.get(planId);
        if (plan) {
            plan.todayBidCount++;
        }
    }
    incrementWinCount(planId) {
        const plan = this.plans.get(planId);
        if (plan) {
            plan.todayWinCount++;
        }
    }
    addSpend(planId, amount, timestamp) {
        const plan = this.plans.get(planId);
        if (!plan)
            return;
        plan.todaySpent = (0, utils_1.roundToCents)(plan.todaySpent + amount);
        plan.todayImpressions++;
        const currentSlotIndex = (0, utils_1.getCurrentSlotIndex)(timestamp, plan.timeSlot.startHour);
        const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
        if (currentSlot) {
            currentSlot.spentBudget = (0, utils_1.roundToCents)(currentSlot.spentBudget + amount);
            this.checkTimeSlotPause(plan, currentSlotIndex, timestamp);
        }
        if (plan.todaySpent >= plan.dailyBudget) {
            plan.status = 'budget_exhausted';
        }
    }
    checkTimeSlotPause(plan, currentSlotIndex, timestamp) {
        const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
        if (!currentSlot)
            return;
        if (currentSlot.spentBudget >= currentSlot.allocatedBudget) {
            currentSlot.isPaused = true;
            this.redistributeRemainingBudget(plan, currentSlotIndex, timestamp);
        }
    }
    redistributeRemainingBudget(plan, exhaustedSlotIndex, timestamp) {
        const remainingSlots = plan.timeSlotBudgets.slice(exhaustedSlotIndex + 1);
        if (remainingSlots.length === 0)
            return;
        let totalRemaining = 0;
        for (let i = exhaustedSlotIndex; i < plan.timeSlotBudgets.length; i++) {
            const slot = plan.timeSlotBudgets[i];
            totalRemaining += (0, utils_1.roundToCents)(slot.allocatedBudget - slot.spentBudget);
        }
        totalRemaining = (0, utils_1.roundToCents)(totalRemaining);
        if (totalRemaining <= 0)
            return;
        const activeRemainingSlots = remainingSlots.filter(s => !s.isPaused);
        if (activeRemainingSlots.length === 0)
            return;
        const additionalPerSlot = (0, utils_1.roundToCents)(totalRemaining / activeRemainingSlots.length);
        for (const slot of activeRemainingSlots) {
            slot.allocatedBudget = (0, utils_1.roundToCents)(slot.allocatedBudget + additionalPerSlot);
        }
    }
    getPlanCount() {
        return this.plans.size;
    }
}
exports.PlanManager = PlanManager;
//# sourceMappingURL=PlanManager.js.map