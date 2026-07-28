import React from 'react'
import { useNavigate } from '../navigation'
import ContinueListening from '../components/ContinueListening'

export default function Home() {
  const navigate = useNavigate()

  // Dữ liệu sách giả lập để xem hiệu ứng Grid và Card
  const demoBooks = [
    { id: 1, title: 'Tâm Lý Học Tội Phạm', author: 'Diệp Hồng Vũ', category: 'Tâm lý học' },
    { id: 2, title: 'Vũ Trụ Trong Vỏ Hạt Dẻ', author: 'Stephen Hawking', category: 'Khoa học Tự nhiên' },
    { id: 3, title: 'Lập Trình Python Căn Bản', author: 'Nhiều tác giả', category: 'Công nghệ' },
    { id: 4, title: 'Sức Mạnh Của Sự Tập Trung', author: 'Jack Canfield', category: 'Kỹ năng sống' },
  ]

  return (
    <div className="home-container">
      {/* 1. Khung Hero giới thiệu */}
      <section className="hero-section">
        <h1>Thư viện sách nói DAISY</h1>
        <p>Ứng dụng tra cứu và khám phá các đầu sách nói định dạng DAISY, hỗ trợ tiếp cận thông tin và tri thức một cách công bằng.</p>
      </section>

      {/* 2. Chức năng tiếp tục nghe dở (Đã được tách ra component riêng cho gọn) */}
      <ContinueListening />

      {/* 3. ĐIỀU HƯỚNG NHANH (Gộp từ đoạn code 1 sang và áp dụng CSS btn-secondary) */}
      <section className="quick-actions" style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/search')}>🔍 Tìm kiếm</button>
        <button className="btn btn-secondary" onClick={() => navigate('/books')}>📚 Sách nói</button>
        <button className="btn btn-secondary" onClick={() => navigate('/activities')}>🎉 Hoạt động</button>
      </section>

      {/* 4. Tiêu đề danh sách */}
      <div className="page-heading-section">
        <h2 className="page-title">Sách mới cập nhật</h2>
        <span className="results-count">{demoBooks.length} cuốn</span>
      </div>

      {/* 5. Lưới hiển thị Sách */}
      <div className="book-grid">
        {demoBooks.map(book => (
          <div 
            key={book.id} 
            className="book-card" 
            onClick={() => navigate(`/book/${book.id}`)} 
            style={{ cursor: 'pointer' }}
          >
            <div className="card-img-wrapper">
              <img 
                src={`https://via.placeholder.com/300x400/e2e8f0/475569?text=Sách+DAISY+${book.id}`} 
                alt={book.title} 
              />
            </div>
            
            <div className="card-content">
              <h3 className="book-title">{book.title}</h3>
              <div className="card-meta-item">Tác giả: <strong>{book.author}</strong></div>
              <div className="card-meta-item">Thể loại: <strong>{book.category}</strong></div>
              
              <div className="card-footer">
                <button className="btn btn-primary card-btn">🎧 Nghe ngay</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}