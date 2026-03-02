import React, { useState } from 'react';
import { Button, Card } from '@openconnect/ui';

export default function PinLoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => setPin(pin.slice(0, -1));
  const handleClear = () => setPin('');

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }
    setError('');
    console.log('Logging in with PIN:', pin);
  };

  return (
    <div className="h-full bg-blue-900 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Open Connect</h1>
          <p className="text-blue-200 mt-2 text-lg">Enter your PIN</p>
        </div>

        <Card padding="lg">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-3xl font-bold ${
                  pin.length > i
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                {pin.length > i ? '●' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                onClick={() => handlePinInput(String(digit))}
                className="h-20 text-3xl font-bold bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-20 text-lg font-medium bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              Clear
            </button>
            <button
              onClick={() => handlePinInput('0')}
              className="h-20 text-3xl font-bold bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-20 text-2xl bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              ⌫
            </button>
          </div>

          <Button onClick={handleSubmit} fullWidth size="lg" disabled={pin.length !== 4}>
            Login
          </Button>
        </Card>
      </div>
    </div>
  );
}
