const paths={arrow:'M5 12h14m-5-5 5 5-5 5',down:'M12 5v14m-5-5 5 5 5-5',phone:'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 16h4',android:'m7 5-2-3m12 3 2-3M4 11a8 8 0 0 1 16 0ZM4 11v8h16v-8M8 19v3m8-3v3M1 12v5m22-5v5M8 8h.01M16 8h.01',leaf:'M20 4C9 1 2 8 6 15s15 3 14-11ZM4 21 15 10',focus:'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5m-5 0 8-8m-4 0h4v4',lock:'M6 10h12v11H6Zm2 0V6a4 4 0 0 1 8 0v4m-4 5v2',check:'m5 12 4 4L19 6',sun:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',chart:'M4 3v18h17M8 15v2m5-8v8m5-12v12',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 .13a4 4 0 0 1 0 7.75',external:'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',code:'m8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 18',compass:'m16 8-3 5-5 3 3-5ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',extension:'M9 3h6v4a3 3 0 1 1 4 4h3v10h-8v-3a3 3 0 1 0-4 0v3H2V11h3a3 3 0 1 0 4-4Z',clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',info:'M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',menu:'M4 7h16M4 12h16M4 17h16'};
document.querySelectorAll('[data-icon]').forEach(el=>{const name=el.dataset.icon;el.innerHTML=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;});
const menu=document.getElementById('mobile-menu'),toggle=document.querySelector('.menu-toggle');
function closeMenu(){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Mở menu');}
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';menu.hidden=open;toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?'Mở menu':'Đóng menu');});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
document.querySelectorAll('[data-dialog]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.dialog).showModal()));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
let timer;
function notice(text){const el=document.getElementById('notice');el.textContent=text;el.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('visible'),3500);}
document.getElementById('copy-hash').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(document.getElementById('hash-value').textContent);notice('Đã sao chép mã SHA-256.');}catch{notice('Bạn có thể chọn và sao chép mã hiển thị bên dưới.');}});
const download=document.getElementById('android-download');
download.addEventListener('click',event=>{if(download.getAttribute('aria-disabled')==='true')event.preventDefault();});
fetch('/release.json').then(response=>{if(!response.ok)throw new Error('Release unavailable');return response.json();}).then(release=>{
  document.getElementById('apk-size').textContent=`${Math.round(release.bytes/1048576)} MiB`;
  if(/^[a-f0-9]{64}$/i.test(release.sha256))document.getElementById('hash-value').textContent=release.sha256;
  if(!release.downloadUrl)return;
  const url=new URL(release.downloadUrl,location.origin);
  const local=release.localPreview===true&&url.origin===location.origin&&url.pathname.startsWith('/downloads/');
  const github=url.protocol==='https:'&&url.hostname==='github.com'&&url.pathname.startsWith('/zomboXx/')&&url.pathname.includes('/releases/download/');
  if(!local&&!github)return;
  download.href=url.href;download.classList.remove('disabled');download.removeAttribute('aria-disabled');
  download.innerHTML='Tải APK thử nghiệm <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths.download+'"/></svg>';
  document.getElementById('release-note').textContent=local?'Bản xem local: tải APK nội bộ từ máy này. Chưa kiểm chứng trên điện thoại thật.':'Bản thử nội bộ, chưa phải bản ổn định. Đọc thông tin bản cài trước khi sử dụng.';
}).catch(()=>{document.getElementById('release-note').textContent='Chưa tải được thông tin bản phát hành. Vui lòng quay lại sau.';});
