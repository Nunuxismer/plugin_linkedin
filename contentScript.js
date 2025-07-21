// Content script de l'extension LinkedIn Favorites Feed
// Ce script s'ex\u00e9cute sur les pages LinkedIn et ajoute la fonctionnalit\u00e9 d'ajout/retrait de favoris et le lien vers le fil personnalis\u00e9.

(function() {
  // Fonction utilitaire pour r\u00e9cup\u00e9rer la liste actuelle des favoris depuis le stockage
  function getFavorites(callback) {
    chrome.storage.local.get({ favorites: [] }, function(result) {
      callback(result.favorites);
    });
  }

  // Fonction utilitaire pour sauvegarder une nouvelle liste de favoris dans le stockage
  function saveFavorites(favs, callback) {
    chrome.storage.local.set({ favorites: favs }, function() {
      if (callback) callback();
    });
  }

  // R\u00e9cup\u00e9rer l'identifiant LinkedIn (URN) du profil sur la page courante
  function extractProfileId() {
    const html = document.documentElement.innerHTML;
    const match = html.match(/urn:li:(?:fsd_profile|organization):([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  // Injection du bouton de suivi sur les pages profil
  function injectFollowButton(profileId, isFavorite) {
    // S'assure qu'un seul bouton est pr\u00e9sent en retirant l'\u00e9ventuel bouton existant
    const existing = document.getElementById('ln-fav-btn');
    if (existing) existing.remove();

    // Cr\u00e9er le bouton
    const button = document.createElement('button');
    button.id = 'ln-fav-btn';
    button.textContent = isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris';
    button.className = 'artdeco-button artdeco-button--2 artdeco-button--secondary';
    button.style.marginLeft = '8px';

    // Gestion du clic sur le bouton
    button.addEventListener('click', function() {
      getFavorites(function(favorites) {
        const idx = favorites.indexOf(profileId);
        if (idx === -1) {
          // Ajout du profil aux favoris
          favorites.push(profileId);
          button.textContent = 'Retirer des favoris';
        } else {
          // Retrait du profil des favoris
          favorites.splice(idx, 1);
          button.textContent = 'Ajouter aux favoris';
        }
        // Sauvegarder la liste mise \u00e0 jour
        saveFavorites(favorites);
      });
    });

    // Ins\u00e9rer le bouton dans la barre d'actions du profil
    const actionsBar = document.querySelector('.pvs-profile-actions');
    if (actionsBar) {
      actionsBar.appendChild(button);
    } else {
      const moreButton = document.querySelector('button.artdeco-dropdown__trigger--placement-bottom');
      if (moreButton && moreButton.parentElement) {
        moreButton.parentElement.insertBefore(button, moreButton);
      } else {
        document.body.insertBefore(button, document.body.firstChild);
      }
    }
  }

  // Injection du lien "Mes Favoris" dans la navigation principale
  function injectNavLink() {
    const navBar = document.querySelector('ul.global-nav__primary-items');
    if (!navBar) return;

    if (document.getElementById('favFeedLink')) return;

    const li = document.createElement('li');
    li.className = 'global-nav__primary-item';
    const link = document.createElement('a');
    link.href = '#';
    link.id = 'favFeedLink';
    link.textContent = 'Mes Favoris';
    link.className = 'global-nav__primary-link';
    li.appendChild(link);

    const meMenuItem = navBar.querySelector('li.global-nav__primary-item:last-child');
    if (meMenuItem) {
      meMenuItem.after(li);
    } else {
      navBar.appendChild(li);
    }

    link.addEventListener('click', function(e) {
      e.preventDefault();
      getFavorites(function(favorites) {
        if (favorites.length === 0) {
          alert('Aucun favori pour le moment.');
          return;
        }
        const encodedList = encodeURIComponent(JSON.stringify(favorites));
        const feedUrl = 'https://www.linkedin.com/search/results/content/?fromMember=' + encodedList + '&origin=FACETED_SEARCH&sortBy=%22date_posted%22';
        window.open(feedUrl, '_blank');
      });
    });
  }

  function run() {
    const profileId = extractProfileId();
    if (profileId) {
      getFavorites(function(favorites) {
        const isFav = favorites.indexOf(profileId) !== -1;
        injectFollowButton(profileId, isFav);
      });
    }
    injectNavLink();
  }

  run();

  let lastUrl = location.href;
  const observer = new MutationObserver(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(run, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
