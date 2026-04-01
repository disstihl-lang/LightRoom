export function createCanvas(root) {
  const stage = new Konva.Stage({
    container: root,
    width: root.clientWidth,
    height: root.clientHeight,
    draggable: true,
  });

  const layer = new Konva.Layer();
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
  });

  return { stage, layer, transformer };
}

export function hydrateNodeFromObject(node, object) {
  node.id(object.id);
  node.x(object.x);
  node.y(object.y);
  node.rotation(object.rotation ?? 0);
  node.scaleX(object.scale?.x ?? 1);
  node.scaleY(object.scale?.y ?? 1);
}
