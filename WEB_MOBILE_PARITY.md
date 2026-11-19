# Brain10 web và Android 0.6.8

Bản web ở `/try/` theo luồng sản phẩm Android 0.6.8. Web vẫn dùng HTML/JavaScript và dữ liệu trong trình duyệt; Android dùng Flutter/Kotlin và dữ liệu thiết bị. Hai bản chưa đồng bộ tài khoản hoặc dữ liệu.

| Phần | Hành vi chung |
|---|---|
| Bắt đầu | Hồ sơ → chọn dùng khách hoặc phương thức liên kết có logo. Hồ sơ mới trống; dữ liệu mẫu chỉ thêm khi chọn “Dùng hồ sơ mẫu An”. Không bắt thêm widget trước khi vào app. |
| Hôm nay | Hôm nay/ngày mai, công việc còn tồn từ trước, dời việc sang hôm nay, thêm việc, check-out, ghi nhận và lựa chọn người xem cục bộ. |
| Lịch | Lịch cố định, nhịp học, bảng 1/2/4 tuần, chi tiết phiên và check-out. AI dùng mục tiêu, ngữ cảnh và hạn tùy chọn; tiến trình/hủy/lỗi ở ngay nơi thao tác; xem trước rồi xác nhận. |
| Tập trung | Bộ đếm 1–480 phút dựa theo giờ kết thúc, giữ qua tải lại, ghi thời gian thực tế, nhắc nghỉ mỗi 40 phút trong phiên dài. |
| Thống kê | Chọn tuần, mở từng ngày, công việc hoàn thành, phiên tập trung và hoạt động tự ghi. Web chỉ tổng hợp dữ liệu có trên web, không tạo screen time của thiết bị. |
| Hoạt động | Thời gian trong 24 giờ vừa qua, ảnh minh chứng riêng tư. Web nhận JPG/PNG/WebP, thu nhỏ ảnh để lưu cục bộ; không đưa ảnh vào yêu cầu AI. Báo lỗi và giữ form nếu chưa lưu được. |
| Nhóm | Nhiều vòng tròn, bạn đồng hành cục bộ, check-in/nghỉ riêng theo nhóm/ngày, chuỗi ngày và ghi nhận có quyền xem phù hợp. Chưa gửi lời mời hoặc chia sẻ qua mạng trên cả hai bản. |
| Hồ sơ/gói | Cùng danh mục VND từ `plans.json`: Starter, Focus Pro 39.000đ/tháng, Organization từ 29.000đ/người/tháng. Thanh toán/kích hoạt gói chưa hoàn thiện. |

## Sửa luồng lập lịch 0.6.8

Starter tạo kế hoạch không cần mã và hiển thị lượt còn lại từ máy chủ; mỗi bản cài/trình duyệt có 5 lượt/tháng. Bản nháp giữ qua đóng và tải lại, gồm đúng các buổi còn giữ. Xóa lịch cố định hoặc buổi học có Hoàn tác trong 10 giây. Android luôn mở bộ chọn giờ 24 giờ để không bị 10:00 thành 22:00 khi hệ thống dùng 12 giờ. Backend và giới hạn vận hành mô tả ở `server/STARTER.md`.

## Khác biệt do nền tảng

- Đọc lịch sử dùng TikTok/YouTube/app khác, gợi ý hạn chế theo dữ liệu đó, lời nhắc dùng một app khác 15/20/30 phút: cần Usage Access trên Android.
- Màn chặn ứng dụng bằng Trợ năng và VPN chặn mạng: chỉ Android. Web dùng bộ đếm và giải thích giới hạn, không hiện quyền Android giả.
- Widget màn hình chính hệ thống: Android. Web giữ khu vực minh họa widget có nhãn mô phỏng riêng, không đưa vào bước bắt đầu bắt buộc.
- Âm lượng báo thức và rung do Android quản lý; web dùng âm thanh trang và không điều khiển âm lượng hệ thống. Web không cam kết báo khi đóng tab hoặc thiết bị ngủ.
- Nhận giọng nói trên web tùy API/quyền microphone của trình duyệt, chỉ bắt đầu sau thao tác cho phép; có nhập chữ thay thế. Dịch vụ nhận giọng nói của trình duyệt có thể xử lý âm thanh trực tuyến.
- AI chạy model trong trình duyệt là tùy chọn riêng của web, được thu gọn và báo dung lượng tải trước khi dùng.

## Giữ dữ liệu khi nâng cấp

Giữ khóa `brain10.web-demo.v1` và cơ chế hợp nhất thay đổi giữa các tab. Nhóm đơn kiểu cũ được chuyển sang nhiều nhóm bằng ID ổn định; giữ tên thành viên và ngày check-in cũ. Phiên tập trung mới lưu cả thời điểm bắt đầu/kết thúc để chia đúng ngày khi qua nửa đêm; phiên cũ vẫn đọc được theo ngày đã lưu. Không xóa công việc hoặc ghi đè dữ liệu người dùng bằng bộ dữ liệu mẫu.

## Kiểm tra

`npm run check`, `npm test`, `npm run test:server`. Playwright bao phủ màn bắt đầu, dữ liệu trống/mẫu, lưu nhiều tab, lịch/AI, bộ đếm, ảnh, tuần/ngày thống kê, nhiều nhóm, quyền xem và giá gói. Bài Node kiểm tra qua nửa đêm, giữ dữ liệu nhóm cũ và chuỗi ngày có nghỉ.

Kiểm tra hình ảnh ở 320/390px và desktop. Luồng AI sử dụng response thử trong kiểm thử tự động; không tiêu credit model. Chưa thử nhận giọng nói thật trên mọi trình duyệt.
