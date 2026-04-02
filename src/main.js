import { createInitialState, createObject, findObject } from './core/state.js';
import { createHistory, commit, undo as undoHistory, redo as redoHistory } from './core/history.js';
import { createCanvas, hydrateNodeFromObject } from './render/canvas.js';
import { bindControls } from './ui/controls.js';
import { toggleSelection, clearSelection } from './engine/selection.js';
import { saveProject, listProjects, getProject, deleteProject } from './storage/indexedDb.js';

const stageRoot = document.getElementById('stage-root');
const { stage, layer, transformer, gridLayer } = createCanvas(stageRoot);

const imageCache = new Map();
let state = createInitialState();
const history = createHistory(state);
let ui;
let gridVisible = false;

function snapshot() {
  commit(history, state);
}

function serializeAssets() {
  const assets = [];
  for (const object of state.objects) {
    if (object.type === 'image' && object.style?.assetId && imageCache.has(object.style.assetId)) {
      assets.push({ id: object.style.assetId, blob: imageCache.get(object.style.assetId) });
    }
  }
  return assets;
}

function buildNode(object) {
  let node;
  if (object.type === 'image') {
    node = new Konva.Image({
      width: object.style.width,
      height: object.style.height,
      draggable: true,
    });
    const img = new window.Image();
    img.onload = () => {
      node.image(img);
      layer.draw();
    };
    img.src = object.style.src;
  } else if (object.type === 'rect') {
    node = new Konva.Rect({
      width: object.style.width ?? 160,
      height: object.style.height ?? 100,
      fill: object.style.fill ?? '#3b82f6aa',
      stroke: object.style.stroke ?? '#93c5fd',
      strokeWidth: 2,
      draggable: true,
    });
  } else if (object.type === 'circle') {
    node = new Konva.Circle({
      radius: object.style.radius ?? 60,
      fill: object.style.fill ?? '#10b98199',
      stroke: object.style.stroke ?? '#6ee7b7',
      strokeWidth: 2,
      draggable: true,
    });
  } else if (object.type === 'line') {
    node = new Konva.Line({
      points: object.style.points ?? [0, 0, 180, 0],
      stroke: object.style.stroke ?? '#f59e0b',
      strokeWidth: object.style.strokeWidth ?? 4,
      lineCap: 'round',
      draggable: true,
    });
  }

  hydrateNodeFromObject(node, object);
  applyImageStyle(node, object.style);

  node.on('click tap', (event) => {
    event.cancelBubble = true;
    toggleSelection(state, object.id, event.evt.shiftKey);
    render();
  });

  node.on('dragend transformend', () => {
    const obj = findObject(state, object.id);
    if (!obj) return;
    obj.x = node.x();
    obj.y = node.y();
    obj.rotation = node.rotation();
    obj.scale = { x: node.scaleX(), y: node.scaleY() };
    snapshot();
  });

  return node;
}

function applyImageStyle(node, style = {}) {
  if (node.className !== 'Image') return;
  const opacity = Number(style.opacity ?? 100);
  const brightness = Number(style.brightness ?? 100);
  const contrast = Number(style.contrast ?? 100);

  node.opacity(Math.max(0, Math.min(1, opacity / 100)));
  node.filters([Konva.Filters.Brighten, Konva.Filters.Contrast]);
  node.brightness((brightness - 100) / 100);
  node.contrast(contrast - 100);
}

function render() {
  layer.destroyChildren();
  for (const object of state.objects) {
    const node = buildNode(object);
    layer.add(node);
  }

  layer.add(transformer);
  const selectedNodes = state.selectedIds
    .map((id) => layer.findOne(`#${id}`))
    .filter(Boolean);
  transformer.nodes(selectedNodes);

  layer.draw();
}

function addShape(type) {
  const object = createObject(type, { x: 180 + state.objects.length * 10, y: 160 + state.objects.length * 10 });
  state.objects.push(object);
  state.selectedIds = [object.id];
  snapshot();
  render();
}

async function loadImage(event, label) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  const src = URL.createObjectURL(file);
  const bitmap = await createImageBitmap(file);
  const assetId = crypto.randomUUID();
  imageCache.set(assetId, file);

  const existing = state.objects.find((obj) => obj.type === 'image' && obj.style?.label === label);
  if (existing) {
    existing.style = {
      ...existing.style,
      label,
      src,
      assetId,
      width: Math.min(bitmap.width, 700),
      height: Math.min(bitmap.height, 700),
    };
    state.selectedIds = [existing.id];
  } else {
    const object = createObject('image', {
      x: stage.width() / 2,
      y: stage.height() / 2,
      style: {
        label,
        src,
        assetId,
        width: Math.min(bitmap.width, 700),
        height: Math.min(bitmap.height, 700),
        opacity: 100,
        brightness: 100,
        contrast: 100,
      },
    });
    state.objects.push(object);
    state.selectedIds = [object.id];
  }
  snapshot();
  render();
  syncLayerControls();
}

function findImageObject(label) {
  return state.objects.find((obj) => obj.type === 'image' && obj.style?.label === label);
}

function updateImageStyleFromUi() {
  const target = ui.getActiveImage();
  const style = ui.getImageStyle();
  const applyOn = ui.isLinkedMode() ? ['image-ref', 'image-user'] : [target];
  for (const label of applyOn) {
    const object = findImageObject(label);
    if (!object) continue;
    object.style = { ...object.style, ...style };
  }
  snapshot();
  render();
}

function resetImageStyle() {
  ui.setImageStyle({ opacity: 100, brightness: 100, contrast: 100 });
  updateImageStyleFromUi();
}

function syncLayerControls() {
  const object = findImageObject(ui.getActiveImage());
  if (!object) {
    ui.setImageStyle({ opacity: 100, brightness: 100, contrast: 100 });
    return;
  }
  ui.setImageStyle({
    opacity: object.style.opacity ?? 100,
    brightness: object.style.brightness ?? 100,
    contrast: object.style.contrast ?? 100,
  });
}

function nudgeImage(dx, dy) {
  const applyOn = ui.isLinkedMode() ? ['image-ref', 'image-user'] : [ui.getActiveImage()];
  for (const label of applyOn) {
    const object = findImageObject(label);
    if (!object) continue;
    object.x += dx;
    object.y += dy;
  }
  snapshot();
  render();
}

stage.on('click tap', (event) => {
  if (event.target === stage) {
    clearSelection(state);
    render();
  }
});

stage.on('wheel', (event) => {
  event.evt.preventDefault();
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };
  const direction = event.evt.deltaY > 0 ? -1 : 1;
  const newScale = direction > 0 ? oldScale * 1.05 : oldScale / 1.05;
  stage.scale({ x: newScale, y: newScale });
  stage.position({
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  });
  stage.batchDraw();

  state.viewport = { x: stage.x(), y: stage.y(), scale: newScale };
  snapshot();
});

async function refreshProjects(ui) {
  const projects = await listProjects();
  projects.sort((a, b) => b.updatedAt - a.updatedAt);
  ui.setProjects(projects);
}

async function main() {
  ui = bindControls({
    addRect: () => addShape('rect'),
    addCircle: () => addShape('circle'),
    addLine: () => addShape('line'),
    undo: () => {
      const prev = undoHistory(history);
      if (!prev) return;
      state = prev;
      render();
    },
    redo: () => {
      const next = redoHistory(history);
      if (!next) return;
      state = next;
      render();
    },
    loadImage,
    setActiveImage: () => syncLayerControls(),
    updateImageStyle: updateImageStyleFromUi,
    resetImageStyle,
    nudgeImage,
    toggleGrid: () => {
      gridVisible = !gridVisible;
      gridLayer.visible(gridVisible);
      stage.batchDraw();
    },
    saveProject: async () => {
      const name = ui.getProjectName() || 'Untitled';
      const project = {
        id: crypto.randomUUID(),
        name,
        data: structuredClone(state),
        assets: serializeAssets(),
        updatedAt: Date.now(),
      };
      await saveProject(project);
      await refreshProjects(ui);
    },
    loadProject: async () => {
      const id = ui.getProjectId();
      if (!id) return;
      const project = await getProject(id);
      if (!project) return;
      state = structuredClone(project.data);
      for (const asset of project.assets ?? []) {
        imageCache.set(asset.id, asset.blob);
        const obj = state.objects.find((x) => x.style?.assetId === asset.id);
        if (obj) {
          obj.style.src = URL.createObjectURL(asset.blob);
        }
      }
      stage.position({ x: state.viewport.x, y: state.viewport.y });
      stage.scale({ x: state.viewport.scale, y: state.viewport.scale });
      commit(history, state);
      render();
      syncLayerControls();
    },
    deleteProject: async () => {
      const id = ui.getProjectId();
      if (!id) return;
      await deleteProject(id);
      await refreshProjects(ui);
    },
  });

  render();
  syncLayerControls();
  await refreshProjects(ui);
}

main();
