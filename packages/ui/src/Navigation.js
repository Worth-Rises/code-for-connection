"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tabs = exports.SidebarNav = exports.Navigation = void 0;
const react_1 = __importDefault(require("react"));
const Navigation = ({ items, logo, userMenu, }) => {
    return (<nav className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-8">
        {logo && <div className="flex-shrink-0">{logo}</div>}
        
        <ul className="flex items-center gap-1">
          {items.map((item) => (<li key={item.href}>
              <a href={item.href} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${item.active
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                {item.icon}
                {item.label}
              </a>
            </li>))}
        </ul>
      </div>
      
      {userMenu && <div>{userMenu}</div>}
    </nav>);
};
exports.Navigation = Navigation;
const SidebarNav = ({ items, title }) => {
    return (<nav className="p-4">
      {title && (<h2 className="px-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h2>)}
      <ul className="space-y-1">
        {items.map((item) => (<li key={item.href}>
            <a href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${item.active
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'}`}>
              {item.icon}
              {item.label}
            </a>
          </li>))}
      </ul>
    </nav>);
};
exports.SidebarNav = SidebarNav;
const Tabs = ({ tabs, activeTab, onTabChange }) => {
    return (<div className="border-b border-gray-200">
      <nav className="flex -mb-px">
        {tabs.map((tab) => (<button key={tab.id} onClick={() => onTabChange(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            {tab.label}
            {tab.count !== undefined && (<span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'}`}>
                {tab.count}
              </span>)}
          </button>))}
      </nav>
    </div>);
};
exports.Tabs = Tabs;
//# sourceMappingURL=Navigation.js.map