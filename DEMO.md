# Brain10 trên trình duyệt

Cập nhật 18/11/2026, đối chiếu Android 0.6.7. Bản web ở `/try/`; trang giới thiệu và nút tải APK tiếp tục ở `/`.

[Ma trận chức năng web/Android](WEB_MOBILE_PARITY.md) mô tả phần giống nhau và khác biệt do nền tảng.

## Bắt đầu

Nhập họ tên, ngày sinh và mục tiêu → chọn Dùng không đăng nhập. Hồ sơ mới bắt đầu với danh sách công việc trống. Nút Dùng hồ sơ mẫu An chỉ thêm dữ liệu khi người dùng chủ động chọn; không thay thế công việc đã lưu. Bước liên kết có logo Google/Facebook/điện thoại, giải thích dịch vụ chưa mở khi chọn; không yêu cầu tài khoản hay widget để vào app.

## Các tab

- Hôm nay: việc hôm nay/ngày mai, việc chưa xong từ trước, dời việc, check-out và lựa chọn người xem cục bộ.
- Lịch trình: lịch cố định, nhịp học, bảng 1/2/4 tuần, chi tiết buổi, AI beta có mục tiêu/ngữ cảnh/hạn tùy chọn. Tiến trình, hủy, lỗi và xem trước rõ ràng. Lịch mẫu và AI trong trình duyệt là lựa chọn phụ.
- Tập trung: bộ đếm 1–480 phút giữ qua reload; ghi thời gian thực tế; nhắc nghỉ nhẹ và uống nước mỗi 40 phút khi phiên còn chạy.
- Thống kê: tuần thứ Hai–Chủ nhật, tuần trước/sau/về tuần hiện tại, chạm cột mở ngày. Tổng hợp công việc hoàn thành, phiên tập trung đã ghi và hoạt động tự ghi của tuần đang chọn. Không tạo dữ liệu app Android giả.
- Nhóm: nhiều vòng tròn, tên bạn đồng hành, check-in/nghỉ theo ngày, chuỗi ngày và ghi nhận cục bộ. Chưa chia sẻ hoặc mời thành viên qua mạng.
- Hồ sơ: cùng danh mục VND với Android, sửa hồ sơ và xóa dữ liệu trình duyệt. Chưa đồng bộ sang APK.

## Ảnh, giọng nói và dữ liệu

Hoạt động trong 24 giờ vừa qua có thể đính kèm ảnh JPG/PNG/WebP. Ảnh được thu nhỏ, lưu trên trình duyệt, không gửi sang AI. Lỗi tệp hoặc hết dung lượng hiển thị trong form để người dùng chỉnh lại.

Giọng nói dùng API của trình duyệt nếu có, chỉ bắt đầu sau khi người dùng bấm Bắt đầu nói. Dịch vụ nhận giọng nói của trình duyệt có thể xử lý âm thanh trực tuyến. Luôn có nhập chữ thay thế.

Giữ khóa localStorage `brain10.web-demo.v1`, hợp nhất thay đổi giữa nhiều tab, chuyển nhóm đơn cũ sang nhiều nhóm mà không xóa công việc. Phiên mới chia thời gian theo ngày địa phương kể cả qua nửa đêm; phiên cũ vẫn đọc được.

## Giới hạn nền tảng

Đọc thời gian dùng app khác, gợi ý hạn chế theo dữ liệu thiết bị, nhắc khi dùng TikTok 15–30 phút, Trợ năng chặn app và VPN cần Android. Web không xin các quyền đó. Widget trong mục Màn hình chính là mô phỏng HTML, không cài lên hệ điều hành. Web Audio không điều khiển âm lượng hệ thống và không bảo đảm nhắc khi tab đóng hoặc thiết bị ngủ.

Đăng nhập/đồng bộ và thanh toán gói trả phí chưa hoàn thiện trên cả hai bản. Dữ liệu lưu riêng theo nền tảng.

## Kiểm thử

`npm run check`, `npm test`, `npm run test:server`. Playwright kiểm tra các luồng chính ở Edge; có kiểm tra màn nhỏ 320/390px, desktop và đường dẫn GitHub Pages. Script `scripts/qa-mobile-parity.mjs` tạo ảnh từ dữ liệu QA minh họa. AI dùng response thử trong kiểm thử, không tiêu credit. Chưa kiểm chứng mọi API giọng nói trên Safari/Firefox.
