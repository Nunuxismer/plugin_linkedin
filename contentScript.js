// Content script de l'extension LinkedIn Favorites Manager
// G\u00e8re plusieurs listes de profils favoris et int\u00e8gre un panneau d'acc\u00e8s rapide.

(function() {
  // R\u00e9cup\u00e8re toutes les listes depuis le stockage
  function getLists(cb) {
    chrome.storage.local.get({ lists: [] }, res => cb(res.lists));
  }

  // Sauvegarde les listes dans le stockage
  function saveLists(lists, cb) {
    chrome.storage.local.set({ lists }, () => {
      if (cb) cb();
    });
  }

  // Cherche l'identifiant de profil pr\u00e9sent dans la page
  function extractProfileId() {
    const html = document.documentElement.innerHTML;
    const match = html.match(/urn:li:(?:fsd_profile|organization):([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  // Ouvre une pop-up pour choisir/cr\u00e9er une liste et y ajouter ou retirer le profil
  function openListPopup(profileId, lists, onUpdate) {
    // Supprime une \u00e9ventuelle pop-up existante
    const old = document.getElementById('ln-list-popup');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ln-list-popup';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.right = 0;
    overlay.style.bottom = 0;
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '16px';
    box.style.borderRadius = '8px';
    box.style.minWidth = '260px';
    box.style.fontFamily = 'Helvetica, Arial, sans-serif';

    const title = document.createElement('h3');
    title.textContent = 'Choisir une liste';
    title.style.marginTop = '0';
    box.appendChild(title);

    lists.forEach(list => {
      const row = document.createElement('div');
      row.style.marginTop = '8px';
      const label = document.createElement('span');
      label.textContent = list.name + ' (' + list.ids.length + ') ';
      const btn = document.createElement('button');
      btn.className = 'artdeco-button artdeco-button--2 artdeco-button--primary';
      const inList = list.ids.includes(profileId);
      btn.textContent = inList ? 'Retirer' : 'Ajouter';
      if (!inList && list.ids.length >= 25) {
        btn.disabled = true;
        btn.textContent = 'Pleine';
      }
      btn.addEventListener('click', () => {
        if (inList) {
          list.ids = list.ids.filter(id => id !== profileId);
        } else {
          if (list.ids.length >= 25) {
            alert('Liste pleine (25 profils maximum).');
            return;
          }
          list.ids.push(profileId);
        }
        saveLists(lists, () => {
          overlay.remove();
          if (onUpdate) onUpdate();
        });
      });
      row.appendChild(label);
      row.appendChild(btn);
      box.appendChild(row);
    });

    const newRow = document.createElement('div');
    newRow.style.marginTop = '12px';
    const input = document.createElement('input');
    input.placeholder = 'Nouvelle liste';
    input.style.marginRight = '4px';
    const createBtn = document.createElement('button');
    createBtn.textContent = 'Cr\u00e9er';
    createBtn.className = 'artdeco-button artdeco-button--2 artdeco-button--primary';
    createBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) return;
      const newList = { name, ids: [profileId] };
      lists.push(newList);
      saveLists(lists, () => {
        overlay.remove();
        if (onUpdate) onUpdate();
      });
    });
    newRow.appendChild(input);
    newRow.appendChild(createBtn);
    box.appendChild(newRow);

    overlay.appendChild(box);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  // Insère le bouton de gestion sur la page profil à côté des boutons
  // "Message" et "Plus". Plusieurs tentatives sont effectuées car
  // LinkedIn charge le contenu de manière asynchrone.
  function injectManageButton(profileId, lists, attempt = 0) {
    const existing = document.getElementById('ln-manage-btn');
    if (existing) existing.remove();

    const inSomeList = lists.some(l => l.ids.includes(profileId));
    const button = document.createElement('button');
    button.id = 'ln-manage-btn';
    button.textContent = inSomeList ? 'Retirer de la liste' : 'Ajouter \u00e0 une liste';
    button.className = 'artdeco-button artdeco-button--2 artdeco-button--secondary';
    button.style.marginLeft = '8px';
    button.addEventListener('click', () => {
      openListPopup(profileId, lists, run);
    });

    // Cherche les boutons existants pour se caler au plus près de l'interface
    const messageButton = document.querySelector('button[aria-label*="Message"],a[aria-label*="Message"]');
    const moreButton = document.querySelector('button[aria-label*="Plus"],button[aria-label*="More"]');
    const actionsBar = document.querySelector('.pvs-profile-actions') ||
                       document.querySelector('.pv-top-card-v2-ctas') ||
                       document.querySelector('.pv-top-card__actions');

    if (moreButton && moreButton.parentElement) {
      // Après le bouton "Plus" s'il existe
      moreButton.parentElement.insertBefore(button, moreButton.nextSibling);
    } else if (messageButton && messageButton.parentElement) {
      // Sinon après le bouton "Message"
      messageButton.parentElement.insertBefore(button, messageButton.nextSibling);
    } else if (actionsBar) {
      // À défaut on ajoute dans la barre d'actions
      actionsBar.appendChild(button);
    } else if (attempt < 5) {
      // Si la barre n'est pas encore chargée, on réessaie dans 500ms (5 fois max)
      setTimeout(() => injectManageButton(profileId, lists, attempt + 1), 500);
    } else {
      // Dernier recours : début de page
      document.body.insertBefore(button, document.body.firstChild);
    }
  }

  // Panneau lat\u00e9ral listant toutes les listes
  function injectListsPanel(lists) {
    const old = document.getElementById('ln-lists-panel');
    if (old) old.remove();

    const sidebar = document.querySelector('.scaffold-layout__aside') || document.querySelector('aside');
    if (!sidebar) return;

    const panel = document.createElement('div');
    panel.id = 'ln-lists-panel';
    panel.style.marginBottom = '16px';

    const title = document.createElement('h3');
    title.textContent = 'Mes listes de favoris';
    title.style.fontSize = '16px';
    panel.appendChild(title);

    lists.forEach(list => {
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = list.name + ' (' + list.ids.length + ')';
      link.style.display = 'block';
      link.style.margin = '4px 0';
      link.addEventListener('click', e => {
        e.preventDefault();
        if (list.ids.length === 0) return;
        const url = 'https://www.linkedin.com/search/results/content/?fromMember=' +
          encodeURIComponent(JSON.stringify(list.ids)) +
          '&origin=FACETED_SEARCH&sortBy=%22date_posted%22';
        window.open(url, '_blank');
      });
      panel.appendChild(link);
    });

    const createBtn = document.createElement('button');
    createBtn.textContent = 'Cr\u00e9er nouvelle liste';
    createBtn.className = 'artdeco-button artdeco-button--2 artdeco-button--secondary';
    createBtn.style.marginTop = '8px';
    createBtn.addEventListener('click', () => {
      const name = prompt('Nom de la nouvelle liste ?');
      if (!name) return;
      lists.push({ name: name.trim(), ids: [] });
      saveLists(lists, () => injectListsPanel(lists));
    });
    panel.appendChild(createBtn);

    sidebar.prepend(panel);
  }

  // Fonction principale appel\u00e9e à chaque chargement et changement d'URL
  function run() {
    getLists(lists => {
      const profileId = extractProfileId();
      if (profileId) {
        injectManageButton(profileId, lists);
      }
      injectListsPanel(lists);
    });
  }

  // Exécution initiale
  run();

  // Surveillance des changements d'URL (SPA LinkedIn)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(run, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
