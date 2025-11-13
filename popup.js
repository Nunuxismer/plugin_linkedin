import {
  addProfileToList,
  buildProfileId,
  createList,
  findListContainingProfile,
  getLists,
  removeProfileFromList
} from './storage.js';

let currentProfile = null;
let currentList = null;

const profileNameEl = document.getElementById('profile-name');
const profileStatusEl = document.getElementById('profile-status');
const addSection = document.getElementById('add-section');
const removeSection = document.getElementById('remove-section');
const addForm = document.getElementById('add-form');
const listSelect = document.getElementById('list-select');
const showAddFormBtn = document.getElementById('show-add-form');
const confirmAddBtn = document.getElementById('confirm-add');
const toggleCreateFormBtn = document.getElementById('toggle-create-form');
const createSection = document.getElementById('create-section');
const createListForm = document.getElementById('create-list-form');
const cancelCreateBtn = document.getElementById('cancel-create');
const removeBtn = document.getElementById('remove-from-list');
const currentListNameEl = document.getElementById('current-list-name');
const openListsBtn = document.getElementById('open-lists');
const errorMessageEl = document.getElementById('error-message');
const extension = globalThis.chrome;

function show(element) {
  element.classList.remove('hidden');
}

function hide(element) {
  element.classList.add('hidden');
}

function showError(message) {
  errorMessageEl.textContent = message;
  errorMessageEl.classList.remove('hidden');
}

function ensureExtensionApi() {
  if (!extension || !extension.tabs) {
    showError("Les APIs Chrome ne sont pas disponibles dans ce contexte.");
    hide(addSection);
    hide(removeSection);
    return false;
  }
  return true;
}

async function loadProfileInfo() {
  if (!ensureExtensionApi()) {
    return;
  }
  const [tab] = await extension.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('linkedin.com/in/')) {
    profileStatusEl.textContent = "Ouvrez un profil LinkedIn pour utiliser l'extension.";
    hide(addSection);
    hide(removeSection);
    return;
  }

  try {
    const response = await extension.tabs.sendMessage(tab.id, { type: 'GET_PROFILE_INFO' });
    currentProfile = response?.profile;
    if (!currentProfile) {
      throw new Error('Impossible de récupérer les informations du profil');
    }
    profileNameEl.textContent = currentProfile.fullName || 'Profil LinkedIn';
    profileStatusEl.textContent = 'Chargement de l’état du profil…';

    await refreshLists();
  } catch (error) {
    showError(error.message);
  }
}

async function refreshLists() {
  const lists = await getLists();
  listSelect.innerHTML = '';
  lists.forEach((list) => {
    const option = document.createElement('option');
    option.value = list.id;
    option.textContent = `${list.name} (${list.profiles.length})`;
    listSelect.appendChild(option);
  });

  if (!lists.length) {
    listSelect.innerHTML = '<option value="" disabled selected>Aucune liste</option>';
    confirmAddBtn.disabled = true;
  } else {
    confirmAddBtn.disabled = false;
  }

  if (currentProfile) {
    const profileId = buildProfileId(currentProfile);
    currentList = await findListContainingProfile(profileId);
    if (currentList) {
      profileStatusEl.textContent = `Ce profil est dans la liste « ${currentList.name} »`;
      currentListNameEl.textContent = currentList.name;
      show(removeSection);
      hide(addSection);
    } else {
      profileStatusEl.textContent = 'Ce profil n’est dans aucune liste.';
      show(addSection);
      hide(removeSection);
    }
  }
}

async function handleAddProfile() {
  const listId = listSelect.value;
  if (!listId || !currentProfile) return;
  const profileToStore = {
    ...currentProfile,
    id: buildProfileId(currentProfile),
    dateAdded: new Date().toISOString()
  };
  await addProfileToList(listId, profileToStore);
  await refreshLists();
}

async function handleRemoveProfile() {
  if (!currentList || !currentProfile) return;
  await removeProfileFromList(currentList.id, buildProfileId(currentProfile));
  await refreshLists();
}

function toggleCreateSection(showSection) {
  if (showSection) {
    show(createSection);
  } else {
    hide(createSection);
  }
}

function toggleAddForm() {
  addForm.classList.toggle('hidden');
}

async function handleCreateList(event) {
  event.preventDefault();
  const name = document.getElementById('new-list-name').value.trim();
  const description = document.getElementById('new-list-description').value.trim();
  const color = document.getElementById('new-list-color').value;

  if (!name) {
    showError('Le nom de la liste est obligatoire');
    return;
  }

  const newList = await createList({ name, description, color });
  if (currentProfile) {
    await addProfileToList(newList.id, {
      ...currentProfile,
      id: buildProfileId(currentProfile),
      dateAdded: new Date().toISOString()
    });
  }

  createListForm.reset();
  toggleCreateSection(false);
  await refreshLists();
}

function openListsPage() {
  if (!ensureExtensionApi()) {
    return;
  }
  const url = extension.runtime.getURL('lists.html');
  extension.tabs.create({ url });
}

showAddFormBtn.addEventListener('click', toggleAddForm);
confirmAddBtn.addEventListener('click', handleAddProfile);
toggleCreateFormBtn.addEventListener('click', () => toggleCreateSection(true));
cancelCreateBtn.addEventListener('click', () => toggleCreateSection(false));
createListForm.addEventListener('submit', handleCreateList);
removeBtn.addEventListener('click', handleRemoveProfile);
openListsBtn.addEventListener('click', openListsPage);

document.addEventListener('DOMContentLoaded', loadProfileInfo);
