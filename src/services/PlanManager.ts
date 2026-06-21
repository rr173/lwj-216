import { v4 as uuidv4 } from 'uuid';
import { Plan, CreatePlanRequest, PlanStatus, TimeSlotBudget, TimeSlot } from '../types';
import {
  formatDate,
  getTotalSlotCount,
  getTimeSlotStart,
  getTimeSlotEnd,
  roundToCents,
  isInTimeSlot,
  getCurrentSlotIndex,
} from '../utils';

const MAX_PLANS = 50;

export class PlanManager {
  private plans: Map<string, Plan> = new Map();

  createPlan(request: CreatePlanRequest): Plan {
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
    const planId = uuidv4();
    const today = formatDate(now);

    const timeSlotBudgets = this.initializeTimeSlotBudgets(
      request.dailyBudget,
      request.timeSlot,
      now
    );

    const plan: Plan = {
      id: planId,
      name: request.name,
      dailyBudget: roundToCents(request.dailyBudget),
      timeSlot: request.timeSlot,
      targetCPM: roundToCents(request.targetCPM),
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

  private initializeTimeSlotBudgets(
    dailyBudget: number,
    timeSlot: TimeSlot,
    timestamp: number
  ): TimeSlotBudget[] {
    const totalSlots = getTotalSlotCount(timeSlot.startHour, timeSlot.endHour);
    const budgetPerSlot = roundToCents(dailyBudget / totalSlots);
    const budgets: TimeSlotBudget[] = [];

    for (let i = 0; i < totalSlots; i++) {
      budgets.push({
        slotIndex: i,
        startTime: getTimeSlotStart(timestamp, timeSlot.startHour, i),
        endTime: getTimeSlotEnd(timestamp, timeSlot.startHour, i),
        allocatedBudget: budgetPerSlot,
        spentBudget: 0,
        isPaused: false,
      });
    }

    return budgets;
  }

  getPlan(planId: string): Plan | undefined {
    return this.plans.get(planId);
  }

  getAllPlans(): Plan[] {
    return Array.from(this.plans.values());
  }

  pausePlan(planId: string): Plan | undefined {
    const plan = this.plans.get(planId);
    if (!plan) return undefined;

    if (plan.status === 'running') {
      plan.status = 'paused';
    }
    return plan;
  }

  resumePlan(planId: string): Plan | undefined {
    const plan = this.plans.get(planId);
    if (!plan) return undefined;

    if (plan.status === 'paused') {
      plan.status = 'running';
    }
    return plan;
  }

  checkAndResetDailyBudget(plan: Plan, timestamp: number): void {
    const today = formatDate(timestamp);
    if (plan.lastResetDate !== today) {
      plan.todaySpent = 0;
      plan.todayImpressions = 0;
      plan.todayBidCount = 0;
      plan.todayWinCount = 0;
      plan.timeSlotBudgets = this.initializeTimeSlotBudgets(
        plan.dailyBudget,
        plan.timeSlot,
        timestamp
      );
      plan.lastResetDate = today;
      if (plan.status === 'budget_exhausted') {
        plan.status = 'running';
      }
    }
  }

  getEligiblePlans(timestamp: number): Plan[] {
    return this.getAllPlans().filter(plan => {
      this.checkAndResetDailyBudget(plan, timestamp);

      if (plan.status !== 'running') return false;
      if (!isInTimeSlot(timestamp, plan.timeSlot.startHour, plan.timeSlot.endHour)) return false;

      const currentSlotIndex = getCurrentSlotIndex(timestamp, plan.timeSlot.startHour);
      const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
      if (!currentSlot || currentSlot.isPaused) return false;

      return true;
    });
  }

  incrementBidCount(planId: string): void {
    const plan = this.plans.get(planId);
    if (plan) {
      plan.todayBidCount++;
    }
  }

  incrementWinCount(planId: string): void {
    const plan = this.plans.get(planId);
    if (plan) {
      plan.todayWinCount++;
    }
  }

  addSpend(planId: string, amount: number, timestamp: number): void {
    const plan = this.plans.get(planId);
    if (!plan) return;

    plan.todaySpent = roundToCents(plan.todaySpent + amount);
    plan.todayImpressions++;

    const currentSlotIndex = getCurrentSlotIndex(timestamp, plan.timeSlot.startHour);
    const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
    if (currentSlot) {
      currentSlot.spentBudget = roundToCents(currentSlot.spentBudget + amount);
      this.checkTimeSlotPause(plan, currentSlotIndex, timestamp);
    }

    if (plan.todaySpent >= plan.dailyBudget) {
      plan.status = 'budget_exhausted';
    }
  }

  private checkTimeSlotPause(plan: Plan, currentSlotIndex: number, timestamp: number): void {
    const currentSlot = plan.timeSlotBudgets[currentSlotIndex];
    if (!currentSlot) return;

    if (currentSlot.spentBudget >= currentSlot.allocatedBudget) {
      currentSlot.isPaused = true;
      this.redistributeRemainingBudget(plan, currentSlotIndex, timestamp);
    }
  }

  private redistributeRemainingBudget(plan: Plan, exhaustedSlotIndex: number, timestamp: number): void {
    const remainingSlots = plan.timeSlotBudgets.slice(exhaustedSlotIndex + 1);
    if (remainingSlots.length === 0) return;

    let totalRemaining = 0;
    for (let i = exhaustedSlotIndex; i < plan.timeSlotBudgets.length; i++) {
      const slot = plan.timeSlotBudgets[i];
      totalRemaining += roundToCents(slot.allocatedBudget - slot.spentBudget);
    }

    totalRemaining = roundToCents(totalRemaining);
    if (totalRemaining <= 0) return;

    const activeRemainingSlots = remainingSlots.filter(s => !s.isPaused);
    if (activeRemainingSlots.length === 0) return;

    const additionalPerSlot = roundToCents(totalRemaining / activeRemainingSlots.length);

    for (const slot of activeRemainingSlots) {
      slot.allocatedBudget = roundToCents(slot.allocatedBudget + additionalPerSlot);
    }
  }

  getPlanCount(): number {
    return this.plans.size;
  }
}
