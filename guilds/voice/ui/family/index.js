"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VoiceFamily;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const ui_1 = require("@openconnect/ui");
function VoiceHome() {
    return (<div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Voice Calls</h1>
      <ui_1.Card padding="lg">
        <div className="text-center py-8">
          <span className="text-6xl mb-4 block">📞</span>
          <h2 className="text-xl font-semibold mb-2">Incoming Calls</h2>
          <p className="text-gray-600 mb-6">
            This is where the Voice Guild will build the family call receiving interface.
          </p>
          <p className="text-sm text-gray-500">
            Features to implement:
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>Receive incoming calls</li>
            <li>Accept/decline call prompts</li>
            <li>In-call controls</li>
            <li>Call history</li>
          </ul>
        </div>
      </ui_1.Card>
    </div>);
}
function VoiceFamily() {
    return (<react_router_dom_1.Routes>
      <react_router_dom_1.Route index element={<VoiceHome />}/>
    </react_router_dom_1.Routes>);
}
//# sourceMappingURL=index.js.map