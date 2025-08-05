document.addEventListener('DOMContentLoaded', () => {

    /* ==================================
    * GESTION DES ÉLÉMENTS
    * ================================== */
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app-container');
    const mainApp = document.getElementById('main-app');
    const authSection = document.getElementById('auth-section');

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');

    const profilePicContainer = document.getElementById('profile-picture-container');
    const profilePic = document.getElementById('profile-pic');
    const userNameDisplay = document.getElementById('user-name');
    const levelBadge = document.getElementById('level-badge');
    const levelInfo = document.getElementById('level-info');
    const xpProgressBar = document.getElementById('xp-progress-bar');
    const xpText = document.getElementById('xp-text');
    const goldDisplay = document.getElementById('gold-display');
    const diamondDisplay = document.getElementById('diamond-display');
    const logoutButton = document.getElementById('logout-button');

    const openAddQuestModalBtn = document.getElementById('open-add-quest-modal');
    const openShopModalBtn = document.getElementById('open-shop-modal');

    const questList = document.getElementById('quest-list');
    const noQuestMessage = document.getElementById('no-quest-message');

    const questModal = document.getElementById('quest-modal');
    const questForm = document.getElementById('quest-form');
    const questModalTitle = document.getElementById('modal-title');
    const questIdInput = document.getElementById('quest-id');
    const questNameInput = document.getElementById('quest-name');
    const questDescriptionInput = document.getElementById('quest-description');
    const questDifficultyInput = document.getElementById('quest-difficulty');
    const questDueDateInput = document.getElementById('quest-due-date');
    const saveQuestButton = questModal.querySelector('button[type="submit"]');

    const profileModal = document.getElementById('profile-modal');
    const modalProfilePic = document.getElementById('modal-profile-pic');
    const changePicBtn = document.getElementById('change-pic-btn');
    const deletePicBtn = document.getElementById('delete-pic-btn');
    const profilePicUploadInput = document.getElementById('profile-pic-upload');
    const modalUsernameInput = document.getElementById('modal-username');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    const shopModal = document.getElementById('shop-modal');
    const buyItemButtons = shopModal.querySelectorAll('.buy-item-btn');

    const customAlertModal = document.getElementById('custom-alert-modal');
    const customAlertTitle = document.getElementById('custom-alert-title');
    const customAlertMessage = document.getElementById('custom-alert-message');
    const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
    const customAlertConfirmBtn = document.getElementById('custom-alert-confirm-btn');
    const customAlertCancelBtn = document.getElementById('custom-alert-cancel-btn');

    const themeToggle = document.getElementById('theme-toggle');

    const defaultProfilePic = 'https://i.imgur.com/gK9Q7xL.png';


    /* ==================================
    * ÉTAT DE L'APPLICATION
    * ================================== */
    let quests = [];
    let user = {
        name: 'Utilisateur',
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        gold: 0,
        diamonds: 0,
        profilePic: defaultProfilePic
    };

    const difficultyXP = { 'D': 10, 'C': 25, 'B': 50, 'A': 100, 'S': 200 };
    const difficultyGold = { 'D': 5, 'C': 15, 'B': 30, 'A': 60, 'S': 120 };


    /* ==================================
    * FONCTIONS UTILITAIRES
    * ================================== */

    // Persistance des données
    const saveData = () => {
        localStorage.setItem('quests', JSON.stringify(quests));
        localStorage.setItem('user', JSON.stringify(user));
    };

    const loadData = () => {
        const storedQuests = localStorage.getItem('quests');
        const storedUser = localStorage.getItem('user');

        if (storedQuests) {
            quests = JSON.parse(storedQuests);
        }
        if (storedUser) {
            user = JSON.parse(storedUser);
            // Si la photo de profil est null, on remet la photo par défaut
            if (!user.profilePic) {
                user.profilePic = defaultProfilePic;
            }
        }
    };

    // Affiche/Cache les modales
    const openModal = (modal) => {
        modal.style.display = 'flex';
    };

    const closeModal = (modal) => {
        modal.style.display = 'none';
    };

    // Modale d'alerte/confirmation personnalisée
    const showCustomAlert = (title, message, type = 'alert', onConfirm = null) => {
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;

        customAlertOkBtn.classList.add('hidden');
        customAlertConfirmBtn.classList.add('hidden');
        customAlertCancelBtn.classList.add('hidden');

        if (type === 'alert') {
            customAlertOkBtn.classList.remove('hidden');
            customAlertOkBtn.onclick = () => closeModal(customAlertModal);
        } else if (type === 'confirm') {
            customAlertConfirmBtn.classList.remove('hidden');
            customAlertCancelBtn.classList.remove('hidden');
            customAlertConfirmBtn.onclick = () => {
                onConfirm();
                closeModal(customAlertModal);
            };
            customAlertCancelBtn.onclick = () => closeModal(customAlertModal);
        }

        openModal(customAlertModal);
    };

    /* ==================================
    * RENDU DE L'INTERFACE
    * ================================== */

    const renderQuest = (quest) => {
        const li = document.createElement('li');
        li.dataset.id = quest.id;
        li.classList.add('quest');

        // Gérer les classes de statut
        const now = new Date();
        const dueDate = new Date(quest.dueDate);
        if (quest.completed) {
            li.classList.add('completed-quest');
        } else if (dueDate < now) {
            li.classList.add('expired-quest');
        } else if (quest.startDate && new Date(quest.startDate) > now) {
            li.classList.add('future-quest');
        }

        const difficultyClass = `difficulty-${quest.difficulty}`;
        const difficultyText = quest.difficulty;

        li.innerHTML = `
            <div class="quest-info">
                <div class="quest-title">
                    <h3>${quest.name}</h3>
                    <span class="difficulty-badge ${difficultyClass}">${difficultyText}</span>
                </div>
                <p class="quest-description">${quest.description}</p>
                <div class="quest-details">
                    <p>XP : ${difficultyXP[quest.difficulty]}</p>
                    <p>Or : ${difficultyGold[quest.difficulty]}</p>
                    ${quest.dueDate ? `<p>Échéance : ${new Date(quest.dueDate).toLocaleDateString()}</p>` : ''}
                </div>
            </div>
            <div class="quest-actions">
                <button class="toggle-status-btn">${quest.completed ? 'Réactiver' : 'Terminer'}</button>
                <button class="edit-quest-btn">Modifier</button>
                <button class="delete-quest-btn">Supprimer</button>
            </div>
        `;
        questList.appendChild(li);
    };

    const renderQuests = () => {
        questList.innerHTML = '';
        if (quests.length === 0) {
            noQuestMessage.classList.remove('hidden');
        } else {
            noQuestMessage.classList.add('hidden');
            quests.forEach(renderQuest);
        }
    };

    const updateUI = () => {
        userNameDisplay.textContent = user.name;
        levelBadge.textContent = user.level;
        levelInfo.textContent = `Niveau ${user.level}`;
        goldDisplay.textContent = user.gold;
        diamondDisplay.textContent = user.diamonds;
        profilePic.src = user.profilePic;
        modalProfilePic.src = user.profilePic;

        const progress = (user.xp / user.xpToNextLevel) * 100;
        xpProgressBar.style.width = `${progress}%`;
        xpText.textContent = `${user.xp} / ${user.xpToNextLevel} XP`;
    };

    const updateTheme = () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-theme');
            themeToggle.checked = false;
        }
    };

    const showMainApp = () => {
        authSection.classList.add('hidden');
        mainApp.classList.remove('hidden');
    };

    const showAuthSection = () => {
        mainApp.classList.add('hidden');
        authSection.classList.remove('hidden');
    };

    /* ==================================
    * LOGIQUE MÉTIER
    * ================================== */

    const addXP = (amount) => {
        user.xp += amount;
        while (user.xp >= user.xpToNextLevel) {
            user.xp -= user.xpToNextLevel;
            user.level++;
            user.xpToNextLevel = Math.floor(user.xpToNextLevel * 1.5);
            showCustomAlert('Niveau supérieur !', `Félicitations, vous êtes maintenant au niveau ${user.level} !`, 'alert');
        }
        updateUI();
        saveData();
    };

    const addGold = (amount) => {
        user.gold += amount;
        updateUI();
        saveData();
    };

    const toggleQuestStatus = (questId) => {
        const quest = quests.find(q => q.id === questId);
        if (!quest) return;

        quest.completed = !quest.completed;

        if (quest.completed) {
            const xpGain = difficultyXP[quest.difficulty];
            const goldGain = difficultyGold[quest.difficulty];
            addXP(xpGain);
            addGold(goldGain);
            showCustomAlert('Quête terminée !', `Vous gagnez ${xpGain} XP et ${goldGain} Or.`, 'alert');
        } else {
            // Logique de pénalité si on souhaite réactiver une quête terminée
        }
        renderQuests();
        saveData();
    };

    const addOrUpdateQuest = (questData) => {
        if (questData.id) {
            // Mise à jour
            const index = quests.findIndex(q => q.id === questData.id);
            if (index !== -1) {
                quests[index] = { ...quests[index], ...questData };
            }
        } else {
            // Ajout
            const newQuest = { ...questData, id: Date.now(), completed: false };
            quests.unshift(newQuest);
        }
        renderQuests();
        saveData();
    };

    const deleteQuest = (questId) => {
        showCustomAlert('Confirmer la suppression', 'Êtes-vous sûr de vouloir supprimer cette quête ?', 'confirm', () => {
            quests = quests.filter(q => q.id !== questId);
            renderQuests();
            saveData();
            showCustomAlert('Quête supprimée !', 'La quête a été supprimée avec succès.', 'alert');
        });
    };

    const buyItem = (itemType) => {
        let success = false;
        let message = '';
        switch (itemType) {
            case 'potion_xp':
                if (user.gold >= 100) {
                    user.gold -= 100;
                    addXP(100);
                    success = true;
                    message = 'Vous avez consommé une Potion de Vie ! +100 XP.';
                } else {
                    message = 'Pas assez d\'or pour acheter cet article.';
                }
                break;
            case 'diamonds_pack':
                if (user.gold >= 500) {
                    user.gold -= 500;
                    user.diamonds += 10;
                    success = true;
                    message = 'Vous avez acheté un sac de 10 diamants.';
                } else {
                    message = 'Pas assez d\'or pour acheter cet article.';
                }
                break;
            case 'power_ring':
                if (user.diamonds >= 1) {
                    user.diamonds -= 1;
                    // Logique pour l'effet de l'anneau (ici, on simule)
                    success = true;
                    message = 'Vous avez équipé l\'Anneau de Pouvoir !';
                } else {
                    message = 'Pas assez de diamants pour acheter cet article.';
                }
                break;
        }
        updateUI();
        saveData();
        showCustomAlert('Achat', message, 'alert');
        if (success) {
            closeModal(shopModal);
        }
    };


    /* ==================================
    * GESTIONNAIRES D'ÉVÉNEMENTS
    * ================================== */

    // Gestion du splash screen
    const hideSplashScreen = () => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 1000); // Fait disparaître le splash après la transition
    };

    // Gestion de l'authentification
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Simuler une connexion
        const email = loginForm.querySelector('#login-email').value;
        const password = loginForm.querySelector('#login-password').value;
        if (email && password) {
            showMainApp();
            saveData();
        } else {
            showCustomAlert('Erreur', 'Veuillez remplir tous les champs.', 'alert');
        }
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Simuler une inscription
        const username = signupForm.querySelector('#signup-username').value;
        const email = signupForm.querySelector('#signup-email').value;
        const password = signupForm.querySelector('#signup-password').value;
        if (username && email && password) {
            user.name = username;
            showMainApp();
            saveData();
        } else {
            showCustomAlert('Erreur', 'Veuillez remplir tous les champs.', 'alert');
        }
    });

    logoutButton.addEventListener('click', () => {
        showCustomAlert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', 'confirm', () => {
            localStorage.clear(); // Efface toutes les données
            quests = [];
            user = { name: 'Utilisateur', level: 1, xp: 0, xpToNextLevel: 100, gold: 0, diamonds: 0, profilePic: defaultProfilePic };
            renderQuests();
            updateUI();
            showAuthSection();
            showCustomAlert('Déconnexion réussie', 'Vous avez été déconnecté.', 'alert');
        });
    });


    // Gestionnaire des modales
    openAddQuestModalBtn.addEventListener('click', () => {
        questModalTitle.textContent = 'Ajouter une quête';
        questForm.reset();
        questIdInput.value = '';
        saveQuestButton.textContent = 'Sauvegarder la quête';
        openModal(questModal);
    });

    profilePicContainer.addEventListener('click', () => {
        modalUsernameInput.value = user.name;
        openModal(profileModal);
    });

    openShopModalBtn.addEventListener('click', () => {
        openModal(shopModal);
    });

    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === questModal) closeModal(questModal);
        if (e.target === profileModal) closeModal(profileModal);
        if (e.target === shopModal) closeModal(shopModal);
        if (e.target === customAlertModal) closeModal(customAlertModal);
    });


    // Formulaire de quête
    questForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const questData = {
            id: questIdInput.value || null,
            name: questNameInput.value,
            description: questDescriptionInput.value,
            difficulty: questDifficultyInput.value,
            dueDate: questDueDateInput.value,
        };
        addOrUpdateQuest(questData);
        closeModal(questModal);
        showCustomAlert('Succès', 'Quête sauvegardée avec succès !', 'alert');
    });

    // Événements de la liste de quêtes
    questList.addEventListener('click', (e) => {
        const questElement = e.target.closest('li.quest');
        if (!questElement) return;

        const questId = parseInt(questElement.dataset.id, 10);
        const quest = quests.find(q => q.id === questId);
        if (!quest) return;

        if (e.target.classList.contains('toggle-status-btn')) {
            toggleQuestStatus(questId);
        } else if (e.target.classList.contains('edit-quest-btn')) {
            questModalTitle.textContent = 'Modifier la quête';
            questIdInput.value = quest.id;
            questNameInput.value = quest.name;
            questDescriptionInput.value = quest.description;
            questDifficultyInput.value = quest.difficulty;
            questDueDateInput.value = quest.dueDate;
            saveQuestButton.textContent = 'Modifier la quête';
            openModal(questModal);
        } else if (e.target.classList.contains('delete-quest-btn')) {
            deleteQuest(questId);
        }
    });

    // Gestion du profil
    changePicBtn.addEventListener('click', () => {
        profilePicUploadInput.click();
    });

    profilePicUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                user.profilePic = e.target.result;
                modalProfilePic.src = user.profilePic;
                profilePic.src = user.profilePic;
                saveData();
                showCustomAlert('Photo mise à jour', 'Votre photo de profil a été mise à jour.', 'alert');
            };
            reader.readAsDataURL(file);
        }
    });

    deletePicBtn.addEventListener('click', () => {
        showCustomAlert('Confirmer la suppression', 'Êtes-vous sûr de vouloir supprimer votre photo de profil ?', 'confirm', () => {
            user.profilePic = defaultProfilePic;
            modalProfilePic.src = user.profilePic;
            profilePic.src = user.profilePic;
            saveData();
            showCustomAlert('Photo supprimée', 'Votre photo de profil a été restaurée par défaut.', 'alert');
        });
    });

    saveProfileBtn.addEventListener('click', () => {
        user.name = modalUsernameInput.value;
        updateUI();
        saveData();
        closeModal(profileModal);
        showCustomAlert('Profil sauvegardé', 'Vos modifications ont été enregistrées.', 'alert');
    });

    // Gestion de la boutique
    buyItemButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const itemType = e.target.dataset.item;
            buyItem(itemType);
        });
    });

    // Bascule du thème clair/sombre
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });

    /* ==================================
    * INITIALISATION
    * ================================== */
    const init = () => {
        // Simuler le chargement et afficher le splash screen
        setTimeout(() => {
            hideSplashScreen();
            // Charger les données de l'utilisateur
            loadData();

            // S'il n'y a pas de nom d'utilisateur, on suppose que l'utilisateur n'est pas connecté
            // C'est une simulation simple, dans une vraie app, on vérifierait un token
            if (!user.name || user.name === 'Utilisateur') {
                showAuthSection();
            } else {
                showMainApp();
            }

            // Rendre l'interface une fois que les données sont chargées
            updateTheme();
            updateUI();
            renderQuests();

        }, 2000); // Afficher le splash screen pendant 2 secondes
    };

    init();

});
