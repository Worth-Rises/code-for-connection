"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MessagingAdmin;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const ui_1 = require("@openconnect/ui");
function MessagingDashboard() {
    return (<div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Message Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">0</p>
            <p className="text-sm text-gray-600">Pending Review</p>
          </div>
        </ui_1.Card>
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-600">Messages Today</p>
          </div>
        </ui_1.Card>
      </div>

      <ui_1.Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Messages Pending Review</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Messaging Guild will implement the review queue here.</p>
          <p className="text-sm mt-2">Features: Approve, block, flag messages</p>
        </div>
      </ui_1.Card>

      <ui_1.Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Message History</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Messaging Guild will implement the message history view here.</p>
          <p className="text-sm mt-2">Features: Search, filter, view conversations</p>
        </div>
      </ui_1.Card>
    </div>);
}
function MessagingAdmin() {
    return (<react_router_dom_1.Routes>
      <react_router_dom_1.Route index element={<MessagingDashboard />}/>
    </react_router_dom_1.Routes>);
}
//# sourceMappingURL=index.js.map