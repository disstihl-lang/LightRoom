function bindHold(id, onTick, step = 1) {
  const el = document.getElementById(id);
  let timer;
  const start = (event) => {
    event.preventDefault();
    onTick(step);
    timer = setInterval(() => onTick(step), 50);
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };

  el.addEventListener('mousedown', start);
  el.addEventListener('touchstart', start, { passive: false });
  window.addEventListener('mouseup', stop);
  window.addEventListener('touchend', stop);
  el.addEventListener('mouseleave', stop);
}

export function bindControls(handlers) {
  const q = (id) => document.getElementById(id);

  q('ref-input').addEventListener('change', (event) => handlers.loadImage(event, 'image-ref'));
  q('user-input').addEventListener('change', (event) => handlers.loadImage(event, 'image-user'));
  q('clear-all').addEventListener('click', handlers.clearAll);
  q('toggle-grid').addEventListener('click', handlers.toggleGrid);
  q('toggle-link').addEventListener('click', handlers.toggleLink);
  q('toggle-user-visibility').addEventListener('click', handlers.toggleUserVisibility);
  q('reset-state').addEventListener('click', handlers.resetState);

  q('target-ref').addEventListener('click', () => handlers.setActiveImage('image-ref'));
  q('target-user').addEventListener('click', () => handlers.setActiveImage('image-user'));
  q('target-none').addEventListener('click', () => handlers.setActiveImage('none'));

  q('opacity-slider').addEventListener('input', handlers.updateImageStyle);
  q('brightness-slider').addEventListener('input', handlers.updateImageStyle);
  q('contrast-slider').addEventListener('input', handlers.updateImageStyle);

  bindHold('nudge-up', () => handlers.nudgeImage(0, -1));
  bindHold('nudge-down', () => handlers.nudgeImage(0, 1));
  bindHold('nudge-left', () => handlers.nudgeImage(-1, 0));
  bindHold('nudge-right', () => handlers.nudgeImage(1, 0));
  bindHold('scale-up', () => handlers.scaleImage(1.01));
  bindHold('scale-down', () => handlers.scaleImage(0.99));
  bindHold('rotate-plus', () => handlers.rotateImage(0.8));

  return {
    getImageStyle: () => ({
      opacity: Number(q('opacity-slider').value),
      brightness: Number(q('brightness-slider').value),
      contrast: Number(q('contrast-slider').value),
    }),
    setImageStyle: ({ opacity = 100, brightness = 100, contrast = 100 }) => {
      q('opacity-slider').value = String(opacity);
      q('brightness-slider').value = String(brightness);
      q('contrast-slider').value = String(contrast);
    },
    setActiveMode: (mode) => {
      for (const id of ['target-ref', 'target-user', 'target-none']) {
        q(id).classList.remove('active-ref', 'active-user');
      }
      if (mode === 'image-ref') q('target-ref').classList.add('active-ref');
      if (mode === 'image-user') q('target-user').classList.add('active-user');
    },
    setLinkState: (value) => {
      q('toggle-link').textContent = value ? 'Link: On' : 'Link: Off';
    },
    setUserVisibility: (value) => {
      q('toggle-user-visibility').textContent = value ? '👁 Рисунок' : '🚫 Рисунок';
    },
    setGridState: (value) => {
      q('grid-overlay').style.display = value ? 'block' : 'none';
    },
    setPlaceholderVisible: (show) => {
      q('placeholder').classList.toggle('hidden', !show);
    },
    setUserUploadEnabled: (enabled) => {
      q('user-input').disabled = !enabled;
    },
    setActionEnabled: (enabled) => {
      for (const id of ['nudge-up', 'nudge-down', 'nudge-left', 'nudge-right', 'scale-up', 'scale-down', 'rotate-plus']) {
        q(id).disabled = !enabled;
      }
    },
    setDrawerVisible: (visible) => {
      q('drawer').style.display = visible ? 'block' : 'none';
    },
    setIdleHidden: (hidden) => {
      q('app-root').classList.toggle('ui-hidden', hidden);
    },
  };
}
