import { formatVnd, loadPlanCatalog } from '../plan-catalog.js';

const page = new URL(location.href);
const requestedPlan = page.searchParams.get('plan');
const status = document.getElementById('checkout-status');

function byId(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  byId(id).textContent = text;
}

function showCheckout(plan) {
  const companyPlan = plan.id === 'organization';
  const free = plan.monthlyAmount === 0;
  const form = byId('checkout-form');
  const seats = byId('checkout-seats');
  const company = byId('checkout-company');
  const name = byId('checkout-name');
  const email = byId('checkout-email');
  const edit = byId('checkout-edit');
  const review = byId('checkout-review');
  const payButton = byId('checkout-pay');
  const payNotice = byId('checkout-pay-notice');
  const payStatus = free ? 'Gói Starter miễn phí.' : 'Thanh toán online chưa mở. Bạn có thể xem lại thông tin đơn đăng ký.';

  setText('checkout-plan', plan.name);
  setText('checkout-plan-audience', plan.audience ?? 'Gói miễn phí');
  setText('checkout-price', free ? 'Miễn phí' : [plan.pricePrefix, formatVnd(plan.monthlyAmount), plan.priceUnit].filter(Boolean).join(' '));
  setText('checkout-cycle-label', free ? 'Loại gói' : 'Chu kỳ');
  setText('checkout-cycle', free ? 'Miễn phí' : 'Hàng tháng');
  setText('checkout-payment-status', payStatus);

  byId('checkout-org').hidden = !companyPlan;
  byId('checkout-quantity-row').hidden = !companyPlan;
  byId('checkout-price-note').hidden = !companyPlan;
  byId('review-company-row').hidden = !companyPlan;
  byId('checkout-get-app').hidden = !free;
  payButton.hidden = free;
  company.disabled = !companyPlan;
  company.required = companyPlan;
  seats.disabled = !companyPlan;
  seats.required = companyPlan;

  function updateOrder() {
    const quantity = companyPlan ? seats.valueAsNumber : 1;
    const amount = quantity * plan.monthlyAmount;
    const valid = Number.isSafeInteger(quantity) && quantity > 0 && Number.isSafeInteger(amount);
    seats.setCustomValidity(companyPlan && !valid && seats.validity.valid ? 'Hãy nhập số người dùng hợp lệ.' : '');
    setText('checkout-quantity', valid ? quantity.toLocaleString('vi-VN') : '—');
    setText('checkout-total', valid ? (companyPlan ? 'Từ ' : '') + formatVnd(amount) + (free ? '' : ' / tháng') : '—');
  }

  function setReview(show) {
    review.hidden = !show;
    edit.hidden = show;
    payNotice.hidden = true;
    (show ? byId('checkout-review-title') : name).focus();
  }

  seats.addEventListener('input', () => {
    seats.setCustomValidity('');
    updateOrder();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    name.value = name.value.trim();
    company.value = company.value.trim();
    if (!form.reportValidity()) return;
    setText('review-name', name.value);
    setText('review-email', email.value);
    setText('review-company', company.value);
    setText('review-next', free ? 'Bạn có thể tải app và bắt đầu với gói Starter.' : 'Kiểm tra lại thông tin liên hệ và tổng tiền trước khi tiếp tục.');
    setReview(true);
  });
  payButton.addEventListener('click', () => {
    payNotice.textContent = 'Thanh toán online chưa mở. Đơn đăng ký chưa được gửi.';
    payNotice.hidden = false;
    payNotice.focus();
  });
  byId('checkout-edit-button').addEventListener('click', () => setReview(false));
  updateOrder();
  status.hidden = true;
  byId('checkout-order').hidden = false;
}

if (!requestedPlan) {
  status.textContent = 'Hãy chọn một gói từ bảng giá để tiếp tục.';
} else {
  loadPlanCatalog(new URL(import.meta.url), '../plans.json').then((plans) => {
    const plan = plans.find((option) => option.id === requestedPlan);
    if (plan) showCheckout(plan);
    else status.textContent = 'Không tìm thấy gói đã chọn. Hãy quay lại bảng giá để chọn gói.';
  }).catch(() => {
    status.textContent = 'Chưa tải được thông tin gói. Vui lòng tải lại trang.';
  });
}
