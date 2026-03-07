"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullPageLoader = exports.LoadingOverlay = exports.LoadingSpinner = void 0;
const react_1 = __importDefault(require("react"));
const LoadingSpinner = ({ size = 'md', color = 'primary', className = '', }) => {
    const sizeStyles = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };
    const colorStyles = {
        primary: 'text-blue-600',
        white: 'text-white',
        gray: 'text-gray-400',
    };
    return (<svg className={`animate-spin ${sizeStyles[size]} ${colorStyles[color]} ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>);
};
exports.LoadingSpinner = LoadingSpinner;
const LoadingOverlay = ({ message }) => {
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
        <exports.LoadingSpinner size="lg"/>
        {message && (<p className="text-gray-700 font-medium">{message}</p>)}
      </div>
    </div>);
};
exports.LoadingOverlay = LoadingOverlay;
const FullPageLoader = ({ message = 'Loading...' }) => {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <exports.LoadingSpinner size="lg"/>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>);
};
exports.FullPageLoader = FullPageLoader;
//# sourceMappingURL=LoadingSpinner.js.map