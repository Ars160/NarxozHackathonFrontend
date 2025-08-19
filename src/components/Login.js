import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import '../styles/auth.css';

const Login = () => {
  const [sId, setSId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: sId, password })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
      } else {
        if (data.access_token) {
          
          localStorage.setItem('token', data.access_token);
          navigate('/create-exam'); 
        } else {
          setError('Неверный ответ от сервера');
        }
      }
    } catch (err) {
      setError('Ошибка при входе');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-gray-100">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-lg border-0 rounded-3">
              <div className="card-body p-5">
                <div className="text-center mb-5">
                  <h2 className="fw-bold" style={{ color: '#C8102E' }}>
                    Вход в систему
                  </h2>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label text-secondary">S-ID</label>
                    <div className="input-group">
                      <span className="input-group-text bg-red-20">
                        <User size={20} color="#C8102E" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Введите ваш S-ID"
                        value={sId}
                        onChange={(e) => setSId(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-secondary">Пароль</label>
                    <div className="input-group">
                      <span className="input-group-text bg-red-20">
                        <Lock size={20} color="#C8102E" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      <span
                        className="input-group-text"
                        role="button"
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-red w-100 py-2 fw-bold"
                  >
                    Войти
                  </button>

                  <div className="text-center mt-4">
                    <span className="text-muted">Нет аккаунта? </span>
                    <Link
                      to="/register"
                      className="text-decoration-none text-red fw-bold"
                    >
                      Зарегистрироваться
                    </Link>
                  </div>
                </form>

                {error && (
                  <div className="alert alert-danger mt-4">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
