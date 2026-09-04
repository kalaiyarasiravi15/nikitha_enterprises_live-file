import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { RiMailLine, RiLockPasswordLine, RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import { MdLogin } from 'react-icons/md';
import { API } from '../config';
import logoImage from '../assets/logo.jpg';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API}/admin/login`, { email, password });

      if (res.data.token) {
        const isEmployee = email.toLowerCase() === 'employee@anyrastrove.com';
        localStorage.setItem('adminToken', res.data.token);
        localStorage.setItem('adminId', res.data.adminId);
        localStorage.setItem('adminName', res.data.adminName || (isEmployee ? 'Employee' : 'Admin'));
        localStorage.setItem('adminRole', res.data.role || (isEmployee ? 'employee' : 'admin'));
        axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;

        toast.success(' Login successful! Redirecting...', {
          autoClose: 1500,
          onClose: () => { window.location.href = '#/dashboard'; },
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || '';

      if (
        status === 404 ||
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('user') ||
        message.toLowerCase().includes('not found')
      ) {
        toast.error('📧 No account found with this email address.', { autoClose: 4000 });
      } else if (
        status === 401 ||
        message.toLowerCase().includes('password') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('incorrect')
      ) {
        toast.error(' Incorrect password. Please try again.', { autoClose: 4000 });
      } else {
        toast.error(' Login failed. Please try again.', { autoClose: 4000 });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-split-card">
        
        {/* Left Branding Panel */}
        <div className="login-left-panel">
          <div className="brand-logo-text-wrap">
            <img src={logoImage} alt="Anyra's Trove - People First" className="login-logo-img" />
          </div>
          <div className="brand-text-content">
            <span className="brand-subtitle">ANYRA'S TROVE</span>
            <h1 className="brand-title">Admin Panel</h1>
            <p className="brand-description">
              Secure access for managing products, orders, and inquiries.
            </p>
          </div>
          <div className="panel-decorative-line"></div>
        </div>

        {/* Right Form Panel */}
        <div className="login-right-panel">
          <div className="form-header">
            <span className="form-subtitle">ADMIN LOGIN</span>
            <h2 className="form-title">Sign in to continue</h2>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <RiMailLine className="input-icon" />
              <input
                type="email"
                placeholder="admin@anyrastrove.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <RiLockPasswordLine className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>

            <button type="submit" className="login-action-btn" disabled={loading}>
              <MdLogin className="btn-icon" />
              <span>{loading ? 'Verifying...' : 'Login'}</span>
            </button>
          </form>
          <div className="panel-decorative-line-right"></div>
        </div>

      </div>
    </div>
  );
};

export default Login;