import { v4 as uuidv4 } from 'uuid';
import { PlanManager } from './PlanManager';
import { BidEngine } from './BidEngine';
import { ReportService } from './ReportService';
import { CreatePlanRequest, SpendRecord } from '../types';
import { formatDate, roundToCents, getStartOfDay } from '../utils';

const PRESET_PLANS: CreatePlanRequest[] = [
  {
    name: '品牌推广计划A',
    dailyBudget: 2000,
    timeSlot: { startHour: 8, endHour: 23 },
    targetCPM: 30,
    priority: 10,
  },
  {
    name: '促销活动计划B',
    dailyBudget: 1000,
    timeSlot: { startHour: 9, endHour: 22 },
    targetCPM: 20,
    priority: 8,
  },
  {
    name: '新品发布计划C',
    dailyBudget: 500,
    timeSlot: { startHour: 10, endHour: 20 },
    targetCPM: 15,
    priority: 6,
  },
  {
    name: '效果广告计划D',
    dailyBudget: 200,
    timeSlot: { startHour: 7, endHour: 24 },
    targetCPM: 10,
    priority: 4,
  },
  {
    name: '品牌曝光计划E',
    dailyBudget: 100,
    timeSlot: { startHour: 8, endHour: 18 },
    targetCPM: 5,
    priority: 2,
  },
];

const AD_SLOT_IDS = ['slot_home_top', 'slot_list_side', 'slot_detail_bottom', 'slot_popup'];
const RESERVE_PRICES = [0.005, 0.003, 0.008, 0.002];

export class DataInitializer {
  private planManager: PlanManager;
  private bidEngine: BidEngine;
  private reportService: ReportService;
  private planIds: string[] = [];

  constructor(planManager: PlanManager, bidEngine: BidEngine, reportService: ReportService) {
    this.planManager = planManager;
    this.bidEngine = bidEngine;
    this.reportService = reportService;
  }

  initialize(): void {
    this.createPresetPlans();
    this.generateHistoricalData();
  }

  private createPresetPlans(): void {
    for (const planRequest of PRESET_PLANS) {
      const plan = this.planManager.createPlan(planRequest);
      this.planIds.push(plan.id);
      console.log(`已创建预置计划: ${plan.name} (ID: ${plan.id})`);
    }
  }

  private generateHistoricalData(): void {
    const now = Date.now();
    const today = formatDate(now);
    const startOfDay = getStartOfDay(now);

    const startHour = 8;
    const threeHoursLater = startOfDay + (startHour + 3) * 60 * 60 * 1000;
    const startTime = startOfDay + startHour * 60 * 60 * 1000;

    const totalRecords = 200;
    const interval = (threeHoursLater - startTime) / totalRecords;

    const planBidCounts: Map<string, number> = new Map();
    const planWinCounts: Map<string, number> = new Map();
    const planSpent: Map<string, number> = new Map();
    const planImpressions: Map<string, number> = new Map();

    for (const planId of this.planIds) {
      planBidCounts.set(planId, 0);
      planWinCounts.set(planId, 0);
      planSpent.set(planId, 0);
      planImpressions.set(planId, 0);
    }

    for (let i = 0; i < totalRecords; i++) {
      const timestamp = Math.floor(startTime + i * interval + Math.random() * interval * 0.5);
      const adSlotIndex = Math.floor(Math.random() * AD_SLOT_IDS.length);
      const adSlotId = AD_SLOT_IDS[adSlotIndex];
      const reservePrice = RESERVE_PRICES[adSlotIndex];

      const eligiblePlans = this.planIds.filter(planId => {
        const plan = this.planManager.getPlan(planId)!;
        const date = new Date(timestamp);
        const hour = date.getHours();
        return hour >= plan.timeSlot.startHour && hour < plan.timeSlot.endHour;
      });

      if (eligiblePlans.length === 0) continue;

      const shuffledEligible = [...eligiblePlans].sort(() => Math.random() - 0.5);
      const numParticipants = Math.max(1, Math.floor(Math.random() * Math.min(3, shuffledEligible.length)) + 1);
      const selectedPlans = shuffledEligible.slice(0, numParticipants);

      const candidates: { planId: string; bidPrice: number; priority: number }[] = [];

      for (const planId of selectedPlans) {
        const plan = this.planManager.getPlan(planId)!;
        planBidCounts.set(planId, (planBidCounts.get(planId) || 0) + 1);

        const bidPrice = roundToCents(plan.targetCPM / 1000);
        if (bidPrice <= reservePrice) continue;

        const planTotalSpent = planSpent.get(planId) || 0;
        const remainingDaily = roundToCents(plan.dailyBudget - planTotalSpent);
        const estimatedCost = roundToCents(reservePrice + 0.01);
        if (remainingDaily < estimatedCost) continue;

        const currentSlotIndex = Math.floor((((new Date(timestamp)).getHours() - plan.timeSlot.startHour) * 60 + (new Date(timestamp)).getMinutes()) / 15);
        const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
        if (currentSlot) {
          const remainingSlot = roundToCents(currentSlot.allocatedBudget - currentSlot.spentBudget);
          if (remainingSlot < estimatedCost) continue;
        }

        candidates.push({
          planId,
          bidPrice,
          priority: plan.priority,
        });
      }

      if (candidates.length === 0) continue;

      candidates.sort((a, b) => {
        if (b.bidPrice !== a.bidPrice) return b.bidPrice - a.bidPrice;
        return b.priority - a.priority;
      });

      const winner = candidates[0];
      const winnerPlan = this.planManager.getPlan(winner.planId)!;
      let actualCost: number;

      if (candidates.length >= 2) {
        actualCost = roundToCents(candidates[1].bidPrice + 0.01);
      } else {
        actualCost = roundToCents(reservePrice + 0.01);
      }

      const remainingDailyBudget = roundToCents(winnerPlan.dailyBudget - (planSpent.get(winner.planId) || 0));
      if (actualCost > remainingDailyBudget) {
        actualCost = remainingDailyBudget;
      }

      const currentSlotIndex = Math.floor((((new Date(timestamp)).getHours() - winnerPlan.timeSlot.startHour) * 60 + (new Date(timestamp)).getMinutes()) / 15);
      const winnerCurrentSlot = winnerPlan.timeSlotBudgets[currentSlotIndex];
      if (winnerCurrentSlot) {
        const remainingSlotBudget = roundToCents(winnerCurrentSlot.allocatedBudget - winnerCurrentSlot.spentBudget);
        if (actualCost > remainingSlotBudget) {
          actualCost = remainingSlotBudget;
        }
      }

      if (actualCost <= 0) continue;

      planWinCounts.set(winner.planId, (planWinCounts.get(winner.planId) || 0) + 1);
      planSpent.set(winner.planId, roundToCents((planSpent.get(winner.planId) || 0) + actualCost));
      planImpressions.set(winner.planId, (planImpressions.get(winner.planId) || 0) + 1);

      const record: SpendRecord = {
        id: uuidv4(),
        planId: winner.planId,
        amount: actualCost,
        timestamp,
        adSlotId,
        date: today,
      };

      this.bidEngine.addHistoricalSpendRecord(record);
      this.planManager.addSpend(winner.planId, actualCost, timestamp);
    }

    for (const planId of this.planIds) {
      const plan = this.planManager.getPlan(planId)!;
      plan.todayBidCount = planBidCounts.get(planId) || 0;
      plan.todayWinCount = planWinCounts.get(planId) || 0;

      this.reportService.setHistoricalPlanData(today, planId, {
        totalSpent: planSpent.get(planId) || 0,
        totalImpressions: planImpressions.get(planId) || 0,
        bidCount: planBidCounts.get(planId) || 0,
        winCount: planWinCounts.get(planId) || 0,
      });

      console.log(`计划 ${plan.name}: 竞价 ${plan.todayBidCount} 次, 胜出 ${plan.todayWinCount} 次, 花费 ${plan.todaySpent.toFixed(2)} 元`);
    }

    console.log(`已生成 ${totalRecords} 条模拟扣费记录`);
  }

  getPlanIds(): string[] {
    return this.planIds;
  }
}
