export function bindControls(handlers) {
  const q = (id) => document.getElementById(id);

  q('add-rect').addEventListener('click', handlers.addRect);
  q('add-circle').addEventListener('click', handlers.addCircle);
  q('add-line').addEventListener('click', handlers.addLine);

  q('undo-btn').addEventListener('click', handlers.undo);
  q('redo-btn').addEventListener('click', handlers.redo);

  q('ref-input').addEventListener('change', (event) => handlers.loadImage(event, 'image-ref'));
  q('user-input').addEventListener('change', (event) => handlers.loadImage(event, 'image-user'));
  q('active-image').addEventListener('change', (event) => handlers.setActiveImage(event.target.value));
  q('opacity-slider').addEventListener('input', () => handlers.updateImageStyle());
  q('brightness-slider').addEventListener('input', () => handlers.updateImageStyle());
  q('contrast-slider').addEventListener('input', () => handlers.updateImageStyle());
  q('reset-image-style').addEventListener('click', handlers.resetImageStyle);
  q('toggle-grid').addEventListener('click', handlers.toggleGrid);
  q('nudge-up').addEventListener('click', () => handlers.nudgeImage(0, -1));
  q('nudge-down').addEventListener('click', () => handlers.nudgeImage(0, 1));
  q('nudge-left').addEventListener('click', () => handlers.nudgeImage(-1, 0));
  q('nudge-right').addEventListener('click', () => handlers.nudgeImage(1, 0));

  q('save-project').addEventListener('click', handlers.saveProject);
  q('load-project').addEventListener('click', handlers.loadProject);
  q('delete-project').addEventListener('click', handlers.deleteProject);

  return {
    getProjectName: () => q('project-name').value.trim(),
    getProjectId: () => q('projects-list').value,
    getActiveImage: () => q('active-image').value,
    isLinkedMode: () => q('link-images').checked,
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
    setProjects: (projects) => {
      const list = q('projects-list');
      list.innerHTML = '';
      for (const project of projects) {
        const opt = document.createElement('option');
        opt.value = project.id;
        opt.textContent = `${project.name} (${new Date(project.updatedAt).toLocaleString()})`;
        list.appendChild(opt);
      }
    },
  };
}
