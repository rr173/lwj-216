import { v4 as uuidv4 } from 'uuid';
import { PlanManager } from './PlanManager';
import { BidRequest, BidResult, BidCandidate, SpendRecord } from '../types';
import { formatDate, roundToCents } from '../utils';

export class BidEngine {
  private planManager: PlanManager;
  private spendRecords: Map<string, SpendRecord[]> = new Map();

  constructor(planManager: PlanManager) {
    this.planManager = planManager;
  }

  processBidRequest(request: BidRequest): BidResult {
    const { adSlotId, reservePrice, timestamp } = request;

    const eligiblePlans = this.planManager.getEligiblePlans(timestamp);

    const candidates: BidCandidate[] = [];

    for (const plan of eligiblePlans) {
      this.planManager.incrementBidCount(plan.id);

      const bidPrice = this.calculateBidPrice(plan, reservePrice);
      if (bidPrice <= 0) continue;

      const estimatedCost = roundToCents(reservePrice + 0.01);
      const remainingBudget = roundToCents(plan.dailyBudget - plan.todaySpent);
      if (remainingBudget < estimatedCost) continue;

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
    let actualCost: number;

    if (candidates.length >= 2) {
      actualCost = roundToCents(candidates[1].bidPrice + 0.01);
    } else {
      actualCost = roundToCents(reservePrice + 0.01);
    }

    this.planManager.incrementWinCount(winner.planId);
    this.planManager.addSpend(winner.planId, actualCost, timestamp);

    const spendRecord: SpendRecord = {
      id: uuidv4(),
      planId: winner.planId,
      amount: actualCost,
      timestamp,
      adSlotId,
      date: formatDate(timestamp),
    };

    this.addSpendRecord(spendRecord);

    return {
      winnerPlanId: winner.planId,
      actualCost,
      timestamp,
      adSlotId,
    };
  }

  private calculateBidPrice(plan: { targetCPM: number }, reservePrice: number): number {
    const maxBid = roundToCents(plan.targetCPM / 1000);
    if (maxBid <= reservePrice) {
      return 0;
    }
    return maxBid;
  }

  private addSpendRecord(record: SpendRecord): void {
    const date = record.date;
    if (!this.spendRecords.has(date)) {
      this.spendRecords.set(date, []);
    }
    this.spendRecords.get(date)!.push(record);
  }

  getSpendRecordsByPlanAndDate(planId: string, date: string): SpendRecord[] {
    const records = this.spendRecords.get(date) || [];
    return records.filter(r => r.planId === planId).sort((a, b) => a.timestamp - b.timestamp);
  }

  getSpendRecordsByDate(date: string): SpendRecord[] {
    return this.spendRecords.get(date) || [];
  }

  addHistoricalSpendRecord(record: SpendRecord): void {
    this.addSpendRecord(record);
  }
}
