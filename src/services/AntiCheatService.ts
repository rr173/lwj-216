import { v4 as uuidv4 } from 'uuid';
import {
  AntiCheatConfig,
  AdSlotReputation,
  BlockRecord,
  AntiCheatCheckResult,
  BlockReason,
  GlobalAntiCheatStats,
  BidRequest,
} from '../types';

const DEFAULT_CONFIG: AntiCheatConfig = {
  windowSizeSeconds: 60,
  frequencyThreshold: 100,
  timestampDuplicateThreshold: 10,
  frequencyPenalty: 5,
  timestampPenalty: 20,
  reputationRecoveryPerHour: 2,
  reputationDiscountThreshold: 60,
  reputationRejectThreshold: 30,
  reputationDiscountRate: 0.8,
  maxReputation: 100,
  initialReputation: 100,
};

interface WindowEntry {
  timestamp: number;
  adSlotId: string;
  requestTimestamp: number;
}

export class AntiCheatService {
  private config: AntiCheatConfig;
  private requestWindows: Map<string, WindowEntry[]> = new Map();
  private reputations: Map<string, AdSlotReputation> = new Map();
  private blockRecords: BlockRecord[] = [];
  private timestampGroups: Map<string, Map<number, number>> = new Map();
  private requestStatsByDateHour: Map<string, {
    total: number;
    blocked: number;
    passed: number;
    byReason: Record<BlockReason, number>;
  }> = new Map();
  private totalBlockedByReason: Record<BlockReason, number> = {
    frequency_exceeded: 0,
    timestamp_duplicate: 0,
    reputation_too_low: 0,
  };
  private globalTotalRequests = 0;
  private globalTotalBlocked = 0;
  private globalTotalPassed = 0;

  constructor(initialConfig?: Partial<AntiCheatConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }

  getConfig(): AntiCheatConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AntiCheatConfig>): AntiCheatConfig {
    this.config = { ...this.config, ...newConfig };
    return { ...this.config };
  }

  checkRequest(request: BidRequest): AntiCheatCheckResult {
    const { adSlotId, timestamp } = request;
    const now = Date.now();

    this.globalTotalRequests++;
    this.recordHourlyStats(timestamp, 'request');

    const reputationCheck = this.checkReputation(adSlotId, now);
    if (reputationCheck.blocked) {
      this.recordBlock(adSlotId, 'reputation_too_low', now, {
        reputationScore: reputationCheck.blockDetails?.reputationScore,
      });
      this.recordHourlyStats(timestamp, 'block', 'reputation_too_low');
      return reputationCheck;
    }

    const timestampCheck = this.checkTimestampDuplicate(adSlotId, timestamp, now);
    if (timestampCheck.blocked) {
      this.applyReputationPenalty(adSlotId, this.config.timestampPenalty, now);
      this.recordBlock(adSlotId, 'timestamp_duplicate', now, {
        timestampDuplicateCount: timestampCheck.blockDetails?.timestampDuplicateCount,
      });
      this.recordHourlyStats(timestamp, 'block', 'timestamp_duplicate');
      return {
        ...timestampCheck,
        reputationAdjustment: -this.config.timestampPenalty,
      };
    }

    const frequencyCheck = this.checkFrequency(adSlotId, timestamp, now);
    if (frequencyCheck.blocked) {
      this.applyReputationPenalty(adSlotId, this.config.frequencyPenalty, now);
      this.recordBlock(adSlotId, 'frequency_exceeded', now, {
        windowRequestCount: frequencyCheck.blockDetails?.windowRequestCount,
      });
      this.recordHourlyStats(timestamp, 'block', 'frequency_exceeded');
      return {
        ...frequencyCheck,
        reputationAdjustment: -this.config.frequencyPenalty,
      };
    }

    this.globalTotalPassed++;
    this.recordHourlyStats(timestamp, 'pass');

    return {
      passed: true,
      blocked: false,
      applyDiscount: reputationCheck.applyDiscount,
      discountRate: reputationCheck.discountRate,
    };
  }

  private checkReputation(adSlotId: string, now: number): AntiCheatCheckResult {
    const reputation = this.getOrCreateReputation(adSlotId, now);
    const currentScore = this.getAdjustedReputation(adSlotId, now);

    if (currentScore < this.config.reputationRejectThreshold) {
      return {
        passed: false,
        blocked: true,
        reason: 'reputation_too_low',
        blockDetails: { reputationScore: currentScore },
      };
    }

    if (currentScore < this.config.reputationDiscountThreshold) {
      return {
        passed: true,
        blocked: false,
        applyDiscount: true,
        discountRate: this.config.reputationDiscountRate,
        blockDetails: { reputationScore: currentScore },
      };
    }

    return {
      passed: true,
      blocked: false,
      blockDetails: { reputationScore: currentScore },
    };
  }

  private checkTimestampDuplicate(adSlotId: string, requestTimestamp: number, now: number): AntiCheatCheckResult {
    if (!this.timestampGroups.has(adSlotId)) {
      this.timestampGroups.set(adSlotId, new Map());
    }

    const group = this.timestampGroups.get(adSlotId)!;
    const flooredTs = Math.floor(requestTimestamp / 1000) * 1000;
    const currentCount = (group.get(flooredTs) || 0) + 1;
    group.set(flooredTs, currentCount);

    const cutoffMs = now - (this.config.windowSizeSeconds * 1000);
    for (const ts of group.keys()) {
      if (ts < cutoffMs) {
        group.delete(ts);
      }
    }

    if (currentCount > this.config.timestampDuplicateThreshold) {
      return {
        passed: false,
        blocked: true,
        reason: 'timestamp_duplicate',
        blockDetails: { timestampDuplicateCount: currentCount },
      };
    }

    return { passed: true, blocked: false };
  }

  private checkFrequency(adSlotId: string, requestTimestamp: number, now: number): AntiCheatCheckResult {
    const windowMs = this.config.windowSizeSeconds * 1000;

    if (!this.requestWindows.has(adSlotId)) {
      this.requestWindows.set(adSlotId, []);
    }

    const window = this.requestWindows.get(adSlotId)!;
    const cutoffTime = now - windowMs;

    const filtered = window.filter(entry => entry.timestamp >= cutoffTime);
    filtered.push({ timestamp: now, adSlotId, requestTimestamp });
    this.requestWindows.set(adSlotId, filtered);

    const currentCount = filtered.length;

    if (currentCount > this.config.frequencyThreshold) {
      return {
        passed: false,
        blocked: true,
        reason: 'frequency_exceeded',
        blockDetails: { windowRequestCount: currentCount },
      };
    }

    return { passed: true, blocked: false };
  }

  private getOrCreateReputation(adSlotId: string, now: number): AdSlotReputation {
    if (!this.reputations.has(adSlotId)) {
      this.reputations.set(adSlotId, {
        adSlotId,
        score: this.config.initialReputation,
        lastUpdateTime: now,
        lastRecoveryTime: now,
      });
    }
    return this.reputations.get(adSlotId)!;
  }

  getAdjustedReputation(adSlotId: string, now: number): number {
    const reputation = this.getOrCreateReputation(adSlotId, now);
    const hoursSinceRecovery = (now - reputation.lastRecoveryTime) / (1000 * 60 * 60);

    if (hoursSinceRecovery >= 1) {
      const fullHours = Math.floor(hoursSinceRecovery);
      const recoveryAmount = fullHours * this.config.reputationRecoveryPerHour;
      reputation.score = Math.min(this.config.maxReputation, reputation.score + recoveryAmount);
      reputation.lastRecoveryTime = reputation.lastRecoveryTime + fullHours * 60 * 60 * 1000;
      reputation.lastUpdateTime = now;
    }

    return reputation.score;
  }

  getReputation(adSlotId: string): AdSlotReputation {
    const now = Date.now();
    const score = this.getAdjustedReputation(adSlotId, now);
    const rep = this.reputations.get(adSlotId)!;
    return { ...rep, score };
  }

  getAllReputations(): AdSlotReputation[] {
    const now = Date.now();
    const result: AdSlotReputation[] = [];
    for (const adSlotId of this.reputations.keys()) {
      result.push(this.getReputation(adSlotId));
    }
    return result;
  }

  private applyReputationPenalty(adSlotId: string, penalty: number, now: number): void {
    const reputation = this.getOrCreateReputation(adSlotId, now);
    reputation.score = Math.max(0, reputation.score - penalty);
    reputation.lastUpdateTime = now;
  }

  private recordBlock(
    adSlotId: string,
    reason: BlockReason,
    timestamp: number,
    details: Partial<Pick<BlockRecord, 'windowRequestCount' | 'timestampDuplicateCount' | 'reputationScore'>>
  ): void {
    const record: BlockRecord = {
      id: uuidv4(),
      adSlotId,
      reason,
      timestamp,
      ...details,
    };
    this.blockRecords.push(record);
    this.totalBlockedByReason[reason]++;
    this.globalTotalBlocked++;
  }

  getBlockRecords(adSlotId?: string, limit: number = 100): BlockRecord[] {
    let records = this.blockRecords;
    if (adSlotId) {
      records = records.filter(r => r.adSlotId === adSlotId);
    }
    return records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getGlobalStats(): GlobalAntiCheatStats {
    const now = Date.now();
    const lowReputationSlots = this.getAllReputations()
      .filter(r => r.score < this.config.reputationDiscountThreshold)
      .map(r => ({ adSlotId: r.adSlotId, reputation: r.score }))
      .sort((a, b) => a.reputation - b.reputation);

    return {
      totalBlocked: this.globalTotalBlocked,
      byReason: { ...this.totalBlockedByReason },
      lowReputationSlots,
      lowReputationSlotCount: lowReputationSlots.length,
    };
  }

  private getDateHourKey(timestamp: number): string {
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:00`;
  }

  private recordHourlyStats(timestamp: number, type: 'request' | 'block' | 'pass', reason?: BlockReason): void {
    const key = this.getDateHourKey(timestamp);
    if (!this.requestStatsByDateHour.has(key)) {
      this.requestStatsByDateHour.set(key, {
        total: 0,
        blocked: 0,
        passed: 0,
        byReason: {
          frequency_exceeded: 0,
          timestamp_duplicate: 0,
          reputation_too_low: 0,
        },
      });
    }
    const stats = this.requestStatsByDateHour.get(key)!;
    if (type === 'request') stats.total++;
    if (type === 'block') {
      stats.blocked++;
      if (reason) stats.byReason[reason]++;
    }
    if (type === 'pass') stats.passed++;
  }

  getHourlyStatsByDate(dateStr: string): {
    timeSlot: string;
    totalRequests: number;
    blockedCount: number;
    passedCount: number;
    blockRate: number;
    passRate: number;
    byReason: Record<BlockReason, number>;
  }[] {
    const result: {
      timeSlot: string;
      totalRequests: number;
      blockedCount: number;
      passedCount: number;
      blockRate: number;
      passRate: number;
      byReason: Record<BlockReason, number>;
    }[] = [];

    for (let h = 0; h < 24; h++) {
      const hStr = String(h).padStart(2, '0');
      const key = `${dateStr} ${hStr}:00`;
      const stats = this.requestStatsByDateHour.get(key) || {
        total: 0,
        blocked: 0,
        passed: 0,
        byReason: { frequency_exceeded: 0, timestamp_duplicate: 0, reputation_too_low: 0 },
      };
      result.push({
        timeSlot: `${hStr}:00`,
        totalRequests: stats.total,
        blockedCount: stats.blocked,
        passedCount: stats.passed,
        blockRate: stats.total > 0 ? stats.blocked / stats.total : 0,
        passRate: stats.total > 0 ? stats.passed / stats.total : 0,
        byReason: { ...stats.byReason },
      });
    }

    return result;
  }

  getRequestCounters(): { total: number; blocked: number; passed: number } {
    return {
      total: this.globalTotalRequests,
      blocked: this.globalTotalBlocked,
      passed: this.globalTotalPassed,
    };
  }
}
