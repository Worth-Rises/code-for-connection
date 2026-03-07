"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VoiceAdmin;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const ui_1 = require("@openconnect/ui");
function VoiceDashboard() {
    return (<div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Voice Call Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-600">Active Calls</p>
          </div>
        </ui_1.Card>
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-600">Today's Calls</p>
          </div>
        </ui_1.Card>
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-600">0</p>
            <p className="text-sm text-gray-600">Avg Duration (min)</p>
          </div>
        </ui_1.Card>
      </div>

      <ui_1.Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Active Calls</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Voice Guild will implement the active calls table here.</p>
          <p className="text-sm mt-2">Features: Monitor calls, terminate calls, view details</p>
        </div>
      </ui_1.Card>

      <ui_1.Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">Call History</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Voice Guild will implement the call history table here.</p>
          <p className="text-sm mt-2">Features: Filter, search, export logs</p>
        </div>
      </ui_1.Card>
    </div>);
}
function VoiceAdmin() {
    return (<react_router_dom_1.Routes>
      <react_router_dom_1.Route index element={<VoiceDashboard />}/>
    </react_router_dom_1.Routes>);
}
//# sourceMappingURL=index.js.map