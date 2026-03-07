"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = exports.Textarea = exports.Input = void 0;
const react_1 = __importDefault(require("react"));
exports.Input = react_1.default.forwardRef(({ label, error, helperText, fullWidth = false, className = '', ...props }, ref) => {
    const inputId = props.id || props.name;
    const widthClass = fullWidth ? 'w-full' : '';
    return (<div className={widthClass}>
        {label && (<label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>)}
        <input ref={ref} id={inputId} className={`
            block rounded-lg border px-4 py-2.5 text-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error
            ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `} {...props}/>
        {error && (<p className="mt-1 text-sm text-red-600">{error}</p>)}
        {helperText && !error && (<p className="mt-1 text-sm text-gray-500">{helperText}</p>)}
      </div>);
});
exports.Input.displayName = 'Input';
exports.Textarea = react_1.default.forwardRef(({ label, error, helperText, fullWidth = false, className = '', ...props }, ref) => {
    const textareaId = props.id || props.name;
    return (<div className={fullWidth ? 'w-full' : ''}>
        {label && (<label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>)}
        <textarea ref={ref} id={textareaId} className={`
            block rounded-lg border px-4 py-2.5 text-sm transition-colors resize-y
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error
            ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `} {...props}/>
        {error && (<p className="mt-1 text-sm text-red-600">{error}</p>)}
        {helperText && !error && (<p className="mt-1 text-sm text-gray-500">{helperText}</p>)}
      </div>);
});
exports.Textarea.displayName = 'Textarea';
exports.Select = react_1.default.forwardRef(({ label, error, options, placeholder, fullWidth = false, className = '', ...props }, ref) => {
    const selectId = props.id || props.name;
    return (<div className={fullWidth ? 'w-full' : ''}>
        {label && (<label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>)}
        <select ref={ref} id={selectId} className={`
            block rounded-lg border px-4 py-2.5 text-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error
            ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `} {...props}>
          {placeholder && (<option value="" disabled>
              {placeholder}
            </option>)}
          {options.map((option) => (<option key={option.value} value={option.value}>
              {option.label}
            </option>))}
        </select>
        {error && (<p className="mt-1 text-sm text-red-600">{error}</p>)}
      </div>);
});
exports.Select.displayName = 'Select';
//# sourceMappingURL=Input.js.map