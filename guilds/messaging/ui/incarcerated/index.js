"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MessagingIncarcerated;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const ui_1 = require("@openconnect/ui");
function MessagingHome() {
    return (<div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      <ui_1.Card padding="lg">
        <div className="text-center py-8">
          <span className="text-6xl mb-4 block">💬</span>
          <h2 className="text-xl font-semibold mb-2">Messaging</h2>
          <p className="text-gray-600 mb-6">
            This is where the Messaging Guild will build the messaging interface.
          </p>
          <p className="text-sm text-gray-500">Features to implement:</p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>View conversations with approved contacts</li>
            <li>Send and receive messages</li>
            <li>Photo attachments</li>
            <li>Message status indicators</li>
            <li>Real-time notifications</li>
          </ul>
        </div>
      </ui_1.Card>
    </div>);
}
function MessagingIncarcerated() {
    return (<react_router_dom_1.Routes>
      <react_router_dom_1.Route index element={<MessagingHome />}/>
    </react_router_dom_1.Routes>);
}
//# sourceMappingURL=index.js.map