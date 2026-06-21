"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidController = void 0;
class BidController {
    constructor(bidEngine) {
        this.processBid = (req, res) => {
            try {
                const request = req.body;
                if (!request.adSlotId || request.reservePrice === undefined || !request.timestamp) {
                    res.status(400).json({
                        success: false,
                        error: '缺少必要参数: adSlotId, reservePrice, timestamp',
                    });
                    return;
                }
                const result = this.bidEngine.processBidRequest(request);
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : '竞价处理失败',
                });
            }
        };
        this.bidEngine = bidEngine;
    }
}
exports.BidController = BidController;
//# sourceMappingURL=BidController.js.map