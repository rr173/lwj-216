import { PlanManager } from './PlanManager';
import { BidEngine } from './BidEngine';
import { PlanSpendDetail, PlanOverview, DateReport } from '../types';
export declare class ReportService {
    private planManager;
    private bidEngine;
    private historicalData;
    constructor(planManager: PlanManager, bidEngine: BidEngine);
    getPlanSpendDetail(planId: string, timestamp: number): PlanSpendDetail | null;
    getAllPlansOverview(timestamp: number): PlanOverview[];
    getDateReport(date: string): DateReport;
    setHistoricalPlanData(date: string, planId: string, data: {
        totalSpent: number;
        totalImpressions: number;
        bidCount: number;
        winCount: number;
    }): void;
}
