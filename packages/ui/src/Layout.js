"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = exports.PageHeader = exports.Layout = void 0;
const react_1 = __importDefault(require("react"));
const Layout = ({ children, header, sidebar, footer, }) => {
    return (<div className="min-h-screen flex flex-col bg-gray-50">
      {header && (<header className="bg-white shadow-sm border-b border-gray-200">
          {header}
        </header>)}
      
      <div className="flex-1 flex">
        {sidebar && (<aside className="w-64 bg-white border-r border-gray-200 hidden lg:block">
            {sidebar}
          </aside>)}
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      
      {footer && (<footer className="bg-white border-t border-gray-200">
          {footer}
        </footer>)}
    </div>);
};
exports.Layout = Layout;
const PageHeader = ({ title, subtitle, actions, }) => {
    return (<div className="flex items-center justify-between py-4 px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (<p className="mt-1 text-sm text-gray-500">{subtitle}</p>)}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>);
};
exports.PageHeader = PageHeader;
const Container = ({ children, maxWidth = 'xl', className = '', }) => {
    const maxWidthStyles = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        full: 'max-w-full',
    };
    return (<div className={`mx-auto ${maxWidthStyles[maxWidth]} ${className}`}>
      {children}
    </div>);
};
exports.Container = Container;
//# sourceMappingURL=Layout.js.map