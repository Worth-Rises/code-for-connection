import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '@openconnect/ui';
export default function RegisterPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await register({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
            });
            navigate('/');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Open Connect</h1>
          <p className="text-gray-600 mt-2">Create a Family Account</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>)}

            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" required/>
              <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" required/>
            </div>

            <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" fullWidth required/>

            <Input label="Phone Number" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" fullWidth required/>

            <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" fullWidth required/>

            <Input label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" fullWidth required/>

            <Button type="submit" fullWidth loading={loading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>);
}
//# sourceMappingURL=RegisterPage.js.map