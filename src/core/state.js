export function createInitialState() {
  return {
    objects: [],
    selectedIds: [],
    viewport: { x: 0, y: 0, scale: 1 },
  };
}

export function createObject(type, patch = {}) {
  const base = {
    id: crypto.randomUUID(),
    type,
    x: 120,
    y: 120,
    scale: { x: 1, y: 1 },
    rotation: 0,
    style: {},
  };
  return { ...base, ...patch };
}

export function findObject(state, id) {
  return state.objects.find((obj) => obj.id === id);
}
