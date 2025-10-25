// Définition de l'URL de base de votre serveur (doit correspondre à celle du script principal)
const API_BASE_URL = 'https://myjournaly.quest'; 

document.addEventListener('DOMContentLoaded', () => {
    const messagesContainer = document.getElementById('messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const statusDiv = document.getElementById('status');
    let socket = null;

    // 1. VERIFICATION DE LA SECURITE (JWT)
    const token = localStorage.getItem('messenger_token');
    const username = localStorage.getItem('userName') || 'Inconnu';

    if (!token) {
        // Rediriger immédiatement si le jeton est absent
        alert("Accès refusé. Veuillez vous connecter via la PWA.");
        window.location.href = 'index.html'; // Redirection vers l'écran de login/quêtes
        return;
    }

    // 2. CONNEXION SOCKET.IO SÉCURISÉE
    
    // Le jeton est ajouté ici dans l'objet `auth` de la connexion Socket.IO.
    // Votre backend le lira automatiquement avant d'autoriser la connexion.
    socket = io(API_BASE_URL, { 
        auth: {
            token: token // Le jeton JWT est envoyé ici
        },
        query: {
             // On peut aussi passer le nom d'utilisateur si le backend l'exige
            username: username
        }
    });

    socket.on('connect', () => {
        console.log("Connecté au canal privé !");
        statusDiv.textContent = `Connecté en tant que ${username}. En attente de l'historique...`;
        
        // La vérification du token côté serveur est implicitement faite par l'option 'auth' ci-dessus.
        // On demande ensuite l'historique.
        socket.emit('request history'); 
    });

    // 3. GESTION DES ERREURS D'AUTHENTIFICATION SOCKET
    socket.on('connect_error', (error) => {
        console.error("Erreur de connexion Socket :", error.message);
        if (error.message.includes("jwt expired") || error.message.includes("invalid signature")) {
            // Si le serveur rejette la connexion à cause du JWT invalide/expiré
            alert("Session expirée ou invalide. Veuillez vous reconnecter.");
            localStorage.removeItem('messenger_token'); // Supprime le jeton pour forcer le login
            window.location.href = 'index.html';
        } else {
            statusDiv.textContent = "Erreur de connexion : " + error.message;
        }
    });
    
    // 4. RÉCEPTION DES MESSAGES ET HISTORIQUE

    // Historique des messages
    socket.on('history', (messages) => {
        messagesContainer.innerHTML = ''; // Nettoyer avant d'afficher
        messages.forEach(msg => {
            displayMessage(msg.user, msg.text, msg.timestamp);
        });
        scrollToBottom();
    });

    // Nouveau message
    socket.on('chat message', (data) => {
        displayMessage(data.user, data.text, data.timestamp);
        scrollToBottom();
    });

    // 5. ENVOI DES MESSAGES
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();

        if (text && socket.connected) {
            // Le serveur associera le message à l'utilisateur authentifié
            socket.emit('chat message', { text: text });
            messageInput.value = ''; // Vider le champ
        }
    });
    
    // Fonctions utilitaires
    function displayMessage(user, text, timestamp) {
        const item = document.createElement('div');
        item.classList.add('message');
        if (user === username) {
            item.classList.add('my-message'); // Pour styliser les messages de l'utilisateur actuel
        } else {
            item.classList.add('other-message');
        }

        const time = new Date(timestamp).toLocaleTimeString();
        item.innerHTML = `
            <span class="message-user">${user}</span>
            <span class="message-text">${text}</span>
            <span class="message-time">${time}</span>
        `;
        messagesContainer.appendChild(item);
    }
    
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});
