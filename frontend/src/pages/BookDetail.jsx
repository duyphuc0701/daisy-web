import React, { useRef } from 'react';
import { Link } from '../navigation'; // Import Link từ navigation.jsx của bạn

export default function BookDetail({ id }) {
  // Tạo một tham chiếu (ref) để điều khiển thẻ <audio>
  const audioRef = useRef(null);

  // Giả lập thông tin cuốn sách dựa vào ID (Sau này bạn sẽ lấy từ Database/API)
  const book = {
    id: id,
    title: `Sách nói DAISY số ${id}`,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // Link nhạc mẫu để test
  };

  // CHIỀU 1: LƯU LỊCH SỬ KHI ĐANG NGHE
  // Hàm này tự động chạy liên tục mỗi khi audio đang phát
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      
      const bookData = { 
        id: book.id, 
        title: book.title, 
        progress: currentTime 
      };
      
      // Lưu vào LocalStorage
      localStorage.setItem('daisy_recent_book', JSON.stringify(bookData));
    }
  };

  // CHIỀU 2: KHÔI PHỤC LỊCH SỬ KHI MỞ SÁCH
  // Hàm này chạy một lần ngay khi audio tải xong dữ liệu
  const handleLoadedMetadata = () => {
    const savedBook = localStorage.getItem('daisy_recent_book');
    
    if (savedBook) {
      const parsedBook = JSON.parse(savedBook);
      
      // Kiểm tra xem lịch sử lưu có đúng là cuốn sách hiện tại không (so sánh id)
      if (parsedBook.id === book.id && audioRef.current) {
        // Tua ngay đến vị trí đang nghe dở
        audioRef.current.currentTime = parsedBook.progress;
      }
    }
  };

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 'bold' }}>
        ⬅ Quay lại Trang chủ
      </Link>
      
      <h1 style={{ marginTop: '1.5rem' }}>Chi tiết sách</h1>
      <h2 style={{ color: '#333' }}>{book.title}</h2>
      
      {/* TRÌNH PHÁT AUDIO */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>🎧 Trình phát DAISY</p>
        
        <audio 
          ref={audioRef}
          controls 
          src={book.audioUrl}
          onTimeUpdate={handleTimeUpdate}        // Kích hoạt Chiều 1
          onLoadedMetadata={handleLoadedMetadata} // Kích hoạt Chiều 2
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}