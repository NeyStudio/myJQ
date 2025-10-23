// 🔴 REMPLACEZ CETTE CHAÎNE PAR L'URL OBTENUE DE RENDER ! 🔴
const BACKEND_URL = 'https://sc-production-6d0a.up.railway.app'; 

let currentUser = null; 
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const userSelectionDiv = document.getElementById('user-selection');
const chatInterfaceDiv = document.getElementById('chat-interface');
const currentUserDisplay = document.getElementById('current-user-display');
const statusDisplay = document.getElementById('connection-status');
const typingIndicator = document.getElementById('typing-indicator');
const otherUserStatus = document.getElementById('other-user-status'); // Statut en ligne

let socket; 
let typingTimeout;
const TYPING_TIMER_LENGTH = 1500; 

// --- Logique de Sélection de l'Utilisateur par Bouton ---
document.getElementById('select-Olga').addEventListener('click', () => initializeChat('Olga'));
document.getElementById('select-Eric').addEventListener('click', () => initializeChat('Eric'));


function initializeChat(user) {
    currentUser = user;
    userSelectionDiv.classList.add('hidden');
    chatInterfaceDiv.classList.remove('hidden');
    currentUserDisplay.textContent = user;
    
    // 1. Initialiser la connexion Socket.IO
    socket = io(BACKEND_URL); 

    // 2. Événements de connexion/déconnexion
    socket.on('connect', () => {
        statusDisplay.textContent = 'Connexion au chat';
        statusDisplay.style.color = 'orange';
        messagesContainer.innerHTML = ''; 
        addSystemMessage(`Yoooooooo ${currentUser}, wait ça charge.`);
        socket.emit('user joined', currentUser); 
    });

    socket.on('disconnect', () => {
        statusDisplay.textContent = 'déconnecté';
        statusDisplay.style.color = 'red';
        // Réinitialiser le statut de l'autre utilisateur en cas de déconnexion du serveur
        otherUserStatus.textContent = `(Déconnecté)`;
        otherUserStatus.classList.remove('online');
        otherUserStatus.classList.add('offline');
    });
    
    // 3. Réception de l'historique 
    socket.on('history', function(messages) {
        messagesContainer.innerHTML = ''; 
        statusDisplay.textContent = 'Connexion réussie';
        statusDisplay.style.color = 'green';
        addSystemMessage(`c'est bon, dis tout maintenant.`);
        
        messages.forEach(msg => {
            // Passe le timestamp pour l'affichage
            addMessageToDOM(msg.message, msg.sender, true, msg.timestamp); 
        });
        scrollToBottom();
    });

    // 4. Réception de messages en temps réel
    socket.on('chat message', function(data) {
        typingIndicator.classList.add('hidden');
        // Passe le timestamp du nouveau message
        addMessageToDOM(data.message, data.sender, false, data.timestamp);
    });
    
    // 5. Gestion des événements de frappe
    socket.on('typing', (sender) => {
        if (sender !== currentUser) {
            typingIndicator.textContent = `${sender} est en train d'écrire...`;
            typingIndicator.classList.remove('hidden');
            scrollToBottom();
        }
    });

    socket.on('stop typing', (sender) => {
        if (sender !== currentUser) {
            typingIndicator.classList.add('hidden');
        }
    });
    
    // 6. Gestion des statuts en ligne
    socket.on('online users', (onlineUsers) => {
        const otherUser = (currentUser === 'Olga') ? 'Eric' : 'Olga';
        
        if (onlineUsers.includes(otherUser)) {
            otherUserStatus.textContent = `(${otherUser} est en ligne)`;
            otherUserStatus.classList.remove('offline');
            otherUserStatus.classList.add('online');
        } else {
            otherUserStatus.textContent = `(${otherUser} est déconnecté)`;
            otherUserStatus.classList.remove('online');
            otherUserStatus.classList.add('offline');
        }
    });
}

// --- Logique d'Envoi de Message ---
messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser && socket.connected) {
        socket.emit('chat message', {
            message: messageText,
            sender: currentUser
        });
        messageInput.value = '';
        
        if (socket) {
            socket.emit('stop typing', currentUser);
            clearTimeout(typingTimeout);
        }
    } else if (!socket.connected) {
        alert("Erreur: Vous n'êtes pas connecté au serveur de chat.");
    }
});

// --- Gestion de l'indicateur de frappe (Côté Émetteur) ---
messageInput.addEventListener('input', () => {
    if (!currentUser || !socket || !socket.connected) return;

    socket.emit('typing', currentUser);
    
    clearTimeout(typingTimeout);
    
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing', currentUser);
    }, TYPING_TIMER_LENGTH);
});

// --- Fonction de formatage de l'horodatage ---
function formatTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Format H:MM
    return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// --- Fonctions d'Affichage dans le DOM ---
function addMessageToDOM(text, sender, isHistory = false, timestamp) {
    const messageDiv = document.createElement('div');
    const senderClass = (sender === 'Olga' || sender === 'Eric') ? `sender-${sender}` : 'sender-Eric';

    messageDiv.classList.add('message', senderClass); 
    
    // Conteneur pour l'expéditeur et l'heure
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'flex-end'; 

    const senderSpan = document.createElement('span');
    senderSpan.classList.add('message-sender');
    senderSpan.textContent = sender + " :";
    
    // Affichage de l'heure
    const timeSpan = document.createElement('span');
    timeSpan.classList.add('message-time');
    const timeToDisplay = timestamp || new Date(); 
    timeSpan.textContent = formatTimestamp(timeToDisplay);
    
    headerDiv.appendChild(senderSpan);
    headerDiv.appendChild(timeSpan);
    
    messageDiv.appendChild(headerDiv);
    
    // Ajout du texte du message
    const textNode = document.createElement('p');
    textNode.textContent = text;
    textNode.style.margin = '5px 0 0 0'; // Petite marge pour séparer du header
    messageDiv.appendChild(textNode);
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom(); 
}

function addSystemMessage(text) {
    const sysMsg = document.createElement('p');
    sysMsg.style.textAlign = 'center';
    sysMsg.style.fontStyle = 'italic';
    sysMsg.style.fontSize = '0.9em';
    sysMsg.textContent = text;
    messagesContainer.appendChild(sysMsg);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
