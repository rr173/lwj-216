import { Router } from 'express';
import { PlanController } from '../controllers/PlanController';
import { BidController } from '../controllers/BidController';
import { ReportController } from '../controllers/ReportController';
import { AntiCheatController } from '../controllers/AntiCheatController';
export declare function createRouter(planController: PlanController, bidController: BidController, reportController: ReportController, antiCheatController?: AntiCheatController): Router;
