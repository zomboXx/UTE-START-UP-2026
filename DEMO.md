# Bản trải nghiệm Brain10 trên trình duyệt

Ngày triển khai: 23/10/2026. Đường dẫn `/try/`; trang giới thiệu và khu vực tải tại `/` được giữ lại. Nút Trải nghiệm thử có ở hero, thanh điều hướng và menu điện thoại.

## Thiết kế và hành vi

- Giao diện tham chiếu trực tiếp Flutter APK 0.5.1: Roboto self-host, nền #F5F5FF, xanh #2463EB, thẻ trắng, thanh 5 tab. Desktop có khung điện thoại và hướng dẫn; điện thoại sử dụng chiều cao viewport, thanh điều hướng cố định trong khung app.
- Màn chào: tên, sinh nhật, mục tiêu và chế độ khách. Nút dùng hồ sơ mẫu giúp thử mà không nhập dữ liệu cá nhân.
- Hôm nay: công việc hôm nay/ngày mai, thêm tên/thời lượng/ghi chú, check-out có phản hồi 160 ký tự, lựa chọn quyền xem có nhãn mô phỏng, tiến độ cập nhật. Hoạt động ngoài điện thoại được nhập thời gian trong 24 giờ trước hiện tại.
- Lịch trình: tự nhập, sửa, xóa lịch cố định hàng tuần; chặn khung trùng. Sau khi có lịch cố định mới được xem kế hoạch mẫu DBMS/CNPM/KTLT trong 3 ngày tới. Bộ xếp giờ cục bộ chọn khung 45 phút từ 08:00–22:00, tối đa 2 phiên/ngày, tránh lịch cố định và phiên đã xác nhận. Xem trước rồi xác nhận, không tự thêm.
- Kế hoạch là nội dung được viết sẵn, luôn có nhãn mẫu. Không phân tích yêu cầu tự do, không gọi AI, không tiêu credit. Không tuyên bố nội dung được cá nhân hóa theo môn học thực tế.
- Tập trung: thông báo giới hạn trước lần bắt đầu đầu tiên, bộ đếm 1–480 phút dựa vào thời điểm kết thúc. Giữ thời gian khi chuyển tab/tải lại; ghi nhận thời gian thực tế khi dừng. Không hứa chạy nền, báo thức khi đóng tab hay khóa điện thoại.
- Thống kê: biểu đồ số việc đã check-out trong 7 ngày, tổng thời gian tập trung và số hoạt động trong bản thử. Không tạo dữ liệu screen time giả.
- Nhóm: tạo vòng tròn mẫu, tên đồng hành, check-in hoặc nghỉ hôm nay; mọi trạng thái đều cục bộ và được dán nhãn.

## Tính năng chưa có trên bản web

Screen time Android, chặn ứng dụng / Internet, bảo vệ nền, widget hệ thống, giọng nói, ảnh, đăng nhập, AI trực tiếp, lời mời và đồng bộ nhóm. Khi chọn, người dùng nhận thông báo rõ ràng. Ảnh minh chứng có thông báo ngay trong form để giữ các trường đã nhập.

## Dữ liệu và triển khai

HTML/CSS/JS tĩnh trong `dist/try/`, không thêm backend hoặc biến môi trường. Chỉ sử dụng localStorage với khóa `brain10.web-demo.v1`, tách biệt APK và prototype cũ. Hồ sơ cho biết cách xóa dữ liệu; trang quyền riêng tư đã cập nhật. Không analytics, không request API, không lấy dữ liệu thiết bị. Hosting vẫn có thể ghi log truy cập kỹ thuật.

Không đổi APK hay metadata phát hành công khai: giao diện demo 0.5.1 không có nghĩa bản tải công khai đã được nâng cấp.

Roboto lấy từ bộ font Flutter có sẵn, license Apache 2.0 lưu tại `dist/try/fonts/LICENSE.txt`.

## Kiểm chứng

`npm run check` và `npm test` (6 bài):

1. Trang giới thiệu giữ nội dung, link demo hoạt động, không tràn ngang và thanh tab trong viewport ở 1440×1000, 390×844, 320×640, 844×390.
2. Thêm việc, giữ sau reload, escape nội dung HTML, check-out cập nhật tiến độ và biểu đồ.
3. Lịch cố định bắt buộc, chặn khung trùng, lịch mẫu không trùng giờ, xác nhận rồi giữ sau reload; không request tới origin khác.
4. Thông báo trước focus, timer qua reload và ghi thời gian thực tế bằng đồng hồ trình duyệt giả lập trong test.
5. Nhóm mẫu, check-in, thông báo lời mời chưa có, xóa dữ liệu.
6. Kiểm tra giới hạn 24 giờ và giữ nội dung form khi chọn ảnh chưa hỗ trợ.

QA hình ảnh thực tế ở `screenshots/demo-*.png`, không commit. Chưa kiểm chứng trực tiếp Safari/iPhone hoặc Firefox.
