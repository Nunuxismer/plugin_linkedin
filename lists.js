import {
  createList,
  deleteList,
  generateSearchUrl,
  getLists,
  renameList
} from './storage.js';

const listsContainer = document.getElementById('lists-container');
const template = document.getElementById('list-card-template');
const openCreateBtn = document.getElementById('open-create');
const closeCreateBtn = document.getElementById('close-create');
const createPanel = document.getElementById('create-panel');
const createForm = document.getElementById('page-create-form');
const listFilterInput = document.getElementById('list-filter');
const extension = globalThis.chrome;
const extensionAvailable = Boolean(extension && extension.storage);
let currentFilter = '';

function toggleCreatePanel(show) {
  createPanel.classList.toggle('hidden', !show);
}

function buildListCard(list) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector('.list-name').textContent = list.name;
  node.querySelector('.badge').textContent = `${list.profiles.length} profil(s)`;
  node.querySelector('.list-description').textContent = list.description || 'Aucune description';
  node.querySelector(
    '.list-meta'
  ).textContent = `Créée le ${new Date(list.createdAt).toLocaleDateString()} – mise à jour le ${new Date(
    list.updatedAt
  ).toLocaleDateString()}`;
  const viewBtn = node.querySelector('.view-list');
  viewBtn.addEventListener('click', () => {
    if (!extensionAvailable || !extension.runtime || !extension.tabs) return;
    const url = new URL(extension.runtime.getURL('list_detail.html'));
    url.searchParams.set('listId', list.id);
    extension.tabs.create({ url: url.toString() });
  });

  node.querySelector('.search-list').addEventListener('click', () => {
    if (!extensionAvailable || !extension.tabs) return;
    const url = generateSearchUrl(list.profiles);
    extension.tabs.create({ url });
  });

  node.querySelector('.rename-list').addEventListener('click', async () => {
    const newName = prompt('Nouveau nom de la liste', list.name);
    if (!newName) return;
    await renameList(list.id, newName);
    await renderLists();
  });

  node.querySelector('.delete-list').addEventListener('click', async () => {
    const confirmed = confirm('Supprimer cette liste ?');
    if (!confirmed) return;
    await deleteList(list.id);
    await renderLists();
  });

  return node;
}

async function renderLists() {
  if (!extensionAvailable) {
    listsContainer.innerHTML = '';
    const message = document.createElement('p');
    message.className = 'muted';
    message.textContent = 'Les APIs Chrome ne sont pas disponibles dans ce contexte.';
    listsContainer.appendChild(message);
    return;
  }
  const lists = await getLists();
  listsContainer.innerHTML = '';
  const filteredLists = lists.filter((list) => {
    if (!currentFilter) return true;
    const haystack = `${list.name} ${list.description || ''}`.toLowerCase();
    return haystack.includes(currentFilter);
  });

  if (!filteredLists.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = currentFilter
      ? 'Aucune liste ne correspond à votre recherche.'
      : 'Aucune liste pour le moment.';
    listsContainer.appendChild(empty);
    return;
  }
  filteredLists.forEach((list) => {
    listsContainer.appendChild(buildListCard(list));
  });
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!extensionAvailable) return;
  const name = document.getElementById('page-list-name').value.trim();
  const description = document.getElementById('page-list-description').value.trim();
  const color = document.getElementById('page-list-color').value;
  if (!name) return;
  await createList({ name, description, color });
  createForm.reset();
  toggleCreatePanel(false);
  await renderLists();
});

openCreateBtn.addEventListener('click', () => toggleCreatePanel(true));
closeCreateBtn.addEventListener('click', () => toggleCreatePanel(false));
listFilterInput.addEventListener('input', (event) => {
  currentFilter = event.target.value.trim().toLowerCase();
  renderLists();
});

document.addEventListener('DOMContentLoaded', renderLists);
