const pillTap    = document.getElementById('pill-tap');
const pillCharge = document.getElementById('pill-charge');
const chargeWrap = document.getElementById('charge-wrap');
const chargeFill = document.getElementById('charge-fill');

export function flashTap() {
  pillTap.classList.add('flash-tap');
  setTimeout(() => pillTap.classList.remove('flash-tap'), 350);
}

export function updateUI(mode, chargeLevel) {
  if (mode === 'charging') {
    pillCharge.classList.add('active-charge');
    chargeWrap.style.opacity = '1';
    chargeFill.style.width   = (chargeLevel * 100) + '%';
  } else {
    pillCharge.classList.remove('active-charge');
    chargeWrap.style.opacity = '0';
  }
}
