import React from 'react';

// 1. Import các công cụ điều hướng
import { NavigationProvider, usePathname } from './navigation';
import { resolveRoute } from './routing';

// 2. Import các thành phần giao diện chung (Layout)
import Header from './components/Header';
import Footer from './components/Footer';

// 3. Import các trang (Pages)
import Home from './pages/Home';
import About from './pages/About';
import Guide from './pages/Guide';
import BookDetail from './pages/BookDetail';

function AppContent() {
  // Lấy đường dẫn hiện tại và phân tích thành route tương ứng
  const pathname = usePathname();
  const route = resolveRoute(pathname);

  // Khởi tạo trang mặc định là Trang chủ
  let page = <Home />;
  
  // Kiểm tra tên route để hiển thị đúng trang
  if (route.name === 'about') {
    page = <About />;
  } else if (route.name === 'guide') {
    page = <Guide />;
  } else if (route.name === 'book') {
    // Truyền id của cuốn sách vào trang chi tiết
    page = <BookDetail id={route.params.id} />;
  }

  // Khung giao diện chuẩn (Header ở trên, Nội dung ở giữa, Footer ở dưới cùng)
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        {page}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    // Bọc toàn bộ ứng dụng trong NavigationProvider để tính năng chuyển trang hoạt động
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

export default App;