export function bindControls(handlers) {
  const q = (id) => document.getElementById(id);

  q('add-rect').addEventListener('click', handlers.addRect);
  q('add-circle').addEventListener('click', handlers.addCircle);
  q('add-line').addEventListener('click', handlers.addLine);

  q('undo-btn').addEventListener('click', handlers.undo);
  q('redo-btn').addEventListener('click', handlers.redo);

  q('ref-input').addEventListener('change', (event) => handlers.loadImage(event, 'image-ref'));
  q('user-input').addEventListener('change', (event) => handlers.loadImage(event, 'image-user'));

  q('save-project').addEventListener('click', handlers.saveProject);
  q('load-project').addEventListener('click', handlers.loadProject);
  q('delete-project').addEventListener('click', handlers.deleteProject);

  return {
    getProjectName: () => q('project-name').value.trim(),
    getProjectId: () => q('projects-list').value,
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
