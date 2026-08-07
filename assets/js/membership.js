// Membership page only: alternate/regular personal-training tab toggle
const tabAlt = document.getElementById('tabAlt');
const tabReg = document.getElementById('tabReg');
const panelAlt = document.getElementById('panelAlt');
const panelReg = document.getElementById('panelReg');
tabAlt.addEventListener('click', () => {
  tabAlt.classList.add('active'); tabReg.classList.remove('active');
  panelAlt.classList.add('active'); panelReg.classList.remove('active');
});
tabReg.addEventListener('click', () => {
  tabReg.classList.add('active'); tabAlt.classList.remove('active');
  panelReg.classList.add('active'); panelAlt.classList.remove('active');
});
