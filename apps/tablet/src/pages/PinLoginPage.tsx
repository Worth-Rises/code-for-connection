import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@openconnect/ui';
import { useAuth } from '../context/AuthContext';

interface Facility {
  id: string;
  name: string;
}

export default function PinLoginPage() {
  const [pin, setPin] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { pinLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/admin/facilities')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setFacilities(data.data);
          setFacilityId(data.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isFormField = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

      if (isFormField && event.key !== 'Enter') {
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        setPin((prev) => (prev.length < 4 ? prev + event.key : prev));
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        setPin((prev) => prev.slice(0, -1));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        void handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, facilityId, loading]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) setPin(pin + digit);
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }
    if (!facilityId) {
      setError('Please select a facility');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await pinLogin(pin, facilityId);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPin('');
    } finally {
      setLoading(false);
    }
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

          {facilities.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facility
              </label>
              <select
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
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
              onClick={() => setPin('')}
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
              onClick={() => setPin(pin.slice(0, -1))}
              className="h-20 text-2xl bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              ⌫
            </button>
          </div>

          <Button
            onClick={handleSubmit}
            fullWidth
            size="lg"
            loading={loading}
            disabled={pin.length !== 4 || !facilityId}
          >
            Login
          </Button>
        </Card>
      </div>
    </div>
  );
}
