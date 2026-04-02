export function createCanvas(root) {
  const stage = new Konva.Stage({
    container: root,
    width: root.clientWidth,
    height: root.clientHeight,
    draggable: true,
  });

  const gridLayer = new Konva.Layer({ listening: false, visible: false });
  const layer = new Konva.Layer();
  stage.add(gridLayer);
  stage.add(layer);

  const transformer = new Konva.Transformer({
    rotateEnabled: true,
    enabledAnchors: [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
      'middle-left',
      'middle-right',
      'top-center',
      'bottom-center',
    ],
  });
  layer.add(transformer);

  window.addEventListener('resize', () => {
    stage.width(root.clientWidth);
    stage.height(root.clientHeight);
    drawGrid();
  });

  function drawGrid() {
    gridLayer.destroyChildren();
    const width = stage.width();
    const height = stage.height();
    const step = Math.max(60, Math.floor(width / 10));

    for (let x = 0; x <= width; x += step) {
      gridLayer.add(new Konva.Line({
        points: [x, 0, x, height],
        stroke: 'rgba(255,255,255,0.2)',
        strokeWidth: 1,
      }));
    }

    for (let y = 0; y <= height; y += step) {
      gridLayer.add(new Konva.Line({
        points: [0, y, width, y],
        stroke: 'rgba(255,255,255,0.2)',
        strokeWidth: 1,
      }));
    }
  }

  drawGrid();

  return { stage, layer, transformer, gridLayer, drawGrid };
}

export function hydrateNodeFromObject(node, object) {
  node.id(object.id);
  node.x(object.x);
  node.y(object.y);
  node.rotation(object.rotation ?? 0);
  node.scaleX(object.scale?.x ?? 1);
  node.scaleY(object.scale?.y ?? 1);
}
