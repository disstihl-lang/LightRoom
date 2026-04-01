export function toggleSelection(state, id, additive) {
  if (!additive) {
    state.selectedIds = [id];
    return;
  }
  if (state.selectedIds.includes(id)) {
    state.selectedIds = state.selectedIds.filter((item) => item !== id);
  } else {
    state.selectedIds = [...state.selectedIds, id];
  }
}

export function clearSelection(state) {
  state.selectedIds = [];
}
