# Brain10 — website giới thiệu & tải sản phẩm

Website công khai: https://brain10-ute-startup2026.vercel.app — đã triển khai Vercel và nối repo GitHub, ngày 19/10/2026.

Mã nguồn **website**, độc lập với app Android. Website giới thiệu dự án, đội ngũ, các bản tải và trạng thái phát triển. Trang `/try/` bổ sung bản trải nghiệm tương tác dựa trên giao diện APK 0.6.0; đây là bản thử cục bộ trên trình duyệt, không thay thế ứng dụng Android.

## Chạy local

Cần Node.js 22+ và dependencies backend:

```sh
npm ci
npm start
```

Mở `http://127.0.0.1:4174`. Có thể đổi cổng bằng biến môi trường `PORT`. Server chỉ bind localhost.

Nếu file `../mobile/artifacts/brain10-android-debug.apk` tồn tại (bố cục workspace phát triển hiện tại), server local cho tải APK tại `/downloads/brain10-android-debug.apk`. Có thể dùng biến môi trường `BRAIN10_LOCAL_APK` để trỏ tới một bản cài khác đã đối chiếu metadata. APK không được copy vào repo, không đi cùng deployment.

## Cấu trúc

```text
dist/
  index.html       Landing page
  style.css        Responsive layout
  site.js          Menu, FAQ/dialog, thông tin tải
  release.json     Metadata phát hành, không chứa file APK
  try/             Giao diện trải nghiệm web và luồng AI có xác nhận
  assets/          Logo, font có license, ảnh giao diện app
api/plans.mjs      Vercel Function, mã thử beta, không chứa key
server/planner.mjs Slot / JSON Schema / gọi model / kiểm tra draft
server.mjs         Preview cục bộ và handler AI local
vercel.json        Cấu hình static deployment
```

## Triển khai Vercel

Import repository `zomboXx/UTE-START-UP-2026` vào tài khoản Vercel có quyền; dùng:

- Framework: **Other**.
- Root Directory: thư mục gốc repo.
- Build Command: để trống.
- Output Directory: **dist** (đã khai báo trong vercel.json).
- Landing page không cần biến môi trường. AI thật cần Secret `POOL_API_KEY` ở Production; không đưa key vào client. Handler API đã có trong repo.

Landing là HTML/CSS/JS tĩnh; AI dùng Vercel Function `/api/plans` (Android tương thích `/v1/plans`). `server.mjs` phục vụ xem và gọi AI khi chạy local. Không thêm file APK vào `dist` hay Git. [Tài liệu Vercel](https://vercel.com/docs/builds/configure-a-build).

Đã deploy sau khi người dùng cho phép: project `brain10-ute-startup2026`, repo GitHub nối với Vercel, domain công khai đã kiểm tra từ phiên không đăng nhập. Vercel Authentication được tắt riêng cho project website công khai này.

## Bản tải

`dist/release.json` mặc định có `downloadUrl: null`, nên bản được host hiển thị **Chưa mở tải công khai**. Local server chỉ cung cấp link thử khi tìm thấy APK. Nhãn extension là chưa có bản phát hành.

Khi sẵn sàng phát hành:

1. Kiểm chứng bản Android, chuẩn bị ghi chú phiên bản và chữ ký phù hợp.
2. Upload APK dưới dạng GitHub Release asset ở repo app hoặc repo phát hành.
3. Cập nhật `version`, `channel`, `androidMinimum`, `bytes`, `sha256`, `downloadUrl`, `deviceTested` cho đúng file.
4. Cập nhật nội dung/nhãn trong index.html cùng phiên bản; hiện bản site đầu dùng nội dung 0.1.1 cố định.
5. Deploy website. Link tải được cho phép là HTTPS GitHub Releases dưới tài khoản `zomboXx`; khi đổi nơi lưu file, cập nhật kiểm tra URL tại site.js.

GitHub chặn file trên 100 MiB trong Git; bản APK debug hiện khoảng 163 MiB, phù hợp đặt ở Releases thay vì source. [GitHub: large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## Nội dung & giới hạn

- Android là sản phẩm chính; extension là tùy chọn.
- Ảnh màn Hôm nay lấy trực tiếp từ Android Emulator (Android 13 / API 33). Các hình minh họa khác có nhãn; chưa coi emulator là kiểm chứng trên điện thoại vật lý.
- Không có số người dùng, lời chứng thực hay lời hứa hiệu quả được dựng lên.
- Screen time đã kiểm tra trên emulator khi chưa cấp và sau khi cấp Usage Access; chọn ảnh hệ thống đã qua kiểm tra native. Focus chưa khóa ứng dụng; GPT và nhóm thật chưa tích hợp.
- Không có form thu thập thông tin, analytics, login hoặc cookies do mã website đặt. Font được self-host; hosting có thể có log truy cập.
- Chưa có tên/ảnh cá nhân và thông tin liên hệ được xác nhận của các thành viên, nên phần đội ngũ giới thiệu vai trò.

## Kiểm tra

`npm run check` kiểm tra cú pháp JavaScript. `npm ci` và `npm test` chạy 10 bài kiểm tra trình duyệt qua Playwright / Microsoft Edge cho trang giới thiệu, bản trải nghiệm và widget mô phỏng. Có thể dùng `BRAIN10_TEST_URL` để chạy cùng bộ kiểm tra với website đã deploy. Các ảnh QA trong `screenshots/` không đưa vào Git. Xem [DEMO.md](DEMO.md) để biết phạm vi và giới hạn bản web.

Logo/wordmark mới do nhóm cung cấp được lưu nguyên bản tại `dist/assets/brand-source.png`. SVG viewport hiển thị icon và tên trên header, footer, favicon, giao diện app và màn hình chính mô phỏng. `/try/?view=launcher` mở trực tiếp màn hình chính với hai widget tương tác; đây không phải widget cài lên thiết bị thật.

Font Plus Jakarta Sans: Google Fonts, SIL Open Font License; xem `dist/assets/OFL-Jakarta.txt`. Repo chưa được gán giấy phép mã nguồn thay mặt chủ sở hữu.

## AI beta 0.6.0 — trạng thái 23/10/2026

Key mới đã được kiểm tra với PoolAI; web local có luồng AI thật từ nhập lịch đến xác nhận. `npm run test:server` có 3 test handler và chuyển đổi draft, không gọi model. `scripts/smoke-ai-live.mjs --run-live` mới gọi thật và có sử dụng credit.

Tự thêm key lên đúng project/team Vercel bị HTTP 402 `resource_creation_blocked`: team vượt fair-use limits. Chủ tài khoản cũng xác nhận bị chặn trong dashboard. Vì vậy chưa cấu hình Secret và chưa xác nhận deploy bản AI lên domain công khai. Không tự đổi gói/thanh toán hoặc tạo project khác để lách giới hạn. Xem `../../docs/BRAIN10_AI_BETA_06.md` trong workspace để chạy local và chuyển sang public khi team được mở chặn.

Bản AI thật cần mã beta riêng của nhóm, khác key PoolAI. Chạy `node scripts/prepare-ai-beta.mjs` với environment key để tạo file riêng ngoài repo website. Chỉ dữ liệu lập lịch được gửi khi người dùng chủ động chọn tạo kế hoạch; tên/sinh nhật/ảnh/nhật ký/screen time không có trong payload.
