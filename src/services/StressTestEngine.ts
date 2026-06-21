import { v4 as uuidv4 } from 'uuid';
import { BidEngine } from './BidEngine';
import { AntiCheatService } from './AntiCheatService';
import { PlanManager } from './PlanManager';
import {
  StressTestSlotConfig,
  StressTestScenario,
  CreateStressTestScenarioRequest,
  UpdateStressTestScenarioRequest,
  StressTestRunStatus,
  StressTestRunProgress,
  StressTestRequestRecord,
  StressTestReport,
  StressTestOverview,
  StressTestPlanAttribution,
  StressTestAntiCheatDimension,
  StressTestHistoryRecord,
  BidRequest,
  BlockReason,
} from '../types';
import { roundToCents } from '../utils';

const MAX_SCENARIOS = 5;
const MAX_HISTORY = 10;
const MAX_DURATION_SECONDS = 300;
const MAX_SLOTS = 20;
const MAX_FREQUENCY = 50;
const TIME_INTERVAL_SECONDS = 30;

export class StressTestEngine {
  private scenarios: Map<string, StressTestScenario> = new Map();
  private history: StressTestHistoryRecord[] = [];

  private currentRun: {
    scenarioId: string;
    scenarioName: string;
    durationSeconds: number;
    status: StressTestRunStatus;
    startTime: number;
    endTime: number | null;
    totalRequestsSent: number;
    totalBlocked: number;
    totalPassed: number;
    requestRecords: StressTestRequestRecord[];
    timers: NodeJS.Timeout[];
  } | null = null;

  private bidEngine: BidEngine;
  private antiCheatService: AntiCheatService;
  private planManager: PlanManager;

  constructor(bidEngine: BidEngine, antiCheatService: AntiCheatService, planManager: PlanManager) {
    this.bidEngine = bidEngine;
    this.antiCheatService = antiCheatService;
    this.planManager = planManager;
  }

  createScenario(request: CreateStressTestScenarioRequest): StressTestScenario {
    this.validateScenarioRequest(request);

    if (this.scenarios.size >= MAX_SCENARIOS) {
      throw new Error(`最多只能保存 ${MAX_SCENARIOS} 个场景`);
    }

    const now = Date.now();
    const scenario: StressTestScenario = {
      id: uuidv4(),
      name: request.name,
      durationSeconds: request.durationSeconds,
      slots: request.slots,
      createdAt: now,
      updatedAt: now,
    };

    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  updateScenario(scenarioId: string, request: UpdateStressTestScenarioRequest): StressTestScenario {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error('场景不存在');
    }

    if (this.isRunning() && this.currentRun!.scenarioId === scenarioId) {
      throw new Error('正在运行的场景不允许编辑');
    }

    const merged: CreateStressTestScenarioRequest = {
      name: request.name ?? scenario.name,
      durationSeconds: request.durationSeconds ?? scenario.durationSeconds,
      slots: request.slots ?? scenario.slots,
    };

    this.validateScenarioRequest(merged);

    scenario.name = merged.name;
    scenario.durationSeconds = merged.durationSeconds;
    scenario.slots = merged.slots;
    scenario.updatedAt = Date.now();

    return scenario;
  }

  deleteScenario(scenarioId: string): void {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error('场景不存在');
    }

    if (this.isRunning() && this.currentRun!.scenarioId === scenarioId) {
      throw new Error('正在运行的场景不允许删除');
    }

    this.scenarios.delete(scenarioId);
  }

  getScenario(scenarioId: string): StressTestScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  getAllScenarios(): StressTestScenario[] {
    return Array.from(this.scenarios.values());
  }

  isRunning(): boolean {
    return this.currentRun !== null && this.currentRun.status === 'running';
  }

  runScenario(scenarioId: string): StressTestRunProgress {
    if (this.isRunning()) {
      throw new Error('已有场景正在运行，同一时间只能运行一个场景');
    }

    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error('场景不存在');
    }

    const now = Date.now();
    this.currentRun = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      durationSeconds: scenario.durationSeconds,
      status: 'running',
      startTime: now,
      endTime: null,
      totalRequestsSent: 0,
      totalBlocked: 0,
      totalPassed: 0,
      requestRecords: [],
      timers: [],
    };

    this.startRequestGeneration(scenario);

    const completionTimer = setTimeout(() => {
      this.completeRun();
    }, scenario.durationSeconds * 1000);

    this.currentRun.timers.push(completionTimer);

    return this.buildProgressFromCurrentRun();
  }

  abortRun(): StressTestRunProgress {
    if (!this.isRunning()) {
      throw new Error('当前没有正在运行的场景');
    }

    this.currentRun!.status = 'aborted';
    this.currentRun!.endTime = Date.now();

    const progress = this.buildProgressFromCurrentRun();

    this.finalizeRun();
    return progress;
  }

  getProgress(): StressTestRunProgress | null {
    if (!this.currentRun) {
      return null;
    }

    return this.buildProgressFromCurrentRun();
  }

  private buildProgressFromCurrentRun(): StressTestRunProgress {
    const elapsed = this.currentRun!.endTime
      ? Math.round((this.currentRun!.endTime - this.currentRun!.startTime) / 1000)
      : Math.round((Date.now() - this.currentRun!.startTime) / 1000);

    return {
      scenarioId: this.currentRun!.scenarioId,
      scenarioName: this.currentRun!.scenarioName,
      status: this.currentRun!.status,
      elapsedSeconds: elapsed,
      durationSeconds: this.currentRun!.durationSeconds,
      totalRequestsSent: this.currentRun!.totalRequestsSent,
      totalBlocked: this.currentRun!.totalBlocked,
      totalPassed: this.currentRun!.totalPassed,
      startTime: this.currentRun!.startTime,
    };
  }

  getHistoryList(): { id: string; scenarioName: string; runStartTime: number; status: StressTestRunStatus; totalRequests: number }[] {
    return this.history.map(h => ({
      id: h.id,
      scenarioName: h.scenarioName,
      runStartTime: h.runStartTime,
      status: h.status,
      totalRequests: h.totalRequests,
    }));
  }

  getHistoryReport(historyId: string): StressTestHistoryRecord | undefined {
    return this.history.find(h => h.id === historyId);
  }

  private startRequestGeneration(scenario: StressTestScenario): void {
    for (const slot of scenario.slots) {
      const intervalMs = Math.max(1, Math.round(1000 / slot.frequencyPerSecond));
      const timer = setInterval(() => {
        if (!this.isRunning()) return;
        this.generateAndProcessRequest(slot);
      }, intervalMs);

      this.currentRun!.timers.push(timer);
    }
  }

  private generateAndProcessRequest(slot: StressTestSlotConfig): void {
    const now = Date.now();
    const reservePrice = roundToCents(
      slot.reservePriceMin + Math.random() * (slot.reservePriceMax - slot.reservePriceMin)
    );

    const bidRequest: BidRequest = {
      adSlotId: slot.adSlotId,
      reservePrice,
      timestamp: now,
    };

    const antiCheatResult = this.antiCheatService.checkRequest(bidRequest);

    const record: StressTestRequestRecord = {
      adSlotId: slot.adSlotId,
      reservePrice,
      timestamp: now,
      blocked: false,
      winnerPlanId: null,
      actualCost: 0,
    };

    this.currentRun!.totalRequestsSent++;

    if (antiCheatResult.blocked) {
      record.blocked = true;
      record.blockReason = antiCheatResult.reason;
      this.currentRun!.totalBlocked++;
    } else {
      this.currentRun!.totalPassed++;
      const bidOptions: { discountRate?: number } = {};
      if (antiCheatResult.applyDiscount && antiCheatResult.discountRate) {
        bidOptions.discountRate = antiCheatResult.discountRate;
      }
      const bidResult = this.bidEngine.processBidRequest(bidRequest, bidOptions);
      record.winnerPlanId = bidResult.winnerPlanId;
      record.actualCost = bidResult.actualCost;
    }

    this.currentRun!.requestRecords.push(record);
  }

  private completeRun(): void {
    if (!this.currentRun || this.currentRun.status !== 'running') return;
    this.currentRun.status = 'completed';
    this.currentRun.endTime = Date.now();
    this.finalizeRun();
  }

  private finalizeRun(): void {
    if (!this.currentRun) return;

    for (const timer of this.currentRun.timers) {
      clearInterval(timer);
    }
    this.currentRun.timers = [];
    if (!this.currentRun.endTime) {
      this.currentRun.endTime = Date.now();
    }

    const report = this.generateReport();

    const scenario = this.scenarios.get(this.currentRun.scenarioId);

    const historyRecord: StressTestHistoryRecord = {
      id: uuidv4(),
      scenarioId: this.currentRun.scenarioId,
      scenarioName: this.currentRun.scenarioName,
      scenarioConfig: scenario
        ? { ...scenario }
        : {
            id: this.currentRun.scenarioId,
            name: this.currentRun.scenarioName,
            durationSeconds: this.currentRun.durationSeconds,
            slots: [],
            createdAt: 0,
            updatedAt: 0,
          },
      runStartTime: this.currentRun.startTime,
      runEndTime: this.currentRun.endTime,
      status: this.currentRun.status,
      totalRequests: this.currentRun.totalRequestsSent,
      report,
    };

    this.history.push(historyRecord);

    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    this.currentRun = null;
  }

  private generateReport(): StressTestReport {
    const records = this.currentRun!.requestRecords;
    const run = this.currentRun!;

    const overview = this.buildOverview(records);
    const planAttribution = this.buildPlanAttribution(records);
    const antiCheatDimension = this.buildAntiCheatDimension(records);

    return {
      scenarioId: run.scenarioId,
      scenarioName: run.scenarioName,
      durationSeconds: run.durationSeconds,
      runStartTime: run.startTime,
      runEndTime: run.endTime!,
      status: run.status,
      overview,
      planAttribution,
      antiCheatDimension,
    };
  }

  private buildOverview(records: StressTestRequestRecord[]): StressTestOverview {
    const totalRequests = records.length;
    const totalBlocked = records.filter(r => r.blocked).length;
    const totalPassed = totalRequests - totalBlocked;
    const blockRate = totalRequests > 0 ? roundToCents((totalBlocked / totalRequests) * 100) / 100 : 0;

    const planSpendMap = new Map<string, { planName: string; totalSpent: number; totalImpressions: number }>();

    for (const record of records) {
      if (record.winnerPlanId && record.actualCost > 0) {
        const existing = planSpendMap.get(record.winnerPlanId);
        if (existing) {
          existing.totalSpent = roundToCents(existing.totalSpent + record.actualCost);
          existing.totalImpressions++;
        } else {
          const plan = this.planManager.getPlan(record.winnerPlanId);
          planSpendMap.set(record.winnerPlanId, {
            planName: plan ? plan.name : record.winnerPlanId,
            totalSpent: roundToCents(record.actualCost),
            totalImpressions: 1,
          });
        }
      }
    }

    const planSpends = Array.from(planSpendMap.entries()).map(([planId, data]) => ({
      planId,
      planName: data.planName,
      totalSpent: data.totalSpent,
      totalImpressions: data.totalImpressions,
    }));

    return {
      totalRequests,
      totalPassed,
      totalBlocked,
      blockRate,
      planSpends,
    };
  }

  private buildPlanAttribution(records: StressTestRequestRecord[]): StressTestPlanAttribution[] {
    const planMap = new Map<string, {
      planName: string;
      slotSpends: Map<string, number>;
      intervalSpends: Map<number, number>;
    }>();

    for (const record of records) {
      if (!record.winnerPlanId || record.actualCost <= 0) continue;

      if (!planMap.has(record.winnerPlanId)) {
        const plan = this.planManager.getPlan(record.winnerPlanId);
        planMap.set(record.winnerPlanId, {
          planName: plan ? plan.name : record.winnerPlanId,
          slotSpends: new Map(),
          intervalSpends: new Map(),
        });
      }

      const entry = planMap.get(record.winnerPlanId)!;

      const currentSlot = entry.slotSpends.get(record.adSlotId) ?? 0;
      entry.slotSpends.set(record.adSlotId, roundToCents(currentSlot + record.actualCost));

      const intervalIndex = Math.floor((record.timestamp - this.currentRun!.startTime) / (TIME_INTERVAL_SECONDS * 1000));
      const currentInterval = entry.intervalSpends.get(intervalIndex) ?? 0;
      entry.intervalSpends.set(intervalIndex, roundToCents(currentInterval + record.actualCost));
    }

    return Array.from(planMap.entries()).map(([planId, data]) => ({
      planId,
      planName: data.planName,
      bySlot: Array.from(data.slotSpends.entries()).map(([adSlotId, spent]) => ({
        adSlotId,
        spent,
      })),
      byTimeInterval: Array.from(data.intervalSpends.entries())
        .map(([intervalIndex, spent]) => ({
          intervalStart: this.currentRun!.startTime + intervalIndex * TIME_INTERVAL_SECONDS * 1000,
          intervalEnd: this.currentRun!.startTime + (intervalIndex + 1) * TIME_INTERVAL_SECONDS * 1000,
          spent,
        }))
        .sort((a, b) => a.intervalStart - b.intervalStart),
    }));
  }

  private buildAntiCheatDimension(records: StressTestRequestRecord[]): StressTestAntiCheatDimension {
    const slotMap = new Map<string, { totalBlocked: number; byReason: Partial<Record<BlockReason, number>> }>();

    for (const record of records) {
      if (!record.blocked) continue;

      if (!slotMap.has(record.adSlotId)) {
        slotMap.set(record.adSlotId, { totalBlocked: 0, byReason: {} });
      }

      const entry = slotMap.get(record.adSlotId)!;
      entry.totalBlocked++;

      if (record.blockReason) {
        entry.byReason[record.blockReason] = (entry.byReason[record.blockReason] ?? 0) + 1;
      }
    }

    return {
      slotBlocks: Array.from(slotMap.entries()).map(([adSlotId, data]) => ({
        adSlotId,
        totalBlocked: data.totalBlocked,
        byReason: { ...data.byReason },
      })),
    };
  }

  private validateScenarioRequest(request: CreateStressTestScenarioRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('场景名称不能为空');
    }

    if (request.durationSeconds < 1 || request.durationSeconds > MAX_DURATION_SECONDS) {
      throw new Error(`持续时长必须在 1-${MAX_DURATION_SECONDS} 秒之间`);
    }

    if (!request.slots || request.slots.length < 1 || request.slots.length > MAX_SLOTS) {
      throw new Error(`广告位数量必须在 1-${MAX_SLOTS} 个之间`);
    }

    for (const slot of request.slots) {
      if (!slot.adSlotId || slot.adSlotId.trim().length === 0) {
        throw new Error('广告位ID不能为空');
      }
      if (slot.frequencyPerSecond < 1 || slot.frequencyPerSecond > MAX_FREQUENCY) {
        throw new Error(`广告位请求频率必须在 1-${MAX_FREQUENCY} 次/秒之间`);
      }
      if (slot.reservePriceMin < 0) {
        throw new Error('底价最小值不能为负数');
      }
      if (slot.reservePriceMax < slot.reservePriceMin) {
        throw new Error('底价最大值不能小于最小值');
      }
    }
  }
}
