import { AntiCheatConfig, AdSlotReputation, BlockRecord, AntiCheatCheckResult, BlockReason, GlobalAntiCheatStats, BidRequest } from '../types';
export declare class AntiCheatService {
    private config;
    private requestWindows;
    private reputations;
    private blockRecords;
    private timestampGroups;
    private requestStatsByDateHour;
    private totalBlockedByReason;
    private globalTotalRequests;
    private globalTotalBlocked;
    private globalTotalPassed;
    constructor(initialConfig?: Partial<AntiCheatConfig>);
    getConfig(): AntiCheatConfig;
    updateConfig(newConfig: Partial<AntiCheatConfig>): AntiCheatConfig;
    checkRequest(request: BidRequest): AntiCheatCheckResult;
    private checkReputation;
    private checkTimestampDuplicate;
    private checkFrequency;
    private getOrCreateReputation;
    getAdjustedReputation(adSlotId: string, now: number): number;
    getReputation(adSlotId: string): AdSlotReputation;
    getAllReputations(): AdSlotReputation[];
    private applyReputationPenalty;
    private recordBlock;
    getBlockRecords(adSlotId?: string, limit?: number): BlockRecord[];
    getGlobalStats(): GlobalAntiCheatStats;
    private getDateHourKey;
    private recordHourlyStats;
    getHourlyStatsByDate(dateStr: string): {
        timeSlot: string;
        totalRequests: number;
        blockedCount: number;
        passedCount: number;
        blockRate: number;
        passRate: number;
        byReason: Record<BlockReason, number>;
    }[];
    getRequestCounters(): {
        total: number;
        blocked: number;
        passed: number;
    };
}
