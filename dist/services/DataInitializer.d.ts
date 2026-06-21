import { PlanManager } from './PlanManager';
import { BidEngine } from './BidEngine';
import { ReportService } from './ReportService';
export declare class DataInitializer {
    private planManager;
    private bidEngine;
    private reportService;
    private planIds;
    constructor(planManager: PlanManager, bidEngine: BidEngine, reportService: ReportService);
    initialize(): void;
    private createPresetPlans;
    private generateHistoricalData;
    getPlanIds(): string[];
}
