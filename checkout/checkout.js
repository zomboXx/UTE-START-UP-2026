{
  const requestedPlan = new URL(location.href).searchParams.get('plan');
  const loading = document.getElementById('checkout-loading');
  const order = document.getElementById('checkout-order');
  const confirmButton = document.getElementById('checkout-confirm');
  const result = document.getElementById('checkout-result');
  const script = new URL(document.currentScript.src);
  const plansUrl = new URL('../plans.json', script);
  plansUrl.search = script.search;

  if (requestedPlan) {
    fetch(plansUrl).then((response) => {
      if (!response.ok) throw new Error('Plans unavailable');
      return response.json();
    }).then((plans) => {
      const plan = plans.find((option) => option.id === requestedPlan);
      if (!plan) {
        loading.textContent = 'Không tìm thấy gói đã chọn. Hãy quay lại bảng giá để chọn gói.';
        return;
      }
      document.getElementById('checkout-plan').textContent = plan.name;
      document.getElementById('checkout-price').textContent = [plan.pricePrefix, plan.price, plan.priceUnit]
        .filter(Boolean).join(' ');
      confirmButton.addEventListener('click', () => {
        result.textContent = `Đã hoàn tất xác nhận thử gói ${plan.name}.`;
        result.hidden = false;
        confirmButton.hidden = true;
        result.focus();
      });
      loading.hidden = true;
      order.hidden = false;
    }).catch(() => {
      loading.textContent = 'Chưa tải được thông tin gói. Vui lòng tải lại trang.';
    });
  } else {
    loading.textContent = 'Hãy chọn một gói từ bảng giá để thử checkout.';
  }
}
