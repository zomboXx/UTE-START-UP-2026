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

## Màn hình chính và nhận diện mới

Logo brain10 do nhóm gửi ngày 23/10/2026 được giữ nguyên file gốc; hiển thị qua SVG viewport, không vẽ lại chữ hoặc biểu tượng. Header/footer website, favicon, header app và icon launcher cùng dùng nhận diện này. Chưa thay đổi logo trong APK.

Chọn **Màn hình chính · Widgets** ở thanh chuyển bên trên điện thoại, hoặc dùng `/try/?view=launcher`. Nút thanh cử chỉ dưới điện thoại cũng đưa về màn hình chính. Icon brain10 và nút Ứng dụng mở lại giao diện app; các tab và bộ đếm được giữ khi chuyển.

- Widget 4×2 Nhịp hôm nay: tiến độ, việc hiện tại, việc tiếp theo, khung giờ và bộ đếm khi có phiên đang chạy. Ưu tiên phiên học đang đến giờ. Không liên kết một việc tùy ý vào phiên tập trung đã bắt đầu độc lập.
- Widget 2×2 Ghi nhanh: ô nhập nhanh, shortcut 30 phút, microphone. Thêm việc qua widget mặc định ngày mai nếu toàn bộ việc hôm nay đã hoàn thành. Microphone có thông báo chưa hỗ trợ, không bật quyền thu âm.
- Bắt đầu từ shortcut liên kết phiên với việc hiện tại, sử dụng cùng thông báo giới hạn tập trung trước lần đầu. Check-out việc đó sẽ cập nhật tiến độ và ghi nhận thời gian thực tế, kết thúc phiên đúng một lần.
- Dữ liệu và trạng thái trống/hoàn thành phản ánh cùng localStorage với app demo. Đồng hồ là giờ trình duyệt; wallpaper, thanh hệ thống và màn hình chính chỉ là mô phỏng bằng HTML/CSS.

## Tính năng chưa có trên bản web

Screen time Android, chặn ứng dụng / Internet, bảo vệ nền, widget hệ thống, giọng nói, ảnh, đăng nhập, AI trực tiếp, lời mời và đồng bộ nhóm. Khi chọn, người dùng nhận thông báo rõ ràng. Ảnh minh chứng có thông báo ngay trong form để giữ các trường đã nhập.

## Dữ liệu và triển khai

HTML/CSS/JS tĩnh trong `dist/try/`, không thêm backend hoặc biến môi trường. Chỉ sử dụng localStorage với khóa `brain10.web-demo.v1`, tách biệt APK và prototype cũ. Hồ sơ cho biết cách xóa dữ liệu; trang quyền riêng tư đã cập nhật. Không analytics, không request API, không lấy dữ liệu thiết bị. Hosting vẫn có thể ghi log truy cập kỹ thuật.

Không đổi APK hay metadata phát hành công khai: giao diện demo 0.5.1 không có nghĩa bản tải công khai đã được nâng cấp.

Roboto lấy từ bộ font Flutter có sẵn, license Apache 2.0 lưu tại `dist/try/fonts/LICENSE.txt`.

## Kiểm chứng

`npm run check` và `npm test` (9 bài):

1. Trang giới thiệu giữ nội dung, link demo hoạt động, không tràn ngang và thanh tab trong viewport ở 1440×1000, 390×844, 320×640, 844×390.
2. Thêm việc, giữ sau reload, escape nội dung HTML, check-out cập nhật tiến độ và biểu đồ.
3. Lịch cố định bắt buộc, chặn khung trùng, lịch mẫu không trùng giờ, xác nhận rồi giữ sau reload; không request tới origin khác.
4. Thông báo trước focus, timer qua reload và ghi thời gian thực tế bằng đồng hồ trình duyệt giả lập trong test.
5. Nhóm mẫu, check-in, thông báo lời mời chưa có, xóa dữ liệu.
6. Kiểm tra giới hạn 24 giờ và giữ nội dung form khi chọn ảnh chưa hỗ trợ.
7. Link mở trực tiếp launcher, yêu cầu thiết lập hồ sơ, logo mới, thêm việc từ widget và giữ dữ liệu khi reload/chuyển vào app.
8. Shortcut tập trung 30 phút, bộ đếm chung qua đồng hồ giả lập, check-out kết thúc đúng phiên liên kết và ghi nhận một lần.
9. Trạng thái hoàn thành, đề xuất thêm việc ngày mai, thông báo microphone, không tràn ngang và widget trong bề ngang khung máy ở desktop/390/320/ngang.

QA hình ảnh thực tế ở `screenshots/demo-*.png`, không commit. Chưa kiểm chứng trực tiếp Safari/iPhone hoặc Firefox.
