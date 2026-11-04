# TOEIC Vocabulary – Giai đoạn 1

## Có trong gói
- `supabase/schema.sql`: tạo 5 bảng, trigger tạo hồ sơ học viên, RLS và quyền đọc/ghi cơ bản.
- `login.html`, `register.html`, `dashboard.html`: giao diện đăng ký/đăng nhập/trang sau đăng nhập.
- `js/config.js`: nơi điền Supabase URL và publishable/anon key.
- `js/auth.js`: đăng ký, đăng nhập, đăng xuất, kiểm tra phiên và đọc hồ sơ.
- `css/style.css`: giao diện xanh-trắng tối giản.

## A. Tạo Supabase
1. Vào https://supabase.com/dashboard và đăng ký.
2. Chọn New project, đặt tên `toeic-vocabulary`, tạo mật khẩu database và chọn region.
3. Chờ project khởi tạo.
4. Mở SQL Editor > New query.
5. Mở file `supabase/schema.sql`, copy toàn bộ, paste vào SQL Editor và bấm Run.
6. Vào nút Connect hoặc Project Settings > API Keys. Copy Project URL và publishable key (hoặc anon key legacy).
7. Mở `js/config.js`, thay hai giá trị `YOUR_...` bằng giá trị vừa copy. Không đưa `service_role`/secret key vào frontend.

## B. Chạy trên VS Code
1. Giải nén ZIP.
2. Mở thư mục `toeic_phase1` trong VS Code.
3. Cài extension Live Server.
4. Nhấn chuột phải `login.html` > Open with Live Server.
5. Chọn Create account/Đăng ký, nhập tên, email, mật khẩu tối thiểu 8 ký tự.
6. Nếu bật email confirmation, mở email xác nhận rồi quay lại đăng nhập.
7. Sau khi đăng nhập, trang dashboard sẽ hiện tên và vai trò `student`.

## C. Đặt tài khoản của bạn làm Admin
1. Đăng ký tài khoản đầu tiên trên website.
2. Vào Supabase > Authentication > Users, copy UUID của tài khoản đó.
3. Mở SQL Editor và chạy (thay UUID thật):
   update public.profiles
   set role = 'admin'
   where id = 'UUID_TAI_KHOAN_CUA_BAN';
4. Đăng xuất rồi đăng nhập lại. Bước 1 hiện chưa có giao diện admin; giao diện quản trị sẽ được làm ở giai đoạn 3.

## D. Lưu ý bảo mật
- Chỉ dùng publishable/anon key ở trình duyệt và luôn giữ RLS bật.
- Tuyệt đối không đưa `service_role` hoặc secret key vào HTML/JavaScript.
- Schema giai đoạn 1 chưa mở quyền client ghi lịch sử làm bài. Giai đoạn sau sẽ thêm RPC/server-side validation để người học không tự sửa điểm.
- Không cấp quyền sửa role cho người dùng qua giao diện công khai.

## E. Dữ liệu từ vựng
Các bảng `tests` và `vocabulary` đã được tạo. Gói này chưa chèn bộ từ mẫu để tránh nhầm từ mẫu với tài liệu của trung tâm. Có thể tạo Test và nhập từ ở giai đoạn quản trị.
