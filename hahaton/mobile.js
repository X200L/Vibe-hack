// mobile.js
export default function setupMobileControls(keys) {
  const up = document.querySelector('.dpad-up');
  const down = document.querySelector('.dpad-down');
  const left = document.querySelector('.dpad-left');
  const right = document.querySelector('.dpad-right');

  const setKey = (key, value) => (e) => {
    e.preventDefault();
    keys[key] = value;
  };

  up.addEventListener('touchstart', setKey('up', true));
  up.addEventListener('touchend', setKey('up', false));

  down.addEventListener('touchstart', setKey('down', true));
  down.addEventListener('touchend', setKey('down', false));

  left.addEventListener('touchstart', setKey('left', true));
  left.addEventListener('touchend', setKey('left', false));

  right.addEventListener('touchstart', setKey('right', true));
  right.addEventListener('touchend', setKey('right', false));
}
