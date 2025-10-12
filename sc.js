/* if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
     navigator.serviceWorker.register('/service-worker.js')
       .then(registration => {
         console.log('Service Worker enregistré avec succès:', registration.scope);
       })
       .catch(error => {
         console.log('Échec de l\'enregistrement du Service Worker:', error);
       });
   });
 }
*/
// 2. Logique de la page d'ouverture (Splash Screen) et initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    // Ajoute un léger délai avant de masquer le splash screen pour permettre au contenu de charger
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        splashScreen.addEventListener('transitionend', () => {
            splashScreen.style.display = 'none';
        }, { once: true });
    }, 500); // Reste 1.5 secondes visible

    // ---
    // 3. Déclarations des Constantes et Variables d'état

    // Constantes de jeu (XP et Gemmes par difficulté, niveaux, monnaies)
    const applicationServerKey = "BK0seamUKXsLFEQEXytaDWTl1C0TgsuRt4jpWOx2zbi1VidYl_Nn5f7kO2x2ES4lnh7tjVxFBFip_rRCw3vnOSI"; 
    const XP_PER_DIFFICULTY = { 'D': 50, 'C': 100, 'B': 200, 'A': 500, 'S': 1000 };
    const GEMS_PER_DIFFICULTY = { 'D': 0, 'C': 0, 'B': 1, 'A': 3, 'S': 5 };
    const BASE_XP_FOR_LEVEL_UP = 1000;
    const XP_INCREMENT_PER_LEVEL = 50;
    const COINS_PER_LEVEL_GAIN = 10;
    const COINS_BONUS_PER_LEVEL = 1;

    // Références DOM principales
    const profilePictureContainer = document.getElementById('profile-picture-container');
    const profilePicture = document.getElementById('profile-picture');
    const defaultPicture = "/logo.png";
    const levelBadgeContainer = document.getElementById('level-badge');
    const levelBadgeText = levelBadgeContainer.querySelector('span');
    const xpProgressContainer = document.getElementById('xp-progress-container');
    const xpProgressBar = document.getElementById('xp-progress-bar');
    const xpText = document.getElementById('xp-text');
    const mesQuetesUL = document.getElementById('mesQuetes');
    const openAddQuestModalBtn = document.getElementById('open-add-quest-modal-btn');
    const openFiltersModalBtn = document.getElementById('open-filters-modal-btn');
    const openShopModalBtn = document.getElementById('open-shop-modal-btn');
    const coinsDisplay = document.getElementById('coins-display');
    const gemsDisplay = document.getElementById('gems-display');
    const userNameDisplay = document.getElementById('user-name-display');

    // Références aux modales
    const profileModal = document.getElementById('profile-modal');
    const questFormModal = document.getElementById('quest-form-modal');
    const filtersModal = document.getElementById('filters-modal');
    const shopModal = document.getElementById('shop-modal');
    const customAlertModal = document.getElementById('custom-alert-modal');

    // Références aux éléments spécifiques des modales
    const modalProfilePicture = document.getElementById('modal-profile-picture');
    const modalLevelDisplay = document.getElementById('modal-level');
    const modalXpDisplay = document.getElementById('modal-xp');
    const modalCoinsDisplay = document.getElementById('modal-coins');
    const modalGemsDisplay = document.getElementById('modal-gems');
    const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
    const profilePictureInput = document.getElementById('profile-picture-input');
    const profilePictureDelete = document.getElementById('profile-picture-delete');
    const userNameInput = document.getElementById('user-name-input');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    const closeQuestFormModalBtn = document.getElementById('close-quest-form-modal-btn');
    const questFormTitle = document.getElementById('quest-form-title');
    const questFormSubmitBtn = document.getElementById('quest-form-submit-btn');
    const hiddenQuestIdInput = document.getElementById('hidden-quest-id');
    const questTitleInput = document.getElementById('quest-title');
    const questDescriptionInput = document.getElementById('quest-description');
    const questOpenDateInput = document.getElementById('quest-open-date');
    const questCloseDateInput = document.getElementById('quest-close-date');
    const questDifficultySelect = document.getElementById('quest-difficulty');
    const questCategorySelect = document.getElementById('quest-category');
    const addQuestForm = document.getElementById('add-quest-form');

    const closeFiltersModalBtn = document.getElementById('close-filters-modal-btn');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const filterStatusSelect = document.getElementById('filter-status');
    const filterDifficultySelect = document.getElementById('filter-difficulty');
    const filterCategorySelect = document.getElementById('filter-category');
    const sortOrderSelect = document.getElementById('sort-order');

    const closeShopModalBtn = document.getElementById('close-shop-modal-btn');
    const shopItemsContainer = shopModal.querySelector('.modal-content');

    const closeAlertModalBtn = document.getElementById('close-alert-modal-btn');
    const customAlertTitle = document.getElementById('custom-alert-title');
    const customAlertMessage = document.getElementById('custom-alert-message');
    const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');

    // Thème
    const themeSwitch = document.getElementById('checkbox');

    // Variables d'état (let) - Initialisation à partir de localStorage ou valeurs par défaut
    let quetes = JSON.parse(localStorage.getItem('quetes')) || [];
    let userXp = parseInt(localStorage.getItem('userXp') || '0');
    let userProfilePic = localStorage.getItem('userProfilePic') || '/logo.png';
    let userName = localStorage.getItem('userName') || 'Aventurier Anonyme';
    let userCoins = parseInt(localStorage.getItem('userCoins') || '0');
    let userGems = parseInt(localStorage.getItem('userGems') || '0');
    let lastNotifiedLevel = parseInt(localStorage.getItem('lastNotifiedLevel') || '0');
    let currentFilterStatus = localStorage.getItem('currentFilterStatus') || 'all';
    let currentFilterDifficulty = localStorage.getItem('currentFilterDifficulty') || 'all';
    let currentFilterCategory = localStorage.getItem('currentFilterCategory') || 'all';
    let currentSortOrder = localStorage.getItem('currentSortOrder') || 'none';
    let editingQuestId = null;
    let isDarkTheme = localStorage.getItem('isDarkTheme') === 'true';

    // Applique la photo de profil et le nom aux éléments image
    profilePicture.src = userProfilePic;
    modalProfilePicture.src = userProfilePic;
    userNameDisplay.textContent = userName;
    userNameInput.value = userName;

    // Appliquer le thème au chargement
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        themeSwitch.checked = true;
    } else {
        document.body.classList.remove('dark-theme');
        themeSwitch.checked = false;
    }

    // ---
    // 4. Fonctions de l'application

    /**
     * Affiche une modale personnalisée avec un titre et un message.
     * Peut être utilisée pour une simple alerte ou une confirmation.
     * @param {string} title - Le titre de l'alerte.
     * @param {string} message - Le message de l'alerte.
     * @param {boolean} [isConfirm=false] - Si true, affiche des boutons "Oui/Non" et retourne une Promise.
     * @returns {Promise<boolean>|void} Une Promise qui se résout à true pour "Oui" / "OK" ou false pour "Non" si isConfirm est true.
     */
     // Fonction pour demander la permission de notification et s'abonner
function requestNotificationPermissionAndSubscribe() {
    // Vérifie si les API sont supportées par le navigateur
    if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Permission de notification accordée.');
                subscribeUserToPush();
            } else {
                console.log('Permission de notification refusée.');
            }
        });
    }
}

     
     // Fonction pour s'abonner aux notifications push
function subscribeUserToPush() {
    navigator.serviceWorker.ready.then(registration => {
        // **À MODIFIER : Remplacez par votre clé VAPID publique**
        const applicationServerKey = '7vQfG7xV_DuUBJSyAzTBLXULOmR86e8UPKbUQ6414go'; 
        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
        };

        return registration.pushManager.subscribe(subscribeOptions);
    }).then(subscription => {
        console.log('Abonnement push réussi:', subscription);
        // Envoie l'objet d'abonnement au serveur
        sendSubscriptionToServer(subscription);
    }).catch(error => {
        console.error('Erreur lors de l\'abonnement push:', error);
    });
}

// Fonction pour envoyer l'abonnement à votre serveur
function sendSubscriptionToServer(subscription) {
    // **À MODIFIER : Adaptez l'URL si besoin, si votre serveur utilise une autre route**
    fetch('/api/subscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Échec de l\'envoi de l\'abonnement au serveur.');
        }
        console.log('Abonnement envoyé au serveur avec succès.');
    })
    .catch(error => console.error(error));
}

// Fonction utilitaire pour la conversion de la clé VAPID
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

     
    function showAlert(title, message, isConfirm = false) {
        return new Promise(resolve => {
            customAlertTitle.textContent = title;
            customAlertMessage.textContent = message;

            customAlertOkBtn.style.display = isConfirm ? 'none' : 'block';
            const existingConfirmBtn = customAlertModal.querySelector('.custom-alert-confirm-btn');
            const existingCancelBtn = customAlertModal.querySelector('.custom-alert-cancel-btn');
            if (existingConfirmBtn) existingConfirmBtn.remove();
            if (existingCancelBtn) existingCancelBtn.remove();

            let confirmBtn, cancelBtn;
            if (isConfirm) {
                confirmBtn = document.createElement('button');
                confirmBtn.textContent = 'Oui';
                confirmBtn.className = 'custom-alert-confirm-btn main-button';
                customAlertModal.querySelector('.modal-content').appendChild(confirmBtn);

                cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Non';
                cancelBtn.className = 'custom-alert-cancel-btn secondary-button';
                customAlertModal.querySelector('.modal-content').appendChild(cancelBtn);

                const confirmHandler = () => {
                    closeModal(customAlertModal);
                    resolve(true);
                };
                const cancelHandler = () => {
                    closeModal(customAlertModal);
                    resolve(false);
                };

                confirmBtn.addEventListener('click', confirmHandler, { once: true });
                cancelBtn.addEventListener('click', cancelHandler, { once: true });

                const closeHandler = () => {
                    closeModal(customAlertModal);
                    resolve(false);
                };
                closeAlertModalBtn.addEventListener('click', closeHandler, { once: true });
                const outsideClickListener = (event) => {
                    if (event.target === customAlertModal) {
                        closeModal(customAlertModal);
                        window.removeEventListener('click', outsideClickListener);
                        resolve(false);
                    }
                };
                window.addEventListener('click', outsideClickListener);

            } else {
                const okHandler = () => {
                    closeModal(customAlertModal);
                    resolve(true);
                };
                customAlertOkBtn.addEventListener('click', okHandler, { once: true });

                const closeHandler = () => {
                    closeModal(customAlertModal);
                    resolve(true);
                };
                closeAlertModalBtn.addEventListener('click', closeHandler, { once: true });
                const outsideClickListener = (event) => {
                    if (event.target === customAlertModal) {
                        closeModal(customAlertModal);
                        window.removeEventListener('click', outsideClickListener);
                        resolve(true);
                    }
                };
                window.addEventListener('click', outsideClickListener);
            }
            openModal(customAlertModal);
        });
    }
  // sc.js

// ... (le reste de votre code, incluant les fonctions `requestNotificationPermissionAndSubscribe` et `subscribeUserToPush`)

// Événement au chargement complet de la page
document.addEventListener('DOMContentLoaded', () => {
    // Appelle la fonction qui demande la permission et s'abonne
    // Cette action se fera automatiquement une fois la page chargée
    requestNotificationPermissionAndSubscribe();
    
    // N'oubliez pas d'enregistrer votre Service Worker si ce n'est pas déjà fait !
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker enregistré avec succès:', registration);
                })
                .catch(error => {
                    console.error('Échec de l\'enregistrement du Service Worker:', error);
                });
        });
    }
});

    // Fonctions d'ouverture/fermeture génériques de modales
    function openModal(modalElement) {
        modalElement.style.display = 'flex';
    }

    function closeModal(modalElement) {
        modalElement.style.display = 'none';
        if (modalElement === questFormModal) {
            addQuestForm.reset();
            editingQuestId = null;
        }
    }

    // Fonction pour sauvegarder les infos de profil
    function saveProfile() {
        localStorage.setItem('userName', userName);
        localStorage.setItem('userProfilePic', userProfilePic);
        profilePicture.src = userProfilePic;
        modalProfilePicture.src = userProfilePic;
        userNameDisplay.textContent = userName;
        userNameInput.value = userName;
        showAlert('Profil Mis à Jour', 'Votre profil a été mis à jour avec succès !');
        saveAndRenderAll(false);
    }

    // Fonction pour ajouter une nouvelle quête
    function addQuest(titre, description, dateOuverture, dateFermeture, difficulte, categorie) {
      
        if( titre== "Olgi2006" ){
          window.location.href("./public/index.html");
          showAlert("yo")
        }else{
        const newQuest = {
            id: Date.now().toString(),
            titre: titre,
            description: description,
            dateOuverture: dateOuverture,
            dateFermeture: dateFermeture,
            difficulte: difficulte,
            categorie: categorie,
            terminee: false
        };
        quetes.push(newQuest);
        showAlert('Quête Ajoutée', `La quête "${titre}" a été ajoutée avec succès !`);
          
        }
    }

    // Fonction pour modifier une quête existante
    function updateQuest(id, titre, description, dateOuverture, dateFermeture, difficulte, categorie) {
        const index = quetes.findIndex(q => q.id === id);
        if (index !== -1) {
            quetes[index].titre = titre;
            quetes[index].description = description;
            quetes[index].dateOuverture = dateOuverture;
            quetes[index].dateFermeture = dateFermeture;
            quetes[index].difficulte = difficulte;
            quetes[index].categorie = categorie;
            showAlert('Quête Modifiée', `La quête "${titre}" a été mise à jour avec succès !`);
        } else {
            console.error("Erreur: Quête à modifier non trouvée avec l'ID :", id);
            showAlert('Erreur', "Impossible de trouver la quête à modifier.");
        }
    }
    // Fonction pour supprimer une quête
    function deleteQuest(id) {
        quetes = quetes.filter(quete => quete.id !== id);
        showAlert('Quête Supprimée', "La quête a été supprimée avec succès.");
        saveAndRenderAll();
    }
    // Fonction pour supprimer la photo de profilePicture
    function deletePicture() {
         userProfilePic = defaultPicture;
         modalProfilePicture.src = userProfilePic;
         profilePicture.src = userProfilePic;
         showAlert('Photo de profil', 'Votre photo de profil a été restaurée par défaut!');
        saveAndRenderAll(false);
    }
    // Fonction pour basculer le statut d'une quête (terminée/active) et gérer l'XP
    function toggleQueteStatus(id) {
        const quete = quetes.find(q => q.id === id);

        if (!quete) {
            console.error("Quête non trouvée avec l'ID :", id);
            return;
        }

        const now = new Date();
        const closeDate = new Date(quete.dateFermeture);
        const openDate = new Date(quete.dateOuverture);

        if (!quete.terminee) {
            if (now < openDate) {
                showAlert('Impossible', `La quête "${quete.titre}" n'est pas encore ouverte.`);
                return;
            }
            if (now > closeDate) {
                showAlert('Impossible', `Désolé, la quête "${quete.titre}" est expirée depuis le ${closeDate.toLocaleDateString()}. Vous ne pouvez plus la terminer.`);
                return;
            }
            quete.terminee = true;
            const xpGained = XP_PER_DIFFICULTY[quete.difficulte] || 0;
            userXp += xpGained;
            const gemsGained = GEMS_PER_DIFFICULTY[quete.difficulte] || 0;
            userGems += gemsGained;

            let alertMessage = `Félicitations ! Vous avez gagné ${xpGained} XP pour avoir terminé "${quete.titre}" !`;
            if (gemsGained > 0) {
                alertMessage += `\nVous avez également trouvé ${gemsGained} gemme(s) !`;
            }
            showAlert('Quête Terminée', alertMessage);

            // Suppression des entrées localStorage liées aux notifications de cette quête
            localStorage.removeItem(`notified_expired_${quete.id}`);
            localStorage.removeItem(`notified_deadline_${quete.id}`);

        } else {
            quete.terminee = false;
            const xpLost = XP_PER_DIFFICULTY[quete.difficulte] || 0;
            userXp -= xpLost;
            if (userXp < 0) userXp = 0;
            const gemsLost = GEMS_PER_DIFFICULTY[quete.difficulte] || 0;
            userGems -= gemsLost;
            if (userGems < 0) userGems = 0;
            showAlert('Quête Réactivée', `La quête "${quete.titre}" a été réactivée. Vous perdez ${xpLost} XP et ${gemsLost} gemme(s).`);
        }
        saveAndRenderAll();
    }

    // Fonction pour sauvegarder toutes les données (quêtes, XP, pieces, gemmes) et rafraîchir l'interface
    function saveAndRenderAll(fullRender = true) {
        try {
            localStorage.setItem('quetes', JSON.stringify(quetes));
            localStorage.setItem('userXp', userXp.toString());
            localStorage.setItem('userCoins', userCoins.toString());
            localStorage.setItem('userGems', userGems.toString());
            localStorage.setItem('lastNotifiedLevel', lastNotifiedLevel.toString());
            localStorage.setItem('currentFilterStatus', currentFilterStatus);
            localStorage.setItem('currentFilterDifficulty', currentFilterDifficulty);
            localStorage.setItem('currentFilterCategory', currentFilterCategory);
            localStorage.setItem('currentSortOrder', currentSortOrder);
            localStorage.setItem('isDarkTheme', isDarkTheme.toString());

            // Mettre à jour l'affichage des monnaies
            coinsDisplay.textContent = userCoins;
            gemsDisplay.textContent = userGems;

            if (fullRender) {
                renderAll();
            } else {
                updateLevelBadge();
            }
        } catch (e) {
            console.error("Erreur lors de l'enregistrement dans localStorage:", e);
            if (e.name === 'QuotaExceededError') {
                showAlert('Erreur de Stockage', "L'espace de stockage est plein. Impossible d'enregistrer plus de données. Veuillez nettoyer votre navigateur ou réduire le nombre de quêtes.");
            } else {
                showAlert('Erreur d\'Enregistrement', `Impossible d'enregistrer les données. Détails: ${e.message}`);
            }
        }
    }

    // Fonction globale pour rendre toutes les composantes de l'UI
    function renderAll() {
        updateLevelBadge();
        filterStatusSelect.value = currentFilterStatus;
        filterDifficultySelect.value = currentFilterDifficulty;
        filterCategorySelect.value = currentFilterCategory;
        sortOrderSelect.value = currentSortOrder;
        coinsDisplay.textContent = userCoins;
        gemsDisplay.textContent = userGems;
        renderQuetes();
    }

    // Fonction pour rendre (afficher) la liste des quêtes
    function renderQuetes() {
        mesQuetesUL.innerHTML = '';
        const now = new Date();

        const applyFiltersAndSort = () => {
            let tempQuetes = [...quetes];

            tempQuetes = tempQuetes.filter(quete => {
                let matchesStatus = true;
                if (currentFilterStatus !== 'all') {
                    const openDate = new Date(quete.dateOuverture);
                    const closeDate = new Date(quete.dateFermeture);

                    if (currentFilterStatus === 'active') {
                        matchesStatus = (now >= openDate && now <= closeDate && !quete.terminee);
                    } else if (currentFilterStatus === 'completed') {
                        matchesStatus = quete.terminee;
                    } else if (currentFilterStatus === 'future') {
                        matchesStatus = (now < openDate && !quete.terminee);
                    } else if (currentFilterStatus === 'expired') {
                        matchesStatus = (now > closeDate && !quete.terminee);
                    }
                }

                let matchesDifficulty = true;
                if (currentFilterDifficulty !== 'all' && quete.difficulte !== currentFilterDifficulty) {
                    matchesDifficulty = false;
                }

                let matchesCategory = true;
                if (currentFilterCategory !== 'all' && quete.categorie !== currentFilterCategory) {
                    matchesCategory = false;
                }

                return matchesStatus && matchesDifficulty && matchesCategory;
            });

            tempQuetes.sort((a, b) => {
                if (currentSortOrder === 'difficulty-asc') {
                    const order = ['D', 'C', 'B', 'A', 'S'];
                    return order.indexOf(a.difficulte) - order.indexOf(b.difficulte);
                } else if (currentSortOrder === 'difficulty-desc') {
                    const order = ['D', 'C', 'B', 'A', 'S'];
                    return order.indexOf(b.difficulte) - order.indexOf(a.difficulte);
                } else if (currentSortOrder === 'open-date-asc') {
                    return new Date(a.dateOuverture) - new Date(b.dateOuverture);
                } else if (currentSortOrder === 'open-date-desc') {
                    return new Date(b.dateOuverture) - new Date(a.dateOuverture);
                } else if (currentSortOrder === 'close-date-asc') {
                    return new Date(a.dateFermeture) - new Date(b.dateFermeture);
                } else if (currentSortOrder === 'close-date-desc') {
                    return new Date(b.dateFermeture) - new Date(a.dateFermeture);
                }
                return 0;
            });

            return tempQuetes;
        };

        const filteredAndSortedQuetes = applyFiltersAndSort();

        if (filteredAndSortedQuetes.length === 0) {
            mesQuetesUL.innerHTML = '<li class="no-quest-message">Aucune quête à afficher pour le moment. Ajoutez-en une ou ajustez vos filtres !</li>';
            return;
        }

        filteredAndSortedQuetes.forEach(quete => {
            const li = document.createElement('li');
            li.classList.toggle('completed-quest', quete.terminee);

            const openDate = new Date(quete.dateOuverture);
            const closeDate = new Date(quete.dateFermeture);

            let statusClass = '';
            if (quete.terminee) {
                statusClass = 'completed-quest';
            } else if (now < openDate) {
                statusClass = 'future-quest';
            } else if (now > closeDate) {
                statusClass = 'expired-quest';
            } else {
                statusClass = 'active-quest';
            }
            li.classList.add(statusClass);

            const categoryDisplay = quete.categorie && quete.categorie !== 'none' ? `<span class="category-badge">${quete.categorie.charAt(0).toUpperCase() + quete.categorie.slice(1)}</span>` : '';

            li.innerHTML = `
                <div class="quest-info">
                    <h3 class="quest-title">${quete.titre} <span class="difficulty-badge difficulty-${quete.difficulte}">${quete.difficulte}</span></h3>
                    <p class="quest-description">${quete.description || 'Pas de description.'}</p>
                    <div class="quest-details">
                        <span class="dates">Du ${openDate.toLocaleDateString()} au ${closeDate.toLocaleDateString()}</span>
                        ${categoryDisplay}
                    </div>
                </div>
                <div class="quest-actions">
                    <button class="toggle-status-btn" data-id="${quete.id}">
                        ${quete.terminee ? 'Réactiver' : 'Terminer'}
                    </button>
                    <button class="edit-quest-btn" data-id="${quete.id}">Modifier</button>
                    <button class="delete-quest-btn" data-id="${quete.id}">Supprimer</button>
                </div>
            `;
            mesQuetesUL.appendChild(li);

            const terminerButton = li.querySelector('.toggle-status-btn');
            if (statusClass === 'expired-quest' || statusClass === 'future-quest') {
                terminerButton.disabled = true;
                terminerButton.style.opacity = '0.7';
                terminerButton.style.cursor = 'not-allowed';
            } else {
                terminerButton.disabled = false;
                terminerButton.style.opacity = '1';
                terminerButton.style.cursor = 'pointer';
            }
        });

        // Attacher les écouteurs d'événements aux boutons nouvellement créés
        document.querySelectorAll('.edit-quest-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const questId = e.target.dataset.id;
                openQuestFormModal(questId);
            });
        });

        document.querySelectorAll('.delete-quest-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const questIdToDelete = e.target.dataset.id;
                showAlert('Confirmation', "Voulez-vous vraiment supprimer cette quête ?", true)
                    .then(result => {
                        if (result) {
                            deleteQuest(questIdToDelete);
                        }
                    });
            });
        });

        document.querySelectorAll('.toggle-status-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                toggleQueteStatus(e.target.dataset.id);
            });
        });
    }

    // Fonction pour mettre à jour l'insigne de niveau et son animation de progression
    function updateLevelBadge() {
        let currentLevel = 1;
        let xpNeededForThisLevel = BASE_XP_FOR_LEVEL_UP;
        let totalXpNeededToReachCurrentLevel = 0;

        while (userXp >= totalXpNeededToReachCurrentLevel + xpNeededForThisLevel) {
            totalXpNeededToReachCurrentLevel += xpNeededForThisLevel;
            currentLevel++;
            xpNeededForThisLevel = BASE_XP_FOR_LEVEL_UP + (currentLevel - 1) * XP_INCREMENT_PER_LEVEL;
        }

        levelBadgeText.textContent = `Lv ${currentLevel}`;

        if (currentLevel > lastNotifiedLevel) {
            const gainedCoins = COINS_PER_LEVEL_GAIN + (currentLevel * COINS_BONUS_PER_LEVEL);
            userCoins += gainedCoins;
            lastNotifiedLevel = currentLevel;
            showAlert(`Niveau Supérieur !`, `Félicitations, vous êtes passé au Niveau ${currentLevel} ! Vous gagnez ${gainedCoins} pièces !`)
                .then(() => {
                    saveAndRenderAll(false);
                });
        }

        const xpInCurrentLevel = userXp - totalXpNeededToReachCurrentLevel;
        const displayXpInCurrentLevel = Math.max(0, xpInCurrentLevel);

        const progressPercentage = (displayXpInCurrentLevel / xpNeededForThisLevel) * 100;

        xpProgressBar.style.width = `${progressPercentage}%`;
        xpText.textContent = `${displayXpInCurrentLevel} / ${xpNeededForThisLevel} XP`;

        if (userXp === 0 && currentLevel === 1) {
            xpText.textContent = `0 / ${BASE_XP_FOR_LEVEL_UP} XP`;
        }
    }

    // Fonction pour vérifier les délais des quêtes - VIDE car notifications retirées
    function checkQuestDeadlines() {
        // Cette fonction ne fait plus rien car les notifications ont été retirées.
        // Vous pouvez la supprimer complètement si elle n'a plus d'autre utilité.
    }

    // Fonction pour ouvrir la modale d'ajout/modification de quête
    function openQuestFormModal(questId = null) {
        openModal(questFormModal);

        if (questId) {
            editingQuestId = questId;
            questFormTitle.textContent = 'Modifier la Quête';
            questFormSubmitBtn.textContent = 'Sauvegarder les modifications';
            hiddenQuestIdInput.value = questId;

            const queteToEdit = quetes.find(q => q.id === questId);
            if (queteToEdit) {
                questTitleInput.value = queteToEdit.titre;
                questDescriptionInput.value = queteToEdit.description;
                questOpenDateInput.value = queteToEdit.dateOuverture;
                questCloseDateInput.value = queteToEdit.dateFermeture;
                questDifficultySelect.value = queteToEdit.difficulte;
                questCategorySelect.value = queteToEdit.categorie || 'none';
            } else {
                showAlert("Erreur", "Quête introuvable pour la modification.");
                closeModal(questFormModal);
            }
        } else {
            editingQuestId = null;
            questFormTitle.textContent = 'Ajouter une Nouvelle Quête';
            questFormSubmitBtn.textContent = 'Ajouter la Quête';
            hiddenQuestIdInput.value = '';

            questTitleInput.value = '';
            questDescriptionInput.value = '';
            const today = new Date().toISOString().split('T')[0];
            questOpenDateInput.value = today;
            questCloseDateInput.value = today;
            questDifficultySelect.value = 'D';
            questCategorySelect.value = 'none';
        }
    }

    // Fonction pour ouvrir la modale de la boutique
    function openShopModal() {
        openModal(shopModal);
    }

    // Fonction pour acheter un objet
    function buyItem(itemType) {
        let costCoins = 0;
        let costGems = 0;
        let earnedCoins = 0;
        let earnedGems = 0;
        let itemName = '';
        let successMessage = '';

        if (itemType === 'euro') {
            itemName = 'Pack "100 pieces"';
            costGems = 1;
            earnedCoins = 100;
        } else if (itemType === 'plaisir') {
            itemName = 'Pack "1 Gemmes"';
            costCoins = 100;
            earnedGems = 1;
        } else {
            showAlert('Erreur', 'Objet inconnu.');
            return;
        }

        if (userCoins >= costCoins && userGems >= costGems) {
            userCoins -= costCoins;
            userGems -= costGems;
            userCoins += earnedCoins;
            userGems += earnedGems;

            successMessage = `Vous avez acheté ${itemName}. Vous avez gagné ${earnedCoins} pièce(s) et ${earnedGems} gemme(s) !`;

            showAlert('Achat Réussi', successMessage).then(() => {
                saveAndRenderAll(false);
            });
        } else {
            showAlert('Fonds Insuffisants', `Vous n'avez pas assez de ressources pour acheter ${itemName}. Il vous faut ${costCoins} pièce(s) et ${costGems} gemme(s).`);
        }
    }


    // ---
    // 5. Écouteurs d'événements (après toutes les déclarations et fonctions)

    // Initialisation au chargement
    renderAll();
    // checkQuestDeadlines(); // Plus besoin d'appeler cette fonction au chargement
    // setInterval(checkQuestDeadlines, 60 * 60 * 1000); // Plus besoin de l'intervalle

    // Modale de profil
    profilePictureContainer.addEventListener('click', () => {
        let currentLevelForModal = 1;
        let xpNeededForThisLevelModal = BASE_XP_FOR_LEVEL_UP;
        let totalXpNeededToReachCurrentLevelModal = 0;

        while (userXp >= totalXpNeededToReachCurrentLevelModal + xpNeededForThisLevelModal) {
            totalXpNeededToReachCurrentLevelModal += xpNeededForThisLevelModal;
            currentLevelForModal++;
            xpNeededForThisLevelModal = BASE_XP_FOR_LEVEL_UP + (currentLevelForModal - 1) * XP_INCREMENT_PER_LEVEL;
        }

        modalLevelDisplay.textContent = currentLevelForModal;
        modalXpDisplay.textContent = userXp;
        modalCoinsDisplay.textContent = userCoins;
        modalGemsDisplay.textContent = userGems;
        userNameInput.value = userName;
        openModal(profileModal);
    });

    closeProfileModalBtn.addEventListener('click', () => {
        closeModal(profileModal);
    });
    
    // Enregistrement du nom d'utilisateur et de la photo
    saveProfileBtn.addEventListener('click', () => {
        userName = userNameInput.value.trim();
        saveProfile();
        closeModal(profileModal);
    });

    profilePictureInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                userProfilePic = e.target.result;
                modalProfilePicture.src = userProfilePic;
                profilePicture.src = userProfilePic;
                showAlert('Photo de profil', 'Votre photo de profil a été mise à jour !');
                saveProfile();
            };
            reader.readAsDataURL(file);
        }
    });
    profilePictureDelete.addEventListener('click', (event) => {
        showAlert('Confirmer la suppression', 'Êtes-vous sûr de vouloir supprimer votre photo de profil', true)
        .then(result => {
        if(result) {
          deletePicture();
        }
        });
    });
    // Modale de formulaire de quête (ajout/modification)
    openAddQuestModalBtn.addEventListener('click', () => {
        openQuestFormModal();
    });

    closeQuestFormModalBtn.addEventListener('click', () => {
        closeModal(questFormModal);
    });

    addQuestForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const titre = questTitleInput.value.trim();
        const description = questDescriptionInput.value.trim();
        const dateOuverture = questOpenDateInput.value;
        const dateFermeture = questCloseDateInput.value;
        const difficulte = questDifficultySelect.value;
        const categorie = questCategorySelect.value;

        if (!titre || !dateOuverture || !dateFermeture || !difficulte) {
            showAlert('Champs Manquants', "Veuillez remplir tous les champs obligatoires (Titre, Dates, Difficulté).");
            return;
        }

        const openDate = new Date(dateOuverture);
        const closeDate = new Date(dateFermeture);
        if (openDate > closeDate) {
            showAlert('Erreur de Date', "La date de fermeture ne peut pas être antérieure à la date d'ouverture !");
            return;
        }

        if (editingQuestId) {
            updateQuest(editingQuestId, titre, description, dateOuverture, dateFermeture, difficulte, categorie);
        } else {
            addQuest(titre, description, dateOuverture, dateFermeture, difficulte, categorie);
        }

        closeModal(questFormModal);
        saveAndRenderAll();
    });

    // Modale de filtres et tri
    openFiltersModalBtn.addEventListener('click', () => {
        filterStatusSelect.value = currentFilterStatus;
        filterDifficultySelect.value = currentFilterDifficulty;
        filterCategorySelect.value = currentFilterCategory;
        sortOrderSelect.value = currentSortOrder;
        openModal(filtersModal);
    });

    closeFiltersModalBtn.addEventListener('click', () => {
        closeModal(filtersModal);
    });

    applyFiltersBtn.addEventListener('click', () => {
        currentFilterStatus = filterStatusSelect.value;
        currentFilterDifficulty = filterDifficultySelect.value;
        currentFilterCategory = filterCategorySelect.value;
        currentSortOrder = sortOrderSelect.value;
        closeModal(filtersModal);
        saveAndRenderAll();
    });

    resetFiltersBtn.addEventListener('click', () => {
        currentFilterStatus = 'all';
        currentFilterDifficulty = 'all';
        currentFilterCategory = 'all';
        currentSortOrder = 'none';

        filterStatusSelect.value = 'all';
        filterDifficultySelect.value = 'all';
        filterCategorySelect.value = 'all';
        sortOrderSelect.value = 'none';

        closeModal(filtersModal);
        saveAndRenderAll();
    });

    // Modale de la boutique
    openShopModalBtn.addEventListener('click', () => {
        openShopModal();
    });

    closeShopModalBtn.addEventListener('click', () => {
        closeModal(shopModal);
    });

    // Écouteur pour les boutons "Acheter" dans la boutique
    shopItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('buy-item-btn')) {
            const itemType = e.target.dataset.item;
            buyItem(itemType);
        }
    });

    // Gérer le changement de thème
    themeSwitch.addEventListener('change', () => {
        isDarkTheme = themeSwitch.checked;
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        localStorage.setItem('isDarkTheme', isDarkTheme.toString());
    });


    // Gérer la fermeture des modales en cliquant sur le bouton "X" général
    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const parentModal = e.target.closest('.modal');
            if (parentModal) {
                closeModal(parentModal);
            }
        });
    });

    // Gérer la fermeture en cliquant en dehors des modales (sauf customAlertModal gérée par showAlert)
    window.addEventListener('click', (event) => {
        if (event.target === profileModal) {
            closeModal(profileModal);
        }
        if (event.target === questFormModal) {
            closeModal(questFormModal);
        }
        if (event.target === filtersModal) {
            closeModal(filtersModal);
        }
        if (event.target === shopModal) {
            closeModal(shopModal);
        }
    });
    
    // Fonction pour vérifier les délais des quêtes et afficher des notifications
function checkQuestDeadlines() {
    // Vérifier si displayNativeNotification est disponible (depuis notification.js)
    if (typeof displayNativeNotification === 'function') {
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        quetes.forEach(quete => {
            const closeDate = new Date(quete.dateFermeture);

            if (!quete.terminee) {
                if (now > closeDate && now - closeDate < oneDay) {
                    if (!localStorage.getItem(`notified_expired_${quete.id}`)) {
                        displayNativeNotification('Quête Expirée !', `La quête "${quete.titre}" a expiré le ${closeDate.toLocaleDateString()}.`);
                        localStorage.setItem(`notified_expired_${quete.id}`, 'true');
                    }
                } else if (closeDate - now < oneDay && closeDate - now > 0) {
                    if (!localStorage.getItem(`notified_deadline_${quete.id}`)) {
                        displayNativeNotification('Quête urgente !', `La quête "${quete.titre}" expire bientôt (${closeDate.toLocaleDateString()}) !`);
                        localStorage.setItem(`notified_deadline_${quete.id}`, 'true');
                    }
                }
            }
            // La logique de suppression des drapeaux lors de la terminaison/réactivation
            // est déjà dans `toggleQueteStatus`, ce qui est une bonne chose.
        });
    } else {
        console.warn("La fonction 'displayNativeNotification' n'est pas disponible. Le script de notifications n'est peut-être pas chargé correctement.");
    }
}

// Assurez-vous d'appeler checkQuestDeadlines() au chargement et via setInterval dans script.js
// Initialisation au chargement
renderAll();
checkQuestDeadlines(); // Appeler au chargement
setInterval(checkQuestDeadlines, 60 * 60 * 1000); // Vérifier les délais toutes les heures

}); // FIN DE DOMContentLoaded
