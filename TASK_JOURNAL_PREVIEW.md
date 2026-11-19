# Sửa công việc và nhật ký — web thử trước APK

Phạm vi: chỉnh công việc thủ công và hoạt động tự ghi; đọc đầy đủ nhật ký mà không cần quyền theo dõi ứng dụng. APK công khai giữ nguyên 0.6.8 build 19; đợt này không build hoặc phát hành APK.

## Thử trên web

1. Hôm nay: bấm tên công việc để sửa tên, thời lượng, ghi chú hoặc ngày. Nút “Sửa / dời / xóa” mở các thao tác, gồm dời sang hôm nay/ngày mai hoặc chọn ngày khác. Việc đã hoàn thành vẫn sửa được tên và ghi chú, giữ nguyên ngày và check-out. Việc đang gắn với phiên tập trung cần kết thúc phiên trước khi dời hoặc xóa; đổi tên không đổi bộ đếm.
2. “Những điều đã làm” hiển thị hai hoạt động mới nhất. Chọn “Xem tất cả” để mở nhật ký, tìm theo tên/ghi chú và lọc ngày. Có cùng đường vào nhật ký ở Thống kê.
3. Chọn chi tiết một hoạt động để xem đủ nội dung/ảnh, sửa hoặc xóa. Bản ghi cũ hơn 24 giờ vẫn đọc và chỉnh được. Hoạt động thêm mới tiếp tục phải nằm trong 24 giờ vừa qua. Giữ nguyên giây/mili giây cũ nếu không sửa trường thời gian.
4. Xóa yêu cầu xác nhận rồi cho hoàn tác trong 10 giây. Khi lưu thất bại, giữ dữ liệu cũ và nội dung biểu mẫu. Không khôi phục nhầm bản ghi đã bị xóa ở tab khác.

Ảnh, kết quả hoàn thành, người xem và trường dữ liệu không liên quan được giữ khi sửa. Thay đổi không gửi nhật ký tới AI hoặc thêm hệ thống lưu trữ trực tuyến.

## Mã Android đã sửa, chưa đóng gói

Hôm nay có menu từng việc; hoạt động có menu sửa/xóa và bỏ ảnh. Màn Nhật ký đọc trực tiếp bộ nhớ ứng dụng, có tìm/lọc ngày. Màn Thống kê và chi tiết ngày luôn cho đọc ghi chép cục bộ khi Usage Access bị từ chối, đang tải hoặc báo lỗi. Hộp sửa hoạt động cho chỉnh ghi chép cũ, không ép người dùng đổi thời gian thành hôm nay. Các bài widget test kiểm tra bằng bộ nhớ giả, chưa tuyên bố đã kiểm tra thay đổi này trên Redmi.

## Kiểm chứng

`npm run check`, `npm run test:server`, Playwright toàn bộ, `flutter analyze`, `flutter test`. Bài mới bao phủ sửa/dời/xóa/hoàn tác qua tải lại, giữ check-out và người xem, bản ghi cũ/ảnh, lỗi ghi dữ liệu, xóa ở tab khác, từ chối quyền và lỗi thống kê Android. Kiểm thử web sử dụng dữ liệu cục bộ riêng; không tạo kế hoạch AI thật hoặc tác động dữ liệu trình duyệt của người dùng.
