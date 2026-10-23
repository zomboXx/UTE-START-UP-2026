# Bản trải nghiệm Brain10 trên trình duyệt

Source cập nhật: 24/10/2026. Đường dẫn `/try/`; trang giới thiệu và khu vực tải tại `/` được giữ lại. Nút Trải nghiệm thử có ở hero, thanh điều hướng và menu điện thoại.

## Thiết kế và hành vi

- Giao diện tham chiếu Flutter APK, cập nhật màu lịch 0.6.3: Roboto self-host, nền #F5F5FF, xanh #2463EB, thẻ trắng, thanh 5 tab. Desktop có khung điện thoại và hướng dẫn; điện thoại sử dụng chiều cao viewport, thanh điều hướng cố định trong khung app.
- Màn chào: tên, sinh nhật, mục tiêu và chế độ khách. Nút dùng hồ sơ mẫu giúp thử mà không nhập dữ liệu cá nhân.
- Hôm nay: công việc hôm nay/ngày mai, thêm tên/thời lượng/ghi chú, check-out có phản hồi 160 ký tự, lựa chọn quyền xem có nhãn mô phỏng, tiến độ cập nhật. Hoạt động ngoài điện thoại được nhập thời gian trong 24 giờ trước hiện tại.
- Lịch trình: tự nhập, sửa, xóa lịch cố định hàng tuần; chặn khung trùng. Sau khi có lịch cố định mới được xem kế hoạch mẫu DBMS/CNPM/KTLT trong 3 ngày tới. Bộ xếp giờ cục bộ chọn khung 45 phút từ 08:00–22:00, tối đa 2 phiên/ngày, tránh lịch cố định và phiên đã xác nhận. Xem trước rồi xác nhận, không tự thêm.
- Riêng nút kế hoạch mẫu dùng nội dung được viết sẵn, luôn có nhãn mẫu, không gọi AI và không tiêu credit. Nút Lên kế hoạch cùng AI nhận yêu cầu tự do và ngữ cảnh học, dùng API thật, có sử dụng credit, được giải thích trước khi gửi. Không tuyên bố nội dung được cá nhân hóa theo môn học thực tế.
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

Screen time Android, chặn ứng dụng / Internet, bảo vệ nền, widget hệ thống, giọng nói, ảnh, đăng nhập, lời mời và đồng bộ nhóm. Khi chọn, người dùng nhận thông báo rõ ràng. Ảnh minh chứng có thông báo ngay trong form để giữ các trường đã nhập.

## Dữ liệu và triển khai

HTML/CSS/JS tĩnh trong `dist/try/`, AI thật dùng Vercel Function `/api/plans` và Secret `POOL_API_KEY`; bản local dùng cùng handler, key chỉ nằm trong environment server. Chỉ sử dụng localStorage với khóa `brain10.web-demo.v1`, tách biệt APK và prototype cũ. Hồ sơ cho biết cách xóa dữ liệu; trang quyền riêng tư đã cập nhật. Không analytics, không lấy dữ liệu thiết bị. API chỉ được gọi khi người dùng chủ động tạo lịch AI; payload không chứa hồ sơ cá nhân hoặc screen time. Hosting vẫn có thể ghi log truy cập kỹ thuật.

Không đổi APK hay metadata phát hành công khai: giao diện demo 0.5.1 không có nghĩa bản tải công khai đã được nâng cấp.

Roboto lấy từ bộ font Flutter có sẵn, license Apache 2.0 lưu tại `dist/try/fonts/LICENSE.txt`.

## Kiểm chứng

`npm run check` và `npm test` (16 bài), `npm run test:server` (9 bài):

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

10. AI bắt buộc có lịch cố định, payload tối thiểu, preview chưa tự lưu, xác nhận và giữ sau reload; test mặc định dùng response mock.

AI thật đã kiểm chứng trên web local với model gpt-5.4-mini. Bản công khai đang bị chặn do Vercel HTTP 402 fair-use team; không coi source đã cập nhật là đã deploy.

## Lịch trình 0.6.1

Chuyển giữa Đầu việc và Bảng lịch ngay dưới tiêu đề Lịch trình của bạn. Danh sách giữ cách trình bày cũ, bổ sung Sắp tới/Đang diễn ra/Quá hạn/Đã hoàn thành, Chưa check-out và thời gian tương đối. Trạng thái cập nhật mỗi phút mà không đóng nội dung buổi ôn đang mở.

Bảng hiển thị T2–CN, ba hàng Sáng (00–12h), Chiều (12–18h), Tối (18–24h), nhiều hoạt động trong một ô theo giờ bắt đầu. Lịch cố định được chiếu lặp lại; thời gian đã qua là Đã kết thúc và không yêu cầu check-out. Chọn 1/2/4 tuần, lùi/tiến tuần hoặc về tuần hiện tại. Xem rộng mở bảng có thể cuộn ngang trên điện thoại. Chạm một buổi để xem mục tiêu, bước học, đầu ra, ghi nhận và check-out. Việc chưa có giờ nằm riêng dưới bảng. Bảng dùng múi giờ Việt Nam và dữ liệu đã lưu; không thay đổi giới hạn tạo lịch AI 7 ngày và không gọi thêm AI.

Ba bài browser mới kiểm tra đếm ngược qua ranh giới thời gian, nhiều buổi trong một ô, chi tiết/check-out, 4 tuần, lịch cố định, mở rộng và không tràn ngang ở 390/320px. Ba bài Node kiểm tra trạng thái, ranh giới tuần/năm và phép chiếu lịch không làm thay đổi dữ liệu gốc.

## Nghỉ nhẹ và uống nước 0.6.2

Trong tab Tập trung có công tắc nhắc và nút Thử âm báo. Mốc 40/80/120… tính theo giờ bắt đầu, chỉ nhắc khi phiên còn chạy; phiên tối đa 40 phút không nhắc giữa phiên. Banner hiện trên khung app hoặc launcher, kèm hai nốt nhẹ qua Web Audio; nút xác nhận ẩn banner. Bộ đếm tiếp tục, không tắt phiên. Bật tiếng qua thao tác bắt đầu phiên/công tắc/Thử âm báo; nếu chưa sẵn sàng hoặc bị trình duyệt chặn, banner nói rõ. Sau reload có thể cần bật tiếng lại.

Mốc đã nhắc lưu vào focus session trong localStorage, tránh phát trùng qua reload. Tab bị trì hoãn chỉ nhận mốc mới nhất, không phát dồn. Tắt nhắc, kết thúc hoặc check-out việc liên kết sẽ ẩn banner và ngừng nhắc. Bản web không xin quyền thông báo hệ thống, không bảo đảm nhắc khi đóng tab/thiết bị ngủ. Chưa triển khai service worker push hoặc alarm nền như Android.

Đã qua ba test Playwright mới và ba test Node mới: ranh giới thời gian, nhiều mốc, lựa chọn lưu lại, kết thúc, âm thanh bị chặn, không tràn 320px. QA thêm Web Audio thật trên Edge headless, đã thấy banner báo âm được phát và không có pageerror. Không gọi AI, không tiêu credit. Vercel vẫn bị chặn; cập nhật này hiện có ở source và localhost.

## Màu cột ngày 0.6.3

Bảng tuần tô cả đầu cột lẫn ba ô buổi: ngày đã qua xám lạnh (#F1F3F6), hôm nay vàng kem (#FFF9E9), ngày sắp tới xanh lam nhạt (#F1F6FD). Đầu cột đậm hơn, có chú giải riêng và aria-current=date cho hôm nay. Cùng cách hiển thị trong bảng rộng và nhiều tuần. Màu tính theo ngày thực tế UTC+7, cập nhật khi qua nửa đêm; không làm thay đổi màu trạng thái/nội dung công việc. Đã QA ví dụ thứ Ba, toàn bộ ô trong cột, tuần trước/sau, đổi ngày và các test calendar hiện có.
