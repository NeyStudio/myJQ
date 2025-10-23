// 🔴 REMPLACEZ CETTE CHAÎNE PAR L'URL OBTENUE DE RENDER ! 🔴
const BACKEND_URL = 'https://sc-production-6d0a.up.railway.app'; 

let currentUser = null; 
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const userSelectionDiv = document.getElementById('user-selection');
const chatInterfaceDiv = document.getElementById('chat-interface');
const currentUserDisplay = document.getElementById('current-user-display');

// Indicateurs de statut basés sur les points
const globalConnectionIndicator = document.getElementById('global-connection-indicator');
const otherUserStatusDot = document.getElementById('other-user-status-dot'); 

const typingIndicator = document.getElementById('typing-indicator');

let socket; 
let typingTimeout;
const TYPING_TIMER_LENGTH = 1500; 
let lastDisplayedDate = null; 

// --- Logique de Sélection de l'Utilisateur par Bouton ---
document.getElementById('select-Olga').addEventListener('click', () => initializeChat('Olga'));
document.getElementById('select-Eric').addEventListener('click', () => initializeChat('Eric'));

// Fonction utilitaire pour mettre à jour le point de connexion global
function updateGlobalStatus(status) {
    // status: 'green' (connecté), 'orange' (en cours), 'red' (déconnecté)
    globalConnectionIndicator.classList.remove('green', 'orange', 'red');
    globalConnectionIndicator.classList.add(status);
}

// Fonction utilitaire pour mettre à jour le point de statut de l'autre utilisateur
function updateOtherUserStatus(isOnline) {
    otherUserStatusDot.classList.remove('green', 'red');
    otherUserStatusDot.classList.add(isOnline ? 'green' : 'red');
}

function initializeChat(user) {
    currentUser = user;
    userSelectionDiv.classList.add('hidden');
    chatInterfaceDiv.classList.remove('hidden');
    
    // NOUVEAU: Affichage dans le titre pour savoir qui on est
    document.getElementById('header-title').textContent = `Chat | ${currentUser}`;
    
    // 1. Initialiser la connexion Socket.IO
    socket = io(BACKEND_URL); 
    
    updateOtherUserStatus(false);
    updateGlobalStatus('orange'); // En cours de connexion

    // 2. Événements de connexion/déconnexion
    socket.on('connect', () => {
        updateGlobalStatus('green'); // Connecté
        messagesContainer.innerHTML = ''; 
        addSystemMessage(`Yoooooooo ${currentUser}, wait ça charge.`);
        socket.emit('user joined', currentUser); 
    });

    socket.on('disconnect', () => {
        updateGlobalStatus('red'); 
        updateOtherUserStatus(false);
    });
    
    // 3. Réception de l'historique 
    socket.on('history', function(messages) {
        messagesContainer.innerHTML = ''; 
        
        lastDisplayedDate = null; 
        messages.forEach(msg => {
            // Utiliser false pour isHistory pour ne pas appeler scrollToBottom à chaque message
            addMessageToDOM(msg.message, msg.sender, false, msg.timestamp); 
        });
        
        // CORRECTION CLÉ: Assure le défilement vers le bas UNE FOIS après le chargement
        scrollToBottom(); 
    });

    // 4. Réception de messages en temps réel
    socket.on('chat message', function(data) {
        typingIndicator.classList.add('hidden');
        addMessageToDOM(data.message, data.sender, false, data.timestamp);
        // scrollToBottom est appelé par addMessageToDOM
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
            updateOtherUserStatus(true);
        } else {
            updateOtherUserStatus(false);
        }
    });
}

// --- Logique d'Envoi de Message et de Frappe (inchangée) ---
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

messageInput.addEventListener('input', () => {
    if (!currentUser || !socket || !socket.connected) return;

    socket.emit('typing', currentUser);
    
    clearTimeout(typingTimeout);
    
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing', currentUser);
    }, TYPING_TIMER_LENGTH);
});

// --- Fonctions d'Affichage (inchangées sauf pour la correction du scrollToBottom) ---

function formatTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function formatSeparatorDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function addMessageToDOM(text, sender, isHistory = false, timestamp) {
    const messageDate = new Date(timestamp);
    const dateString = messageDate.toDateString(); 

    if (lastDisplayedDate !== dateString) {
        addDateSeparator(timestamp);
        lastDisplayedDate = dateString;
    }
    
    const messageDiv = document.createElement('div');
    const senderClass = (sender === 'Olga' || sender === 'Eric') ? `sender-${sender}` : 'sender-Eric';

    messageDiv.classList.add('message', senderClass); 
    
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'flex-end'; 

    const senderSpan = document.createElement('span');
    senderSpan.classList.add('message-sender');
    senderSpan.textContent = sender + " :";
    
    const timeSpan = document.createElement('span');
    timeSpan.classList.add('message-time');
    const timeToDisplay = timestamp || new Date(); 
    timeSpan.textContent = formatTimestamp(timeToDisplay); 
    
    headerDiv.appendChild(senderSpan);
    headerDiv.appendChild(timeSpan);
    
    messageDiv.appendChild(headerDiv);
    
    const textNode = document.createElement('p');
    textNode.textContent = text;
    textNode.style.margin = '5px 0 0 0';
    messageDiv.appendChild(textNode);
    
    messagesContainer.appendChild(messageDiv);
    
    // Appel de scrollToBottom UNIQUEMENT après l'ajout d'un nouveau message
    if (!isHistory) {
        scrollToBottom(); 
    }
}

function addDateSeparator(timestamp) {
    const separatorContainer = document.createElement('div');
    separatorContainer.classList.add('date-separator-container');

    const separator = document.createElement('span');
    separator.classList.add('date-separator');
    separator.textContent = formatSeparatorDate(timestamp);
    
    separatorContainer.appendChild(separator);
    messagesContainer.appendChild(separatorContainer);
}

function addSystemMessage(text) {
    const sysMsg = document.createElement('p');
    sysMsg.style.textAlign = 'center';
    sysMsg.style.fontStyle = 'italic';
    sysMsg.style.fontSize = '0.9em';
    sysMsg.textContent = text;
    messagesContainer.appendChild(sysMsg);
    // scrollToBottom(); N'est plus appelé ici pour éviter de défiler pendant le chargement initial
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
