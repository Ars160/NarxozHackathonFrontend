import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import '../styles/auth.css';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [sId, setSId] = useState('');
  const [password, setPassword] = useState('');
  const [role] = useState('student');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: sId,
          password,
          role,
          full_name: fullName
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError('Ошибка при регистрации');
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
                    Создать аккаунт
                  </h2>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label text-secondary">Полное имя</label>
                    <div className="input-group">
                      <span className="input-group-text bg-red-20">
                        <User size={20} color="#C8102E" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Иван Иванов"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

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
                    Зарегистрироваться
                  </button>

                  <div className="text-center mt-4">
                    <span className="text-muted">Уже есть аккаунт? </span>
                    <Link 
                      to="/login" 
                      className="text-decoration-none text-red fw-bold"
                    >
                      Войти
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

export default Register;
