import React, { useState } from 'react';
import { useNavigate } from '../navigation';

function ResetPassword({ token }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      return setError('Mật khẩu không khớp');
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage('Mật khẩu đã được đặt lại thành công.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Đặt lại mật khẩu</h2>
        {error && <div className="auth-error">{error}</div>}
        {message && <div style={{backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem', textAlign: 'center'}}>{message}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Mật khẩu mới</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Xác nhận mật khẩu mới</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading || !!message}>
            {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
