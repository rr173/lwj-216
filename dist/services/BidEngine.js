"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidEngine = void 0;
const uuid_1 = require("uuid");
const utils_1 = require("../utils");
class BidEngine {
    constructor(planManager) {
        this.spendRecords = new Map();
        this.planManager = planManager;
    }
    processBidRequest(request, options) {
        const { adSlotId, reservePrice, timestamp } = request;
        const discountRate = options?.discountRate ?? 1.0;
        const eligiblePlans = this.planManager.getEligiblePlans(timestamp);
        const candidates = [];
        for (const plan of eligiblePlans) {
            this.planManager.incrementBidCount(plan.id);
            let bidPrice = this.calculateBidPrice(plan, reservePrice);
            if (bidPrice <= 0)
                continue;
            if (discountRate < 1.0) {
                bidPrice = (0, utils_1.roundToCents)(bidPrice * discountRate);
            }
            if (bidPrice <= reservePrice)
                continue;
            if (!this.canAfford(plan, bidPrice, reservePrice, timestamp))
                continue;
            candidates.push({
                planId: plan.id,
                bidPrice,
                priority: plan.priority,
            });
        }
        if (candidates.length === 0) {
            return {
                winnerPlanId: null,
                actualCost: 0,
                timestamp,
                adSlotId,
            };
        }
        candidates.sort((a, b) => {
            if (b.bidPrice !== a.bidPrice) {
                return b.bidPrice - a.bidPrice;
            }
            return b.priority - a.priority;
        });
        const winner = candidates[0];
        let actualCost;
        if (candidates.length >= 2) {
            actualCost = (0, utils_1.roundToCents)(candidates[1].bidPrice + 0.01);
        }
        else {
            actualCost = (0, utils_1.roundToCents)(reservePrice + 0.01);
        }
        const winnerPlan = this.planManager.getPlan(winner.planId);
        if (!winnerPlan) {
            return {
                winnerPlanId: null,
                actualCost: 0,
                timestamp,
                adSlotId,
            };
        }
        const remainingDailyBudget = (0, utils_1.roundToCents)(winnerPlan.dailyBudget - winnerPlan.todaySpent);
        if (actualCost > remainingDailyBudget) {
            actualCost = remainingDailyBudget;
        }
        const currentSlotIndex = (0, utils_1.getCurrentSlotIndex)(timestamp, winnerPlan.timeSlot.startHour);
        const currentSlot = winnerPlan.timeSlotBudgets[currentSlotIndex];
        if (currentSlot) {
            const remainingSlotBudget = (0, utils_1.roundToCents)(currentSlot.allocatedBudget - currentSlot.spentBudget);
            if (actualCost > remainingSlotBudget) {
                actualCost = remainingSlotBudget;
            }
        }
        if (actualCost <= 0) {
            return {
                winnerPlanId: null,
                actualCost: 0,
                timestamp,
                adSlotId,
            };
        }
        this.planManager.incrementWinCount(winner.planId);
        this.planManager.addSpend(winner.planId, actualCost, timestamp);
        const spendRecord = {
            id: (0, uuid_1.v4)(),
            planId: winner.planId,
            amount: actualCost,
            timestamp,
            adSlotId,
            date: (0, utils_1.formatDate)(timestamp),
        };
        this.addSpendRecord(spendRecord);
        return {
            winnerPlanId: winner.planId,
            actualCost,
            timestamp,
            adSlotId,
        };
    }
    canAfford(plan, bidPrice, reservePrice, timestamp) {
        const maxPossibleCost = bidPrice;
        const remainingDailyBudget = (0, utils_1.roundToCents)(plan.dailyBudget - plan.todaySpent);
        if (remainingDailyBudget < maxPossibleCost && remainingDailyBudget < (0, utils_1.roundToCents)(reservePrice + 0.01)) {
            return false;
        }
        const currentSlotIndex = (0, utils_1.getCurrentSlotIndex)(timestamp, plan.timeSlot.startHour);
        const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
        if (currentSlot) {
            const remainingSlotBudget = (0, utils_1.roundToCents)(currentSlot.allocatedBudget - currentSlot.spentBudget);
            if (remainingSlotBudget < maxPossibleCost && remainingSlotBudget < (0, utils_1.roundToCents)(reservePrice + 0.01)) {
                return false;
            }
        }
        return true;
    }
    calculateBidPrice(plan, reservePrice) {
        const maxBid = (0, utils_1.roundToCents)(plan.targetCPM / 1000);
        if (maxBid <= reservePrice) {
            return 0;
        }
        return maxBid;
    }
    addSpendRecord(record) {
        const date = record.date;
        if (!this.spendRecords.has(date)) {
            this.spendRecords.set(date, []);
        }
        this.spendRecords.get(date).push(record);
    }
    getSpendRecordsByPlanAndDate(planId, date) {
        const records = this.spendRecords.get(date) || [];
        return records.filter(r => r.planId === planId).sort((a, b) => a.timestamp - b.timestamp);
    }
    getSpendRecordsByDate(date) {
        return this.spendRecords.get(date) || [];
    }
    addHistoricalSpendRecord(record) {
        this.addSpendRecord(record);
    }
}
exports.BidEngine = BidEngine;
//# sourceMappingURL=BidEngine.js.map