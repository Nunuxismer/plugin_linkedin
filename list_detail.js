import { generateSearchUrl, getListById, removeProfileFromList } from './storage.js';

const titleEl = document.getElementById('detail-title');
const tableBody = document.getElementById('profiles-body');
const searchBtn = document.getElementById('launch-search');
const filterInput = document.getElementById('profile-filter');
const detailCountEl = document.getElementById('detail-count');
const extension = globalThis.chrome;
const extensionAvailable = Boolean(extension && extension.storage);
let currentList = null;
let profileFilter = '';

function getListIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('listId');
}

function renderProfiles() {
  tableBody.innerHTML = '';
  const profiles = (currentList?.profiles || []).filter((profile) => {
    if (!profileFilter) return true;
    const haystack = `${profile.fullName || ''} ${profile.headline || ''} ${profile.slug || ''}`.toLowerCase();
    return haystack.includes(profileFilter);
  });

  if (!profiles.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = profileFilter
      ? 'Aucun profil ne correspond à votre filtre.'
      : 'Aucun profil enregistré.';
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  profiles.forEach((profile) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const link = document.createElement('a');
    link.href = profile.profileUrl;
    link.textContent = profile.fullName || profile.slug || 'Profil LinkedIn';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    nameCell.appendChild(link);

    const headlineCell = document.createElement('td');
    headlineCell.textContent = profile.headline || '';

    const dateCell = document.createElement('td');
    dateCell.textContent = profile.dateAdded
      ? new Date(profile.dateAdded).toLocaleDateString()
      : '';

    const actionCell = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Retirer';
    removeBtn.className = 'link danger';
    removeBtn.addEventListener('click', async () => {
      await removeProfileFromList(currentList.id, profile.id);
      await loadList();
    });
    actionCell.appendChild(removeBtn);

    row.appendChild(nameCell);
    row.appendChild(headlineCell);
    row.appendChild(dateCell);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });
}

async function loadList() {
  if (!extensionAvailable) {
    titleEl.textContent = 'Les APIs Chrome ne sont pas disponibles.';
    return;
  }
  const listId = getListIdFromUrl();
  if (!listId) {
    titleEl.textContent = 'Liste introuvable';
    return;
  }
  currentList = await getListById(listId);
  if (!currentList) {
    titleEl.textContent = 'Liste introuvable';
    return;
  }
  titleEl.textContent = currentList.name;
  detailCountEl.textContent = `${currentList.profiles.length} profil(s)`;
  renderProfiles();
}

searchBtn.addEventListener('click', () => {
  if (!currentList || !extensionAvailable || !extension.tabs) return;
  const url = generateSearchUrl(currentList.profiles);
  extension.tabs.create({ url });
});

filterInput.addEventListener('input', (event) => {
  profileFilter = event.target.value.trim().toLowerCase();
  renderProfiles();
});

document.addEventListener('DOMContentLoaded', loadList);
