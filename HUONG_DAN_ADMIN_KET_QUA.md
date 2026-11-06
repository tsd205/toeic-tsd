# Nâng cấp Admin – TOEIC TSD

## Những gì đã thay đổi
- `admin.html`: thêm mục **Kết quả học tập của học viên**, bỏ JavaScript inline.
- `js/admin.js`: toàn bộ logic quản lý Test/từ vựng trước đây, giữ nguyên.
- `js/admin-results.js`: danh sách lượt làm (50/trang), lọc theo tên học viên/Test, chi tiết câu trả lời, xuất CSV **chỉ trang đang xem**.
- `css/admin.css`: giao diện bảng kết quả.
- `supabase/admin_results.sql`: quyền đọc kết quả theo RLS.

## Cách cập nhật
1. Sao lưu repository cũ trước khi thay thế.
2. Giải nén ZIP, tải các file và thư mục bên trong `toeic-tsd-main/` lên nhánh `main` của GitHub, không tải nguyên thư mục cha.
3. Mở Supabase > SQL Editor > New query; chạy **chỉ** nội dung `supabase/admin_results.sql` (không chạy lại toàn bộ `schema.sql` nếu không cần).
4. Đợi GitHub Pages triển khai xong; đăng nhập tài khoản Admin > mở `admin.html` > mục **Kết quả học tập của học viên**.
5. Dùng tài khoản Student làm một bài mới; xem kết quả trên Admin. Kết quả chỉ xuất hiện nếu Student lưu bài thành công (cần chính sách insert trong `phase3_results.sql`).

## Ghi chú
- Không thay đổi dữ liệu Supabase; không yêu cầu nhập lại Test/từ vựng.
- RLS kiểm soát quyền thật; kiểm tra role trong JavaScript chỉ để điều hướng giao diện.
- Bảng `profiles` hiện không chứa email; bộ lọc chỉ tìm theo tên hiển thị.
- CSV xuất tối đa 50 lượt làm ở trang đang xem, không phải toàn bộ cơ sở dữ liệu.
- Chi tiết đúng/sai hiện dùng `is_correct`: **đúng khi cả tiếng Anh và nghĩa đều đúng**; dữ liệu cũ không lưu riêng trạng thái đúng/sai của từng phần.
- Các bài làm đã lưu trước đây sẽ hiển thị nếu còn trong Supabase. Bài không lưu thành công sẽ không có dữ liệu.
- Để kiểm tra trực tiếp cần triển khai với dự án Supabase thật và tài khoản Admin; bản ZIP chưa được kiểm thử end-to-end trên tài khoản của bạn.
