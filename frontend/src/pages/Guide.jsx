import React from 'react';

const Guide = () => {
  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '20px', lineHeight: '1.6' }}>
      <h1>Hướng dẫn sử dụng Sách nói DAISY</h1>
      
      <section style={{ marginBottom: '25px' }}>
        <h2>1. Chuẩn DAISY là gì?</h2>
        <p>
          DAISY (Digital Accessible Information System) là hệ thống định dạng tài liệu kỹ thuật số hỗ trợ người khiếm thị và người khuyết tật khả năng đọc chữ in. Sách DAISY cho phép điều hướng linh hoạt theo từng chương, mục, trang và điều chỉnh tốc độ đọc.
        </p>
      </section>

      <section style={{ marginBottom: '25px' }}>
        <h2>2. Phím tắt điều hướng trình phát sách</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong>Space (Phím cách):</strong> Tạm dừng hoặc tiếp tục phát sách.</li>
          <li><strong>Mũi tên Trái (←):</strong> Tua lùi 10 giây.</li>
          <li><strong>Mũi tên Phải (→):</strong> Tua tới 10 giây.</li>
          <li><strong>Mũi tên Lên (↑) / Bắt đầu chương:</strong> Chuyển sang chương kế tiếp.</li>
          <li><strong>Mũi tên Xuống (↓):</strong> Quay lại chương trước.</li>
        </ul>
      </section>

      <section>
        <h2>3. Tìm kiếm và lưu lịch sử nghe</h2>
        <p>
          Bạn có thể sử dụng thanh tìm kiếm để tra cứu đầu sách theo tên tác giả hoặc thể loại. Hệ thống sẽ tự động lưu lại vị trí bạn đang nghe dở ở trang chủ.
        </p>
      </section>
    </div>
  );
};

export default Guide;
