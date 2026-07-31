import React, { useState } from 'react';
import { useNavigate, Link } from '../navigation';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message || 'Email khôi phục mật khẩu đã được gửi.');
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
        <h2 className="auth-title">Quên mật khẩu</h2>
        {error && <div className="auth-error">{error}</div>}
        {message && <div style={{backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem', textAlign: 'center'}}>{message}</div>}
        
        <p style={{marginBottom: '1.5rem', color: 'var(--text-main)', textAlign: 'center'}}>
          Nhập địa chỉ email của bạn, chúng tôi sẽ gửi một liên kết để đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </form>
        <p className="auth-redirect">
          <Link to="/login">Quay lại Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
