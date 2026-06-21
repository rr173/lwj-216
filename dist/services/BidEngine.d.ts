import { PlanManager } from './PlanManager';
import { BidRequest, BidResult, SpendRecord } from '../types';
export declare class BidEngine {
    private planManager;
    private spendRecords;
    constructor(planManager: PlanManager);
    processBidRequest(request: BidRequest, options?: {
        discountRate?: number;
    }): BidResult;
    private canAfford;
    private calculateBidPrice;
    private addSpendRecord;
    getSpendRecordsByPlanAndDate(planId: string, date: string): SpendRecord[];
    getSpendRecordsByDate(date: string): SpendRecord[];
    addHistoricalSpendRecord(record: SpendRecord): void;
}
