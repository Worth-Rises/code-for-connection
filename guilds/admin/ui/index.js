"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboard;
const react_1 = __importDefault(require("react"));
const ui_1 = require("@openconnect/ui");
function AdminDashboard() {
    return (<div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to the Open Connect Admin Portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-600">Active Voice Calls</p>
          </div>
        </ui_1.Card>
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-600">Active Video Calls</p>
          </div>
        </ui_1.Card>
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">0</p>
            <p className="text-sm text-gray-600">Pending Messages</p>
          </div>
        </ui_1.Card>
        <ui_1.Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">0</p>
            <p className="text-sm text-gray-600">Video Requests</p>
          </div>
        </ui_1.Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ui_1.Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <p>Admin Guild will implement the activity feed here.</p>
            <p className="text-sm mt-2">Shows recent calls, messages, and events.</p>
          </div>
        </ui_1.Card>

        <ui_1.Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <p className="font-medium">Manage Contacts</p>
              <p className="text-sm text-gray-500">Review and approve contact requests</p>
            </button>
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <p className="font-medium">View Reports</p>
              <p className="text-sm text-gray-500">Generate communication reports</p>
            </button>
            <button className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <p className="font-medium">Manage Blocked Numbers</p>
              <p className="text-sm text-gray-500">View and modify blocked phone numbers</p>
            </button>
          </div>
        </ui_1.Card>
      </div>

      <ui_1.Card padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Database: Connected</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Signaling Server: Online</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">API Gateway: Running</span>
          </div>
        </div>
      </ui_1.Card>
    </div>);
}
//# sourceMappingURL=index.js.map