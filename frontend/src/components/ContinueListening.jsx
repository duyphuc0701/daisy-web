import React, { useEffect, useState } from 'react';
import { useNavigate } from '../navigation';

export default function ContinueListening() {
  const [recentBook, setRecentBook] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Lấy dữ liệu từ localStorage (dùng key daisy_recent_book như đã thống nhất)
    const savedBook = localStorage.getItem('daisy_recent_book');
    if (savedBook) {
      try {
        setRecentBook(JSON.parse(savedBook));
      } catch (error) {
        console.error('Lỗi đọc dữ liệu:', error);
      }
    }
  }, []);

  if (!recentBook) return null;

  // Đổi số giây sang định dạng Phút:Giây
  const formatTime = (timeInSeconds) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <section className="continue-listening-section" style={{
      backgroundColor: 'var(--primary-light)',
      padding: '1.5rem',
      borderRadius: 'var(--radius-md)',
      marginBottom: '2rem',
      borderLeft: '4px solid var(--primary)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <h3 style={{ color: 'var(--secondary)', margin: '0 0 10px 0' }}>
        🎧 Đang nghe dở
      </h3>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
            {recentBook.title}
          </strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Vị trí: {formatTime(recentBook.progress)}
          </p>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={() => navigate(`/book/${recentBook.id}`)}
        >
          ▶ Nghe tiếp
        </button>
      </div>
    </section>
  );
}