import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '@openconnect/ui';
export default function PinLoginPage() {
    const [pin, setPin] = useState('');
    const [facilityId, setFacilityId] = useState('');
    const [facilities, setFacilities] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { pinLogin } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        fetch('/api/admin/facilities')
            .then((res) => res.json())
            .then((data) => {
            if (data.success && data.data) {
                setFacilities(data.data);
                if (data.data.length > 0) {
                    setFacilityId(data.data[0].id);
                }
            }
        })
            .catch(() => {
            setFacilities([
                { id: 'demo-facility-1', name: 'Sing Sing Correctional Facility' },
                { id: 'demo-facility-2', name: 'Bedford Hills Correctional Facility' },
            ]);
            setFacilityId('demo-facility-1');
        });
    }, []);
    const handlePinInput = (digit) => {
        if (pin.length < 4) {
            setPin(pin + digit);
        }
    };
    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };
    const handleClear = () => {
        setPin('');
    };
    const handleSubmit = async () => {
        if (pin.length !== 4) {
            setError('Please enter a 4-digit PIN');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await pinLogin(pin, facilityId);
            navigate('/');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            setPin('');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Open Connect</h1>
          <p className="text-blue-200 mt-2">Enter your PIN to continue</p>
        </div>

        <Card padding="lg">
          {error && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>)}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Facility
            </label>
            <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              {facilities.map((facility) => (<option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>))}
            </select>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (<div key={i} className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${pin.length > i
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-gray-50'}`}>
                {pin.length > i ? '•' : ''}
              </div>))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (<button key={digit} onClick={() => handlePinInput(String(digit))} className="h-16 text-2xl font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                {digit}
              </button>))}
            <button onClick={handleClear} className="h-16 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Clear
            </button>
            <button onClick={() => handlePinInput('0')} className="h-16 text-2xl font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              0
            </button>
            <button onClick={handleBackspace} className="h-16 text-xl bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              ⌫
            </button>
          </div>

          <Button onClick={handleSubmit} fullWidth loading={loading} disabled={pin.length !== 4}>
            Login
          </Button>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              Family or Admin? Login here
            </Link>
          </div>
        </Card>
      </div>
    </div>);
}
//# sourceMappingURL=PinLoginPage.js.map