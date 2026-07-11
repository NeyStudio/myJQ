document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    
    // Retrait de l'écran de chargement
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        splashScreen.addEventListener('transitionend', () => {
            splashScreen.style.display = 'none';
        }, { once: true });
    }, 500);

    // Constantes de configuration
    const applicationServerKey = "BK0seamUKXsLFEQEXytaDWTl1C0TgsuRt4jpWOx2zbi1VidYl_Nn5f7kO2x2ES4lnh7tjVxFBFip_rRCw3vnOSI"; 
    const XP_PER_DIFFICULTY = { 'D': 50, 'C': 100, 'B': 200, 'A': 500, 'S': 1000 };
    const GEMS_PER_DIFFICULTY = { 'D': 0, 'C': 0, 'B': 1, 'A': 3, 'S': 5 };
    const BASE_XP_FOR_LEVEL_UP = 1000;
    const XP_INCREMENT_PER_LEVEL = 50;
    const COINS_PER_LEVEL_GAIN = 10;
    const COINS_BONUS_PER_LEVEL = 1;
    const defaultPicture = "dem.png";

    // Éléments du DOM principal
    const profilePictureContainer = document.getElementById('profile-picture-container');
    const profilePicture = document.getElementById('profile-picture');
    const levelBadgeText = document.getElementById('level-badge').querySelector('span');
    const xpProgressBar = document.getElementById('xp-progress-bar');
    const xpText = document.getElementById('xp-text');
    const mesQuetesUL = document.getElementById('mesQuetes');
    const coinsDisplay = document.getElementById('coins-display');
    const gemsDisplay = document.getElementById('gems-display');
    const userNameDisplay = document.getElementById('user-name-display');

    // Modales
    const profileModal = document.getElementById('profile-modal');
    const questFormModal = document.getElementById('quest-form-modal');
    const filtersModal = document.getElementById('filters-modal');
    const shopModal = document.getElementById('shop-modal');
    const customAlertModal = document.getElementById('custom-alert-modal');

    // Formulaires et Filtres
    const modalProfilePicture = document.getElementById('modal-profile-picture');
    const modalLevelDisplay = document.getElementById('modal-level');
    const modalXpDisplay = document.getElementById('modal-xp');
    const modalCoinsDisplay = document.getElementById('modal-coins');
    const modalGemsDisplay = document.getElementById('modal-gems');
    const profilePictureInput = document.getElementById('profile-picture-input');
    const profilePictureDelete = document.getElementById('profile-picture-delete');
    const userNameInput = document.getElementById('user-name-input');
    const addQuestForm = document.getElementById('add-quest-form');
    
    const filterStatusSelect = document.getElementById('filter-status');
    const filterDifficultySelect = document.getElementById('filter-difficulty');
    const filterCategorySelect = document.getElementById('filter-category');
    const sortOrderSelect = document.getElementById('sort-order');

    // Variables d'état
    let quetes = JSON.parse(localStorage.getItem('quetes')) || [];
    let userXp = parseInt(localStorage.getItem('userXp') || '0');
    let userProfilePic = localStorage.getItem('userProfilePic') || defaultPicture;
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

    // Application des données initiales
    profilePicture.src = userProfilePic;
    modalProfilePicture.src = userProfilePic;
    userNameDisplay.textContent = userName;
    userNameInput.value = userName;

    // Gestion du thème initial
    document.body.classList.toggle('dark-theme', isDarkTheme);
    document.getElementById('checkbox').checked = isDarkTheme;

    // Gestionnaires de Modales Globaux
    function openModal(modalElement) { modalElement.style.display = 'flex'; }
    function closeModal(modalElement) {
        modalElement.style.display = 'none';
        if (modalElement === questFormModal) {
            addQuestForm.reset();
            editingQuestId = null;
        }
    }

    // Alerte Personnalisée Synchrone via Promise
    function showAlert(title, message, isConfirm = false) {
        return new Promise(resolve => {
            document.getElementById('custom-alert-title').textContent = title;
            document.getElementById('custom-alert-message').textContent = message;
            
            const container = document.getElementById('alert-buttons-container');
            container.innerHTML = '';

            if (isConfirm) {
                const confirmBtn = document.createElement('button');
                confirmBtn.textContent = 'Oui';
                confirmBtn.className = 'main-button';
                confirmBtn.onclick = () => { closeModal(customAlertModal); resolve(true); };

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Non';
                cancelBtn.className = 'secondary-button';
                cancelBtn.onclick = () => { closeModal(customAlertModal); resolve(false); };

                container.appendChild(confirmBtn);
                container.appendChild(cancelBtn);
            } else {
                const okBtn = document.createElement('button');
                okBtn.textContent = 'OK';
                okBtn.className = 'main-button';
                okBtn.onclick = () => { closeModal(customAlertModal); resolve(true); };
                container.appendChild(okBtn);
            }
            openModal(customAlertModal);
        });
    }

    // Gestion du Profil
    function saveProfile() {
        localStorage.setItem('userName', userName);
        localStorage.setItem('userProfilePic', userProfilePic);
        profilePicture.src = userProfilePic;
        modalProfilePicture.src = userProfilePic;
        userNameDisplay.textContent = userName;
        showAlert('Profil JournalyQuest', 'Données sauvegardées avec succès !');
        saveAndRenderAll(false);
    }

    function deletePicture() {
        userProfilePic = defaultPicture;
        modalProfilePicture.src = userProfilePic;
        profilePicture.src = userProfilePic;
        showAlert('Photo de profil', 'Restauration par défaut effectuée !');
        saveAndRenderAll(false);
    }

    // Gestion des Quêtes
    function addQuest(titre, description, dateOuverture, dateFermeture, difficulte, categorie) {
        if (titre === "Olgi2006") {
            window.location.href = "https://myjournaly.quest/public/index.html";
            return;
        }
        const newQuest = {
            id: Date.now().toString(),
            titre, description, dateOuverture, dateFermeture, difficulte, categorie,
            terminee: false
        };
        quetes.push(newQuest);
        showAlert('Succès', `Quête "${titre}" ajoutée au registre !`);
    }

    function updateQuest(id, titre, description, dateOuverture, dateFermeture, difficulte, categorie) {
        const index = quetes.findIndex(q => q.id === id);
        if (index !== -1) {
            quetes[index] = { ...quetes[index], titre, description, dateOuverture, dateFermeture, difficulte, categorie };
            showAlert('Mise à jour', `Quête "${titre}" modifiée !`);
        }
    }

    function toggleQueteStatus(id) {
        const quete = quetes.find(q => q.id === id);
        if (!quete) return;

        const now = new Date();
        const closeDate = new Date(quete.dateFermeture);
        const openDate = new Date(quete.dateOuverture);

        if (!quete.terminee) {
            if (now < openDate) {
                showAlert('Action Impossible', 'Période d\'ouverture non atteinte.');
                return;
            }
            if (now > closeDate) {
                showAlert('Action Impossible', 'Date de fermeture dépassée.');
                return;
            }
            quete.terminee = true;
            userXp += XP_PER_DIFFICULTY[quete.difficulte] || 0;
            userGems += GEMS_PER_DIFFICULTY[quete.difficulte] || 0;
            showAlert('Félicitations', `Gain de ${XP_PER_DIFFICULTY[quete.difficulte]} XP !`);
        } else {
            quete.terminee = false;
            userXp = Math.max(0, userXp - (XP_PER_DIFFICULTY[quete.difficulte] || 0));
            userGems = Math.max(0, userGems - (GEMS_PER_DIFFICULTY[quete.difficulte] || 0));
            showAlert('Statut', 'Quête réactivée. Ajustement des scores effectué.');
        }
        saveAndRenderAll();
    }

    // Sauvegarde Collective
    function saveAndRenderAll(fullRender = true) {
        localStorage.setItem('quetes', JSON.stringify(quetes));
        localStorage.setItem('userXp', userXp.toString());
        localStorage.setItem('userCoins', userCoins.toString());
        localStorage.setItem('userGems', userGems.toString());
        localStorage.setItem('lastNotifiedLevel', lastNotifiedLevel.toString());
        localStorage.setItem('currentFilterStatus', currentFilterStatus);
        localStorage.setItem('currentFilterDifficulty', currentFilterDifficulty);
        localStorage.setItem('currentFilterCategory', currentFilterCategory);
        localStorage.setItem('currentSortOrder', currentSortOrder);

        coinsDisplay.textContent = userCoins;
        gemsDisplay.textContent = userGems;

        if (fullRender) renderQuetes();
        updateLevelBadge();
    }

    // Rendu de l'Interface de Tri et Filtre
    function renderQuetes() {
        mesQuetesUL.innerHTML = '';
        const now = new Date();

        let tempQuetes = quetes.filter(q => {
            let matchesStatus = true;
            if (currentFilterStatus !== 'all') {
                const op = new Date(q.dateOuverture);
                const cl = new Date(q.dateFermeture);
                if (currentFilterStatus === 'active') matchesStatus = (now >= op && now <= cl && !q.terminee);
                else if (currentFilterStatus === 'completed') matchesStatus = q.terminee;
                else if (currentFilterStatus === 'future') matchesStatus = (now < op && !q.terminee);
                else if (currentFilterStatus === 'expired') matchesStatus = (now > cl && !q.terminee);
            }
            let matchesDiff = currentFilterDifficulty === 'all' || q.difficulte === currentFilterDifficulty;
            let matchesCat = currentFilterCategory === 'all' || q.categorie === currentFilterCategory;
            return matchesStatus && matchesDiff && matchesCat;
        });

        tempQuetes.sort((a, b) => {
            const order = ['D', 'C', 'B', 'A', 'S'];
            if (currentSortOrder === 'difficulty-asc') return order.indexOf(a.difficulte) - order.indexOf(b.difficulte);
            if (currentSortOrder === 'difficulty-desc') return order.indexOf(b.difficulte) - order.indexOf(a.difficulte);
            if (currentSortOrder === 'open-date-asc') return new Date(a.dateOuverture) - new Date(b.dateOuverture);
            if (currentSortOrder === 'open-date-desc') return new Date(b.dateOuverture) - new Date(a.dateOuverture);
            if (currentSortOrder === 'close-date-asc') return new Date(a.dateFermeture) - new Date(b.dateFermeture);
            if (currentSortOrder === 'close-date-desc') return new Date(b.dateFermeture) - new Date(a.dateFermeture);
            return 0;
        });

        if (tempQuetes.length === 0) {
            mesQuetesUL.innerHTML = '<li class="no-quest-message">Aucune quête disponible avec ces filtres.</li>';
            return;
        }

        tempQuetes.forEach(q => {
            const li = document.createElement('li');
            const op = new Date(q.dateOuverture);
            const cl = new Date(q.dateFermeture);
            
            let cName = 'active-quest';
            if (q.terminee) cName = 'completed-quest';
            else if (now < op) cName = 'future-quest';
            else if (now > cl) cName = 'expired-quest';
            li.classList.add(cName);

            const catBadge = q.categorie && q.categorie !== 'none' ? `<span class="category-badge">${q.categorie}</span>` : '';

            li.innerHTML = `
                <div class="quest-info">
                    <h4 class="quest-title">${q.titre} <span class="difficulty-badge difficulty-${q.difficulte}">${q.difficulte}</span></h4>
                    <p class="quest-description">${q.description || 'Sans description.'}</p>
                    <div class="quest-details">
                        <span>Du ${op.toLocaleDateString()} au ${cl.toLocaleDateString()}</span>
                        ${catBadge}
                    </div>
                </div>
                <div class="quest-actions">
                    <button class="toggle-status-btn" data-id="${q.id}">${q.terminee ? 'Réactiver' : 'Terminer'}</button>
                    <button class="edit-quest-btn" data-id="${q.id}">Modifier</button>
                    <button class="delete-quest-btn" data-id="${q.id}">Supprimer</button>
                </div>
            `;
            mesQuetesUL.appendChild(li);
        });
    }

    function updateLevelBadge() {
        let level = 1;
        let xpNeeded = BASE_XP_FOR_LEVEL_UP;
        let totalXpAccumulated = 0;

        while (userXp >= totalXpAccumulated + xpNeeded) {
            totalXpAccumulated += xpNeeded;
            level++;
            xpNeeded = BASE_XP_FOR_LEVEL_UP + (level - 1) * XP_INCREMENT_PER_LEVEL;
        }

        levelBadgeText.textContent = `Lv ${level}`;

        if (level > lastNotifiedLevel) {
            const reward = COINS_PER_LEVEL_GAIN + (level * COINS_BONUS_PER_LEVEL);
            userCoins += reward;
            lastNotifiedLevel = level;
            showAlert('Niveau Supérieur !', `Progression au Niveau ${level} ! Bonus de +${reward} pièces.`);
            saveAndRenderAll(false);
        }

        const currentLevelXp = Math.max(0, userXp - totalXpAccumulated);
        const pct = (currentLevelXp / xpNeeded) * 100;
        xpProgressBar.style.width = `${pct}%`;
        xpText.textContent = `${currentLevelXp} / ${xpNeeded} XP`;
    }

    // Événements - Attribution des Écouteurs de Clics Épurés
    profilePictureContainer.onclick = () => {
        modalLevelDisplay.textContent = levelBadgeText.textContent;
        modalXpDisplay.textContent = userXp;
        modalCoinsDisplay.textContent = userCoins;
        modalGemsDisplay.textContent = userGems;
        openModal(profileModal);
    };

    document.getElementById('close-profile-modal-btn').onclick = () => closeModal(profileModal);
    
    saveProfileBtn.onclick = () => {
        userName = userNameInput.value.trim();
        saveProfile();
        closeModal(profileModal);
    };

    profilePictureInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                userProfilePic = uploadEvent.target.result;
                saveProfile();
            };
            reader.readAsDataURL(file);
        }
    };

    profilePictureDelete.onclick = () => {
        showAlert('Validation', 'Confirmer la suppression de la photo ?', true).then(confirm => {
            if (confirm) deletePicture();
        });
    };

    document.getElementById('open-add-quest-modal-btn').onclick = () => {
        editingQuestId = null;
        document.getElementById('quest-form-title').textContent = 'Ajouter une Nouvelle Quête';
        openModal(questFormModal);
    };

    document.getElementById('close-quest-form-modal-btn').onclick = () => closeModal(questFormModal);

    addQuestForm.onsubmit = (e) => {
        e.preventDefault();
        const t = document.getElementById('quest-title').value.trim();
        const d = document.getElementById('quest-description').value.trim();
        const op = document.getElementById('quest-open-date').value;
        const cl = document.getElementById('quest-close-date').value;
        const diff = document.getElementById('quest-difficulty').value;
        const cat = document.getElementById('quest-category').value;

        if (new Date(op) > new Date(cl)) {
            showAlert('Erreur Calendrier', 'Cohérence des dates requise.');
            return;
        }

        if (editingQuestId) updateQuest(editingQuestId, t, d, op, cl, diff, cat);
        else addQuest(t, d, op, cl, diff, cat);

        closeModal(questFormModal);
        saveAndRenderAll();
    };

    // Actions sur la Liste de Quêtes (Délégation d'événements performante)
    mesQuetesUL.onclick = (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.classList.contains('toggle-status-btn')) {
            toggleQueteStatus(id);
        } else if (e.target.classList.contains('edit-quest-btn')) {
            editingQuestId = id;
            const target = quetes.find(q => q.id === id);
            if (target) {
                document.getElementById('quest-title').value = target.titre;
                document.getElementById('quest-description').value = target.description;
                document.getElementById('quest-open-date').value = target.dateOuverture;
                document.getElementById('quest-close-date').value = target.dateFermeture;
                document.getElementById('quest-difficulty').value = target.difficulte;
                document.getElementById('quest-category').value = target.categorie || 'none';
                document.getElementById('quest-form-title').textContent = 'Modifier la Quête';
                openModal(questFormModal);
            }
        } else if (e.target.classList.contains('delete-quest-btn')) {
            showAlert('Validation', 'Confirmer la suppression définitive de cette quête ?', true).then(confirm => {
                if (confirm) {
                    quetes = quetes.filter(q => q.id !== id);
                    saveAndRenderAll();
                }
            });
        }
    };

    // Filtres & Boutique
    document.getElementById('open-filters-modal-btn').onclick = () => openModal(filtersModal);
    document.getElementById('close-filters-modal-btn').onclick = () => closeModal(filtersModal);
    
    document.getElementById('apply-filters-btn').onclick = () => {
        currentFilterStatus = filterStatusSelect.value;
        currentFilterDifficulty = filterDifficultySelect.value;
        currentFilterCategory = filterCategorySelect.value;
        currentSortOrder = sortOrderSelect.value;
        closeModal(filtersModal);
        saveAndRenderAll();
    };

    document.getElementById('reset-filters-btn').onclick = () => {
        currentFilterStatus = 'all'; currentFilterDifficulty = 'all'; currentFilterCategory = 'all'; currentSortOrder = 'none';
        closeModal(filtersModal);
        saveAndRenderAll();
    };

    document.getElementById('open-shop-modal-btn').onclick = () => openModal(shopModal);
    document.getElementById('close-shop-modal-btn').onclick = () => closeModal(shopModal);

    document.querySelector('.shop-grid').onclick = (e) => {
        if (!e.target.classList.contains('buy-item-btn')) return;
        const mode = e.target.dataset.item;
        if (mode === 'euro' && userGems >= 1) {
            userGems -= 1; userCoins += 100;
            showAlert('Boutique', 'Échange finalisé : +100 pièces.');
        } else if (mode === 'plaisir' && userCoins >= 100) {
            userCoins -= 100; userGems += 1;
            showAlert('Boutique', 'Échange finalisé : +1 Gemme.');
        } else {
            showAlert('Solde Insuffisant', 'Ressources manquantes pour valider la transaction.');
        }
        saveAndRenderAll(false);
    };

    // Thème Bascule
    document.getElementById('checkbox').onchange = (e) => {
        isDarkTheme = e.target.checked;
        document.body.classList.toggle('dark-theme', isDarkTheme);
        localStorage.setItem('isDarkTheme', isDarkTheme.toString());
    };

    // Initialisation
    saveAndRenderAll();
});
