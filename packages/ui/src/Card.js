"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardFooter = exports.CardContent = exports.CardHeader = exports.Card = void 0;
const react_1 = __importDefault(require("react"));
const Card = ({ children, className = '', padding = 'md', }) => {
    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };
    return (<div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>);
};
exports.Card = Card;
const CardHeader = ({ title, subtitle, action, }) => {
    return (<div className="flex items-center justify-between pb-4 border-b border-gray-200">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && (<p className="mt-1 text-sm text-gray-500">{subtitle}</p>)}
      </div>
      {action && <div>{action}</div>}
    </div>);
};
exports.CardHeader = CardHeader;
const CardContent = ({ children, className = '', }) => {
    return <div className={`pt-4 ${className}`}>{children}</div>;
};
exports.CardContent = CardContent;
const CardFooter = ({ children, className = '', }) => {
    return (<div className={`pt-4 mt-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>);
};
exports.CardFooter = CardFooter;
//# sourceMappingURL=Card.js.map