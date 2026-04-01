const DB_NAME = 'artref_projects_v1';
const DB_VERSION = 1;
const STORE = 'projects';

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txToPromise(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project) {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(project);
  await txToPromise(tx);
}

export async function listProjects() {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readonly');
  const request = tx.objectStore(STORE).getAll();
  const result = await requestToPromise(request);
  await txToPromise(tx);
  return result;
}

export async function getProject(id) {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readonly');
  const request = tx.objectStore(STORE).get(id);
  const project = await requestToPromise(request);
  await txToPromise(tx);
  return project;
}

export async function deleteProject(id) {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await txToPromise(tx);
}
