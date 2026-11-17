const mascotPanel = document.getElementById('mascot-panel');
if (typeof mascotPanel.hidePopover === 'function') {
  mascotPanel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => mascotPanel.hidePopover());
  });
}
