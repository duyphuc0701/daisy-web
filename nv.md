# Nhiệm vụ 2: Phát triển giao diện Tìm kiếm & Khả năng truy cập

## 1. Tổng quan nhiệm vụ

Xây dựng và cải thiện giao diện tìm kiếm trên trang DAISY Library, đảm bảo tương thích hoàn toàn với TalkBack và các trình đọc màn hình khác.

## 2. Phân tích yêu cầu

### 2.1 Yêu cầu chức năng

| STT | Yêu cầu | Mức độ ưu tiên | Ghi chú |
|-----|---------|----------------|---------|
| 1 | Menu thả xuống Thể loại (Category Dropdown) | Cao | Đã có component cơ bản trong Header.jsx |
| 2 | Ô nhập văn bản tìm kiếm (Search Input) | Cao | Đã có SearchBar component |
| 3 | Trang tìm kiếm riêng biệt (Search Page) | Trung bình | Hiện tại search param xử lý trên Home |
| 4 | Nút xóa tìm kiếm (Clear search) | Thấp | Cải thiện UX |

### 2.2 Yêu cầu khả năng truy cập (Accessibility)

**WCAG 2.1 Level AA targets:**

| STT | Tiêu chí | Mô tả | Trạng thái hiện tại |
|-----|----------|-------|---------------------|
| 1 | Label on inputs | Input tìm kiếm phải có label | ⚠️ Có aria-label nhưng thiếu `<label>` element |
| 2 | Dropdown ARIA | Menu thể loại cần role="listbox"/"option" | ❌ Chưa có |
| 3 | Keyboard nav | Điều hướng bằng bàn phím cho dropdown | ❌ Chưa có |
| 4 | Focus management | Focus được quản lý khi mở/đóng dropdown | ❌ Chưa có |
| 5 | Live regions | Thông báo kết quả tìm kiếm cho screen reader | ❌ Chưa có |
| 6 | aria-expanded | Trạng thái dropdown được thông báo | ⚠️ Có nhưng chưa đầy đủ |
| 7 | Error announcements | Thông báo lỗi cho người dùng đọc màn hình | ⚠️ Có console.error, thiếu ARIA |

## 3. Phân tích codebase hiện tại

### 3.1 Component đã có

**SearchBar.jsx** (`frontend/src/components/SearchBar.jsx`)
- Input với `aria-label="Tìm kiếm sách"`
- Button với `aria-label="Nút Tìm kiếm"`
- Navigation đến `/?search=...`
- ⚠️ Thiếu: `<label>` element (dù có aria-label)

**Header.jsx** (`frontend/src/components/Header.jsx`)
- Dropdown "Thể loại sách" với danh sách categories từ API
- `aria-expanded` trên toggle button
- ⚠️ Thiếu: `role="listbox"`, keyboard navigation, focus management

**Home.jsx** (`frontend/src/pages/Home.jsx`)
- Đọc `?search=` và `?category=` từ URL
- Fetch books từ API với filters
- Hiển thị số kết quả
- ⚠️ Thiếu: ARIA live region cho kết quả tìm kiếm

### 3.2 API endpoints

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/books?search=&category=` | Lấy danh sách sách với filter |
| `GET /api/categories` | Lấy danh sách thể loại |

### 3.3 Routing

- `/` → Home (xử lý search params)
- `/?search=keyword` → Home với kết quả tìm kiếm
- `/?category=name` → Home với sách theo thể loại

## 4. Kế hoạch thực hiện

### Phase 1: Cải thiện SearchBar (Priority: Cao)

**File:** `frontend/src/components/SearchBar.jsx`

Changes:
1. Thêm `<label>` element ẩn cho input (visually-hidden class)
2. Thêm nút xóa (clear button) với `aria-label="Xóa tìm kiếm"`
3. Thêm `role="search"` trên form
4. Cải thiện focus styles

### Phase 2: Cải thiện Category Dropdown (Priority: Cao)

**File:** `frontend/src/components/Header.jsx`

Changes:
1. Thêm `role="listbox"` trên `<ul>` dropdown
2. Thêm `role="option"` trên `<li>` items
3. Thêm `aria-selected` cho item đang chọn
4. Thêm `aria-activedescendant` để track item đang focus
5. Implement keyboard navigation (Arrow keys, Enter, Escape)
6. Focus trap trong dropdown khi mở

### Phase 3: Thêm ARIA Live Regions (Priority: Trung bình)

**File:** `frontend/src/pages/Home.jsx`

Changes:
1. Thêm `role="status"` hoặc `aria-live="polite"` cho kết quả
2. Thêm `aria-busy` khi đang loading
3. Thông báo số kết quả tìm được

### Phase 4: Search Page (Optional - nếu cần)

Cân nhắc tạo `/search` route riêng với:
- Filter panel riêng
- Sort options
- Advanced search

## 5. Chi tiết kỹ thuật

### 5.1 Keyboard Navigation cho Dropdown

```
Tab → Focus vào dropdown toggle
Enter/Space → Mở dropdown, focus vào item đầu tiên
Arrow Down → Di chuyển xuống item tiếp theo
Arrow Up → Di chuyển lên item trước
Enter → Chọn item, đóng dropdown
Escape → Đóng dropdown, focus lại toggle
Tab → Di chuyển ra ngoài dropdown
```

### 5.2 ARIA Pattern cho Listbox

```html
<div class="dropdown-container">
  <button 
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-controls="category-listbox"
  >
    Thể loại sách ▾
  </button>
  <ul 
    id="category-listbox"
    role="listbox"
    aria-label="Chọn thể loại"
  >
    <li role="option" aria-selected="false">Tất cả</li>
    <li role="option" aria-selected="false">Văn học</li>
    <!-- ... -->
  </ul>
</div>
```

### 5.3 Live Region cho Results

```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {isLoading ? 'Đang tải...' : `Tìm thấy ${count} kết quả`}
</div>
```

## 6. Testing Checklist

### Functional Testing
- [ ] Search với từ khóa → hiển thị kết quả đúng
- [ ] Filter theo thể loại → hiển thị đúng sách
- [ ] Kết hợp search + category → hoạt động đồng thời
- [ ] Clear search → quay về danh sách đầy đủ
- [ ] Empty search → hiển thị thông báo phù hợp

### Accessibility Testing
- [ ] TalkBack (Android) - đọc dropdown items
- [ ] NVDA (Windows) - đọc search results count
- [ ] VoiceOver (iOS/Mac) - điều hướng bằng swipe
- [ ] Keyboard-only navigation - tab, arrows, enter, escape
- [ ] High contrast mode - đủ độ tương phản
- [ ] Zoom 200% - layout không vỡ

## 7. Files cần modify

| File | Action |
|------|--------|
| `frontend/src/components/SearchBar.jsx` | Edit - thêm label, clear button |
| `frontend/src/components/Header.jsx` | Edit - ARIA listbox, keyboard nav |
| `frontend/src/pages/Home.jsx` | Edit - live regions |
| `frontend/src/index.css` | Edit - thêm visually-hidden class, focus styles |

## 8. Estimated Effort

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 1 | 1-2 giờ | SearchBar improvements |
| Phase 2 | 2-3 giờ | Dropdown keyboard nav & ARIA |
| Phase 3 | 1 giờ | Live regions |
| Testing | 2 giờ | Manual accessibility testing |
| **Total** | **6-8 giờ** | |

## 9. Dependencies

- React 18+ (đã có)
- lucide-react (đã dùng cho icons)
- CSS custom properties (đã có trong index.css)

Không cần thêm library mới.
