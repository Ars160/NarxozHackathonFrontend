import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const Login = () => {
  const [sId, setSId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sId, password })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
      } else {
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('role', data.user.role);
          if (data.user.role === 'admin') navigate('/create-exam');
          else if (['admin-sdt', 'admin-sem', 'admin-gum', 'admin-spigu'].includes(data.user.role)) navigate('/manage-subject-list');
          else navigate('/');
        } else {
          setError('Неверный ответ от сервера');
        }
      }
    } catch (err) {
      setError('Ошибка при входе');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-4">
          <img
            src="/Logo.png"
            alt="UniSchedule"
            className="w-52 h-52 object-contain mx-auto"
          />
        </div>

        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-[#C8102E]" />
          <CardContent className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Вход в систему</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">S-ID</label>
                <div className="flex items-center h-11 rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-[#C8102E] focus-within:border-[#C8102E] transition-all">
                  <span className="pl-3 pr-2 flex items-center shrink-0">
                    <User size={18} className="text-[#C8102E]" />
                  </span>
                  <input
                    type="text"
                    placeholder="Введите ваш S-ID"
                    value={sId}
                    onChange={(e) => setSId(e.target.value)}
                    required
                    className="flex-1 h-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 pr-3"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Пароль</label>
                <div className="flex items-center h-11 rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-[#C8102E] focus-within:border-[#C8102E] transition-all">
                  <span className="pl-3 pr-2 flex items-center shrink-0">
                    <Lock size={18} className="text-[#C8102E]" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="flex-1 h-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="pr-3 pl-2 flex items-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#C8102E] hover:bg-[#A00D26] text-white h-11 rounded-xl font-semibold shadow-md transition-all duration-200"
              >
                Войти
              </Button>

              <p className="text-center text-sm text-gray-500">
                Нет аккаунта?{' '}
                <Link to="/register" className="text-[#C8102E] font-semibold hover:underline">
                  Зарегистрироваться
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
