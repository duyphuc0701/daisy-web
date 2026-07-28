import { BrowserRouter, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';

// 1. Cung cấp Router cho App.jsx
export const NavigationProvider = BrowserRouter;

// 2. Cung cấp hook lấy đường dẫn cho App.jsx
export const usePathname = () => {
  const location = useLocation();
  return location.pathname;
};

// 3. Xuất các công cụ chuyển trang cho Header, Home, BookDetail...
export { Link, NavLink, useNavigate };