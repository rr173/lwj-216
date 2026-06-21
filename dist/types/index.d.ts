export type PlanStatus = 'running' | 'paused' | 'budget_exhausted';
export interface TimeSlot {
    startHour: number;
    endHour: number;
}
export interface CreatePlanRequest {
    name: string;
    dailyBudget: number;
    timeSlot: TimeSlot;
    targetCPM: number;
    priority: number;
}
export interface Plan {
    id: string;
    name: string;
    dailyBudget: number;
    timeSlot: TimeSlot;
    targetCPM: number;
    priority: number;
    status: PlanStatus;
    createdAt: number;
    todaySpent: number;
    todayImpressions: number;
    todayBidCount: number;
    todayWinCount: number;
    timeSlotBudgets: TimeSlotBudget[];
    lastResetDate: string;
}
export interface TimeSlotBudget {
    slotIndex: number;
    startTime: number;
    endTime: number;
    allocatedBudget: number;
    spentBudget: number;
    isPaused: boolean;
}
export interface BidRequest {
    adSlotId: string;
    reservePrice: number;
    timestamp: number;
}
export interface BidCandidate {
    planId: string;
    bidPrice: number;
    priority: number;
}
export interface BidResult {
    winnerPlanId: string | null;
    actualCost: number;
    timestamp: number;
    adSlotId: string;
}
export interface SpendRecord {
    id: string;
    planId: string;
    amount: number;
    timestamp: number;
    adSlotId: string;
    date: string;
}
export interface PlanSpendDetail {
    planId: string;
    planName: string;
    records: SpendRecord[];
    todaySpent: number;
    remainingBudget: number;
    currentTimeSlot: {
        slotIndex: number;
        allocatedBudget: number;
        spentBudget: number;
        remainingBudget: number;
        startTime: number;
        endTime: number;
    } | null;
}
export interface PlanOverview {
    planId: string;
    name: string;
    dailyBudget: number;
    todaySpent: number;
    consumptionRate: number;
    status: PlanStatus;
}
export interface DailyReport {
    planId: string;
    planName: string;
    totalSpent: number;
    totalImpressions: number;
    actualCPM: number;
    budgetUtilization: number;
    bidCount: number;
    winCount: number;
    winRate: number;
}
export interface DateReport {
    date: string;
    reports: DailyReport[];
}
