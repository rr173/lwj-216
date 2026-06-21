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
  originalCost?: number;
  discountRate?: number;
  appliedDiscount?: boolean;
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

export type BlockReason = 'frequency_exceeded' | 'timestamp_duplicate' | 'reputation_too_low';

export interface AntiCheatConfig {
  windowSizeSeconds: number;
  frequencyThreshold: number;
  timestampDuplicateThreshold: number;
  frequencyPenalty: number;
  timestampPenalty: number;
  reputationRecoveryPerHour: number;
  reputationDiscountThreshold: number;
  reputationRejectThreshold: number;
  reputationDiscountRate: number;
  maxReputation: number;
  initialReputation: number;
}

export interface AdSlotReputation {
  adSlotId: string;
  score: number;
  lastUpdateTime: number;
  lastRecoveryTime: number;
}

export interface BlockRecord {
  id: string;
  adSlotId: string;
  reason: BlockReason;
  timestamp: number;
  windowRequestCount?: number;
  timestampDuplicateCount?: number;
  reputationScore?: number;
}

export interface AntiCheatCheckResult {
  passed: boolean;
  blocked: boolean;
  reason?: BlockReason;
  blockDetails?: {
    windowRequestCount?: number;
    timestampDuplicateCount?: number;
    reputationScore?: number;
  };
  reputationAdjustment?: number;
  applyDiscount?: boolean;
  discountRate?: number;
}

export interface GlobalAntiCheatStats {
  totalBlocked: number;
  byReason: Record<BlockReason, number>;
  lowReputationSlots: {
    adSlotId: string;
    reputation: number;
  }[];
  lowReputationSlotCount: number;
}

export interface TimeSlotAntiCheatStats {
  timeSlot: string;
  totalRequests: number;
  blockedCount: number;
  passedCount: number;
  blockRate: number;
  passRate: number;
}

export interface DateReportWithAntiCheat extends DateReport {
  antiCheatStats: {
    totalRequests: number;
    totalBlocked: number;
    totalPassed: number;
    overallBlockRate: number;
    overallPassRate: number;
    byReason: Record<BlockReason, number>;
    hourlyStats: TimeSlotAntiCheatStats[];
  };
}

export interface StressTestSlotConfig {
  adSlotId: string;
  frequencyPerSecond: number;
  reservePriceMin: number;
  reservePriceMax: number;
}

export interface StressTestScenario {
  id: string;
  name: string;
  durationSeconds: number;
  slots: StressTestSlotConfig[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateStressTestScenarioRequest {
  name: string;
  durationSeconds: number;
  slots: StressTestSlotConfig[];
}

export interface UpdateStressTestScenarioRequest {
  name?: string;
  durationSeconds?: number;
  slots?: StressTestSlotConfig[];
}

export type StressTestRunStatus = 'running' | 'completed' | 'aborted';

export interface StressTestRunProgress {
  scenarioId: string;
  scenarioName: string;
  status: StressTestRunStatus;
  elapsedSeconds: number;
  durationSeconds: number;
  totalRequestsSent: number;
  totalBlocked: number;
  totalPassed: number;
  startTime: number;
}

export interface StressTestRequestRecord {
  adSlotId: string;
  reservePrice: number;
  timestamp: number;
  blocked: boolean;
  blockReason?: BlockReason;
  winnerPlanId: string | null;
  actualCost: number;
}

export interface StressTestOverview {
  totalRequests: number;
  totalPassed: number;
  totalBlocked: number;
  blockRate: number;
  planSpends: {
    planId: string;
    planName: string;
    totalSpent: number;
    totalImpressions: number;
  }[];
}

export interface StressTestPlanAttribution {
  planId: string;
  planName: string;
  bySlot: {
    adSlotId: string;
    spent: number;
  }[];
  byTimeInterval: {
    intervalStart: number;
    intervalEnd: number;
    spent: number;
  }[];
}

export interface StressTestAntiCheatDimension {
  slotBlocks: {
    adSlotId: string;
    totalBlocked: number;
    byReason: Partial<Record<BlockReason, number>>;
  }[];
}

export interface StressTestReport {
  scenarioId: string;
  scenarioName: string;
  durationSeconds: number;
  runStartTime: number;
  runEndTime: number;
  status: StressTestRunStatus;
  overview: StressTestOverview;
  planAttribution: StressTestPlanAttribution[];
  antiCheatDimension: StressTestAntiCheatDimension;
}

export interface StressTestHistoryRecord {
  id: string;
  scenarioId: string;
  scenarioName: string;
  scenarioConfig: StressTestScenario;
  runStartTime: number;
  runEndTime: number;
  status: StressTestRunStatus;
  totalRequests: number;
  report: StressTestReport;
}
