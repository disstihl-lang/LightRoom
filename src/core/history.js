function cloneState(state) {
  return structuredClone(state);
}

export function createHistory(initialState) {
  return {
    past: [],
    present: cloneState(initialState),
    future: [],
  };
}

export function commit(history, nextState) {
  history.past.push(cloneState(history.present));
  history.present = cloneState(nextState);
  history.future = [];
}

export function undo(history) {
  if (!history.past.length) return null;
  history.future.push(cloneState(history.present));
  history.present = history.past.pop();
  return cloneState(history.present);
}

export function redo(history) {
  if (!history.future.length) return null;
  history.past.push(cloneState(history.present));
  history.present = history.future.pop();
  return cloneState(history.present);
}
