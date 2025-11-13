const STORAGE_KEY = 'favoriteLists';

async function getStorage() {
  const data = await chrome.storage.local.get({ [STORAGE_KEY]: [] });
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function saveStorage(lists) {
  await chrome.storage.local.set({ [STORAGE_KEY]: lists });
}

export async function getLists() {
  return await getStorage();
}

export async function getListById(id) {
  const lists = await getStorage();
  return lists.find((list) => list.id === id) || null;
}

export async function createList({ name, description = '', color = '' }) {
  const lists = await getStorage();
  const newList = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description.trim(),
    color: color,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profiles: []
  };
  lists.push(newList);
  await saveStorage(lists);
  return newList;
}

export async function renameList(id, newName) {
  const lists = await getStorage();
  const list = lists.find((l) => l.id === id);
  if (!list) {
    throw new Error('Liste introuvable');
  }
  list.name = newName.trim();
  list.updatedAt = new Date().toISOString();
  await saveStorage(lists);
  return list;
}

export async function deleteList(id) {
  const lists = await getStorage();
  const filtered = lists.filter((list) => list.id !== id);
  await saveStorage(filtered);
}

export async function addProfileToList(listId, profile) {
  const lists = await getStorage();
  const targetList = lists.find((list) => list.id === listId);
  if (!targetList) {
    throw new Error('Liste introuvable');
  }
  const exists = targetList.profiles.some((p) => p.id === profile.id);
  if (!exists) {
    targetList.profiles.push(profile);
    targetList.updatedAt = new Date().toISOString();
    await saveStorage(lists);
  }
  return targetList;
}

export async function removeProfileFromList(listId, profileId) {
  const lists = await getStorage();
  const targetList = lists.find((list) => list.id === listId);
  if (!targetList) {
    throw new Error('Liste introuvable');
  }
  targetList.profiles = targetList.profiles.filter((profile) => profile.id !== profileId);
  targetList.updatedAt = new Date().toISOString();
  await saveStorage(lists);
  return targetList;
}

export async function findListContainingProfile(profileId) {
  const lists = await getStorage();
  return lists.find((list) => list.profiles.some((profile) => profile.id === profileId)) || null;
}

export function generateSearchUrl(profiles) {
  const memberIds = profiles.map((profile) => profile.memberId).filter(Boolean);
  if (memberIds.length) {
    const fromMember = encodeURIComponent(JSON.stringify(memberIds));
    return `https://www.linkedin.com/search/results/content/?origin=FACETED_SEARCH&sortBy=%22date_posted%22&fromMember=${fromMember}`;
  }
  if (!profiles.length) {
    return 'https://www.linkedin.com/search/results/people/';
  }
  const keywords = profiles
    .map((profile) => `"${encodeURIComponent(profile.fullName || profile.slug || profile.profileUrl)}"`)
    .join('%20OR%20');
  return `https://www.linkedin.com/search/results/people/?keywords=${keywords}`;
}

export function buildProfileId({ memberId, slug, profileUrl }) {
  if (memberId) return memberId;
  if (slug) return slug;
  return profileUrl;
}
