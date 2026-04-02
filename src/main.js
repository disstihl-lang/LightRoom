import { createInitialState, createObject } from './core/state.js';
import { createHistory, commit, undo as undoHistory, redo as redoHistory } from './core/history.js';
import { createCanvas, hydrateNodeFromObject } from './render/canvas.js';
import { bindControls } from './ui/controls.js';

const stageRoot = document.getElementById('stage-root');
const { stage, layer } = createCanvas(stageRoot);

let state = createInitialState();
const history = createHistory(state);
let ui;
let linkedMode = false;
let activeImage = 'none';
let userVisible = true;
let gridVisible = false;
let idleTimer;

function snapshot() {
  commit(history, state);
}

function drawSvgGrid() {
  const svg = document.getElementById('grid-overlay');
  const width = stageRoot.clientWidth;
  const height = stageRoot.clientHeight;
  const cols = 6;
  const rows = 6;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = '';
  for (let i = 1; i < cols; i += 1) {
    const x = (width / cols) * i;
    svg.innerHTML += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,255,255,.3)" stroke-width="1"/>`;
  }
  for (let i = 1; i < rows; i += 1) {
    const y = (height / rows) * i;
    svg.innerHTML += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,.3)" stroke-width="1"/>`;
  }
}

function findImage(label) {
  return state.objects.find((obj) => obj.type === 'image' && obj.style?.label === label);
}

function ensureActiveTarget() {
  const ref = findImage('image-ref');
  const user = findImage('image-user');
  if (!ref && !user) {
    activeImage = 'none';
  } else if (user && userVisible) {
    activeImage = 'image-user';
  } else if (ref) {
    activeImage = 'image-ref';
  }
  ui.setActiveMode(activeImage);
  ui.setDrawerVisible(activeImage !== 'none');
  ui.setActionEnabled(activeImage !== 'none');
  ui.setUserUploadEnabled(Boolean(ref));
  ui.setPlaceholderVisible(!ref);
}

function applyImageStyle(node, style = {}) {
  const opacity = Number(style.opacity ?? 100);
  const brightness = Number(style.brightness ?? 100);
  const contrast = Number(style.contrast ?? 100);
  node.opacity(Math.max(0, Math.min(1, opacity / 100)));
  node.filters([Konva.Filters.Brighten, Konva.Filters.Contrast]);
  node.brightness((brightness - 100) / 100);
  node.contrast(contrast - 100);
  node.visible(style.label !== 'image-user' || userVisible);
}

function applyDraggable(node, obj) {
  const canDrag = linkedMode || activeImage === obj.style.label;
  node.draggable(canDrag);
}

function buildNode(obj) {
  const node = new Konva.Image({ width: obj.style.width, height: obj.style.height });
  const img = new window.Image();
  img.onload = () => {
    node.image(img);
    layer.draw();
  };
  img.src = obj.style.src;

  hydrateNodeFromObject(node, obj);
  applyImageStyle(node, obj.style);
  applyDraggable(node, obj);

  node.on('dragmove', () => {
    if (!linkedMode) return;
    const deltaX = node.x() - obj.x;
    const deltaY = node.y() - obj.y;
    for (const peer of state.objects) {
      if (peer.id === obj.id || peer.type !== 'image') continue;
      const peerNode = layer.findOne(`#${peer.id}`);
      if (!peerNode) continue;
      peerNode.x(peerNode.x() + deltaX);
      peerNode.y(peerNode.y() + deltaY);
      peer.x = peerNode.x();
      peer.y = peerNode.y();
    }
  });

  node.on('dragend', () => {
    obj.x = node.x();
    obj.y = node.y();
    snapshot();
  });

  return node;
}

function render() {
  layer.destroyChildren();
  for (const object of state.objects) {
    if (object.type !== 'image') continue;
    layer.add(buildNode(object));
  }
  layer.draw();
  syncLayerControls();
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 2200;
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  return { blob, width, height, src: URL.createObjectURL(blob) };
}

async function loadImage(event, label) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  if (label === 'image-user' && !findImage('image-ref')) return;

  const compressed = await compressImage(file);
  const fitScale = Math.min(stage.width() * 0.9 / compressed.width, stage.height() * 0.9 / compressed.height, 1);

  const existing = findImage(label);
  if (existing) {
    existing.style = {
      ...existing.style,
      src: compressed.src,
      width: compressed.width,
      height: compressed.height,
    };
    existing.scale = { x: fitScale, y: fitScale };
    existing.x = stage.width() / 2 - (compressed.width * fitScale) / 2;
    existing.y = stage.height() / 2 - (compressed.height * fitScale) / 2;
    existing.rotation = 0;
  } else {
    state.objects.push(createObject('image', {
      x: stage.width() / 2 - (compressed.width * fitScale) / 2,
      y: stage.height() / 2 - (compressed.height * fitScale) / 2,
      scale: { x: fitScale, y: fitScale },
      style: {
        label,
        src: compressed.src,
        width: compressed.width,
        height: compressed.height,
        opacity: 100,
        brightness: 100,
        contrast: 100,
      },
    }));
  }

  ensureActiveTarget();
  snapshot();
  render();
}

function getTargets() {
  if (linkedMode) return ['image-ref', 'image-user'];
  return [activeImage];
}

function transformTargets(transformer) {
  for (const label of getTargets()) {
    const obj = findImage(label);
    if (!obj) continue;
    transformer(obj);
  }
  snapshot();
  render();
}

function nudgeImage(dx, dy) {
  transformTargets((obj) => {
    obj.x += dx;
    obj.y += dy;
  });
}

function scaleImage(factor) {
  transformTargets((obj) => {
    obj.scale.x *= factor;
    obj.scale.y *= factor;
  });
}

function rotateImage(delta) {
  transformTargets((obj) => {
    obj.rotation += delta;
  });
}

function updateImageStyle() {
  const patch = ui.getImageStyle();
  transformTargets((obj) => {
    obj.style = { ...obj.style, ...patch };
  });
}

function syncLayerControls() {
  const obj = findImage(activeImage);
  ui.setLinkState(linkedMode);
  ui.setGridState(gridVisible);
  ui.setUserVisibility(userVisible);
  if (!obj) {
    ui.setImageStyle({ opacity: 100, brightness: 100, contrast: 100 });
    return;
  }
  ui.setImageStyle(obj.style);
}

function resetState() {
  for (const obj of state.objects) {
    if (obj.type !== 'image') continue;
    const fitScale = Math.min(stage.width() * 0.9 / obj.style.width, stage.height() * 0.9 / obj.style.height, 1);
    obj.scale = { x: fitScale, y: fitScale };
    obj.rotation = 0;
    obj.x = stage.width() / 2 - (obj.style.width * fitScale) / 2;
    obj.y = stage.height() / 2 - (obj.style.height * fitScale) / 2;
    obj.style.opacity = 100;
    obj.style.brightness = 100;
    obj.style.contrast = 100;
  }
  snapshot();
  render();
}

function clearAll() {
  state.objects = [];
  activeImage = 'none';
  userVisible = true;
  snapshot();
  ensureActiveTarget();
  render();
}

function bindIdle() {
  const resetIdle = () => {
    ui.setIdleHidden(false);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => ui.setIdleHidden(true), 6000);
  };
  for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown']) {
    window.addEventListener(ev, resetIdle, { passive: false });
  }
  resetIdle();
}

function bindPinchGesture() {
  let baseDist = 0;
  let baseScale = new Map();

  stage.getContent().addEventListener('touchmove', (event) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();

    const [a, b] = event.touches;
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    const dist = Math.hypot(dx, dy);

    if (!baseDist) {
      baseDist = dist;
      baseScale = new Map(getTargets().map((label) => [label, findImage(label)?.scale.x ?? 1]));
      return;
    }

    const ratio = dist / baseDist;
    for (const label of getTargets()) {
      const obj = findImage(label);
      if (!obj) continue;
      const start = baseScale.get(label) ?? 1;
      obj.scale = { x: Math.max(0.05, start * ratio), y: Math.max(0.05, start * ratio) };
    }
    render();
  }, { passive: false });

  stage.getContent().addEventListener('touchend', () => {
    if (!baseDist) return;
    baseDist = 0;
    snapshot();
  });
}

function setActiveImage(label) {
  activeImage = label;
  ensureActiveTarget();
  render();
}

function main() {
  ui = bindControls({
    loadImage,
    clearAll,
    toggleGrid: () => {
      gridVisible = !gridVisible;
      ui.setGridState(gridVisible);
    },
    toggleLink: () => {
      linkedMode = !linkedMode;
      render();
    },
    toggleUserVisibility: () => {
      userVisible = !userVisible;
      ensureActiveTarget();
      render();
    },
    resetState,
    setActiveImage,
    updateImageStyle,
    nudgeImage,
    scaleImage,
    rotateImage,
  });

  drawSvgGrid();
  window.addEventListener('resize', drawSvgGrid);
  bindPinchGesture();
  bindIdle();

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      const prev = undoHistory(history);
      if (!prev) return;
      state = prev;
      ensureActiveTarget();
      render();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      const next = redoHistory(history);
      if (!next) return;
      state = next;
      ensureActiveTarget();
      render();
    }
  });

  ensureActiveTarget();
  render();
}

main();
