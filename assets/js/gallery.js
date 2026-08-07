// Gallery page only: category filters + lightbox
const filterBtns = document.querySelectorAll('.filter-btn');
const items = document.querySelectorAll('.masonry-item');
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    items.forEach(it => {
      it.style.display = (f === 'all' || it.dataset.cat === f) ? '' : 'none';
    });
  });
});

const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbCaption = document.getElementById('lbCaption');
const visibleItems = () => Array.from(items).filter(it => it.style.display !== 'none');
let lbIndex = 0;

function openLightbox(item) {
  const list = visibleItems();
  lbIndex = list.indexOf(item);
  render();
  lightbox.classList.add('open');
}
function render() {
  const list = visibleItems();
  const item = list[lbIndex];
  lbImg.src = item.querySelector('img').src;
  lbCaption.textContent = item.dataset.caption;
}
items.forEach(it => it.addEventListener('click', () => openLightbox(it)));
document.getElementById('lbClose').addEventListener('click', () => lightbox.classList.remove('open'));
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('open'); });
document.getElementById('lbNext').addEventListener('click', () => {
  const list = visibleItems();
  lbIndex = (lbIndex + 1) % list.length;
  render();
});
document.getElementById('lbPrev').addEventListener('click', () => {
  const list = visibleItems();
  lbIndex = (lbIndex - 1 + list.length) % list.length;
  render();
});
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') lightbox.classList.remove('open');
  if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
  if (e.key === 'ArrowLeft') document.getElementById('lbPrev').click();
});
