import { Plan, CreatePlanRequest } from '../types';
export declare class PlanManager {
    private plans;
    createPlan(request: CreatePlanRequest): Plan;
    private initializeTimeSlotBudgets;
    getPlan(planId: string): Plan | undefined;
    getAllPlans(): Plan[];
    pausePlan(planId: string): Plan | undefined;
    resumePlan(planId: string): Plan | undefined;
    checkAndResetDailyBudget(plan: Plan, timestamp: number): void;
    getEligiblePlans(timestamp: number): Plan[];
    incrementBidCount(planId: string): void;
    incrementWinCount(planId: string): void;
    addSpend(planId: string, amount: number, timestamp: number): void;
    private checkTimeSlotPause;
    private redistributeRemainingBudget;
    getPlanCount(): number;
}
