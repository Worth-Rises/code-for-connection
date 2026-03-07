"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_js_1 = require("./routes/auth.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const admin_1 = require("@openconnect/admin");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_js_1.authRouter);
app.use('/api/admin', admin_1.adminRouter);
// Guild route mounting (teams will implement these)
// app.use('/api/voice', voiceRouter);
// app.use('/api/video', videoRouter);
// app.use('/api/messaging', messagingRouter);
app.use(errorHandler_js_1.notFoundHandler);
app.use(errorHandler_js_1.errorHandler);
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=index.js.map