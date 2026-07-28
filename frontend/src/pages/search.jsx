import React, { useState, useEffect } from 'react'
import { useNavigate } from '../navigation'

export default function Search() {
  const navigate = useNavigate()
  
  // 1. Lấy từ khóa 'q' từ thanh địa chỉ URL
  const searchParams = new URLSearchParams(window.location.search)
  const query = searchParams.get('q') || ''

  // Dữ liệu sách giả lập (Thực tế sau này bạn sẽ lấy từ API hoặc file data chung)
  const allBooks = [
    { id: 1, title: 'Tâm Lý Học Tội Phạm', author: 'Diệp Hồng Vũ', category: 'Tâm lý học' },
    { id: 2, title: 'Vũ Trụ Trong Vỏ Hạt Dẻ', author: 'Stephen Hawking', category: 'Khoa học Tự nhiên' },
    { id: 3, title: 'Lập Trình Python Căn Bản', author: 'Nhiều tác giả', category: 'Công nghệ' },
    { id: 4, title: 'Sức Mạnh Của Sự Tập Trung', author: 'Jack Canfield', category: 'Kỹ năng sống' },
  ]

  const [searchResults, setSearchResults] = useState([])

  // 2. Chạy bộ lọc mỗi khi từ khóa 'query' thay đổi
  useEffect(() => {
    if (query) {
      // Ép tất cả về chữ thường để tìm kiếm không phân biệt hoa thường
      const lowerCaseQuery = query.toLowerCase()
      const filtered = allBooks.filter(book => 
        book.title.toLowerCase().includes(lowerCaseQuery) || 
        book.author.toLowerCase().includes(lowerCaseQuery)
      )
      setSearchResults(filtered)
    } else {
      // Nếu không có từ khóa (vào thẳng trang /search), hiển thị tất cả
      setSearchResults(allBooks)
    }
  }, [query])

  return (
    <div className="home-container">
      <div className="page-heading-section" style={{ marginTop: '2rem' }}>
        <h2 className="page-title">
          {query ? `Kết quả tìm kiếm cho: "${query}"` : 'Tất cả sách'}
        </h2>
        <span className="results-count">{searchResults.length} cuốn</span>
      </div>

      {/* 3. Hiển thị kết quả */}
      {searchResults.length > 0 ? (
        <div className="book-grid">
          {searchResults.map(book => (
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
      ) : (
        /* Giao diện khi không tìm thấy sách */
        <div className="no-results">
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '10px' }}>
            Không tìm thấy kết quả nào phù hợp
          </h3>
          <p>Hãy thử tìm kiếm bằng một từ khóa khác hoặc tên tác giả.</p>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('/')}>
            Quay lại trang chủ
          </button>
        </div>
      )}
    </div>
  )
}