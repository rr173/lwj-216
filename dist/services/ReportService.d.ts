import { PlanManager } from './PlanManager';
import { BidEngine } from './BidEngine';
import { AntiCheatService } from './AntiCheatService';
import { PlanSpendDetail, PlanOverview, DateReport, DateReportWithAntiCheat } from '../types';
export declare class ReportService {
    private planManager;
    private bidEngine;
    private antiCheatService;
    private historicalData;
    constructor(planManager: PlanManager, bidEngine: BidEngine, antiCheatService?: AntiCheatService);
    getPlanSpendDetail(planId: string, timestamp: number): PlanSpendDetail | null;
    getAllPlansOverview(timestamp: number): PlanOverview[];
    getDateReport(date: string): DateReport;
    setHistoricalPlanData(date: string, planId: string, data: {
        totalSpent: number;
        totalImpressions: number;
        bidCount: number;
        winCount: number;
    }): void;
    getDateReportWithAntiCheat(date: string): DateReportWithAntiCheat;
}
