// 🔴 REMPLACEZ CETTE CHAÎNE PAR L'URL OBTENUE DE RENDER ! 🔴
const BACKEND_URL = 'https://sc-production-6d0a.up.railway.app'; 

let currentUser = null; 
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const userSelectionDiv = document.getElementById('user-selection');
const chatInterfaceDiv = document.getElementById('chat-interface');

const globalConnectionIndicator = document.getElementById('global-connection-indicator');
const otherUserStatusDot = document.getElementById('other-user-status-dot'); 
const typingIndicator = document.getElementById('typing-indicator');

let socket; 
let typingTimeout;
const TYPING_TIMER_LENGTH = 1500; 
let lastDisplayedDate = null; 

// NOUVEAU: Variables pour la gestion des notifications et du titre
let originalTitle = document.title;
let notificationInterval = null;


// --- 1. Logique de Connexion et Statuts ---

function updateGlobalStatus(status) {
    // status: 'green', 'orange', 'red'
    globalConnectionIndicator.classList.remove('green', 'orange', 'red');
    
    // NOUVEAU: Vérification de l'état du réseau physique
    if (!navigator.onLine) {
        // Priorité maximale à la déconnexion réseau globale
        globalConnectionIndicator.classList.add('red');
        globalConnectionIndicator.title = "Déconnexion réseau (Internet)";
        return;
    }

    globalConnectionIndicator.classList.add(status);
    
    if (status === 'green') {
        globalConnectionIndicator.title = "Connecté au serveur";
    } else if (status === 'orange') {
        globalConnectionIndicator.title = "Connexion en cours...";
    } else if (status === 'red') {
        globalConnectionIndicator.title = "Déconnecté du serveur";
    }
}

function updateOtherUserStatus(isOnline) {
    otherUserStatusDot.classList.remove('green', 'red');
    otherUserStatusDot.classList.add(isOnline ? 'green' : 'red');
}

// --- 2. Logique de Notification (Titre d'Onglet) ---

function startNotification(sender) {
    if (document.visibilityState === 'visible') return;
    if (notificationInterval) return; 
    
    originalTitle = document.title;
    let isNotifying = false;
    
    notificationInterval = setInterval(() => {
        document.title = isNotifying ? originalTitle : `(${sender} a écrit...) - ${originalTitle}`;
        isNotifying = !isNotifying;
    }, 1000); 
}

function stopNotification() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
        document.title = originalTitle;
    }
}

// Événement d'écoute pour arrêter la notification quand l'utilisateur revient sur l'onglet
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        stopNotification();
    }
});

// Événements d'écoute pour le statut réseau natif du navigateur
window.addEventListener('offline', () => {
    updateGlobalStatus('red'); 
});
window.addEventListener('online', () => {
    updateGlobalStatus('orange'); // Tentative de reconnexion
});


// --- 3. Initialisation et Logique Socket.IO ---

document.getElementById('select-Olga').addEventListener('click', () => initializeChat('Olga'));
document.getElementById('select-Eric').addEventListener('click', () => initializeChat('Eric'));


function initializeChat(user) {
    currentUser = user;
    userSelectionDiv.classList.add('hidden');
    chatInterfaceDiv.classList.remove('hidden');
    
    document.getElementById('header-title').textContent = `Chat | ${currentUser}`;
    
    socket = io(BACKEND_URL); 
    
    updateOtherUserStatus(false);
    updateGlobalStatus('orange'); 

    // Connexion
    socket.on('connect', () => {
        updateGlobalStatus('green'); 
        stopNotification(); 
        messagesContainer.innerHTML = ''; 
        addSystemMessage(`Yoooooooo ${currentUser}, wait ça charge.`);
        socket.emit('user joined', currentUser); 
    });

    // Déconnexion
    socket.on('disconnect', () => {
        updateGlobalStatus('red'); 
        updateOtherUserStatus(false);
    });
    
    // Historique
    socket.on('history', function(messages) {
        messagesContainer.innerHTML = ''; 
        lastDisplayedDate = null; 
        messages.forEach(msg => {
            addMessageToDOM(msg.message, msg.sender, false, msg.timestamp); 
        });
        scrollToBottom(); 
    });

    // Message reçu
    socket.on('chat message', function(data) {
        typingIndicator.classList.add('hidden');
        addMessageToDOM(data.message, data.sender, false, data.timestamp);
        
        // Notification pour les messages de l'autre utilisateur
        if (data.sender !== currentUser) {
             startNotification(data.sender);
        }
    });
    
    // Indicateur de frappe (Affichage sans défilement)
    socket.on('typing', (sender) => {
        if (sender !== currentUser) {
            typingIndicator.textContent = `${sender} est en train d'écrire...`;
            typingIndicator.classList.remove('hidden');
            // SCROLLTOBOTTOM RETIRÉ ICI
        }
    });

    socket.on('stop typing', (sender) => {
        if (sender !== currentUser) {
            typingIndicator.classList.add('hidden');
        }
    });
    
    // Statut en ligne
    socket.on('online users', (onlineUsers) => {
        const otherUser = (currentUser === 'Olga') ? 'Eric' : 'Olga';
        
        if (onlineUsers.includes(otherUser)) {
            updateOtherUserStatus(true);
        } else {
            updateOtherUserStatus(false);
        }
    });
}


// --- 4. Logique d'Envoi de Message et de Frappe ---

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


// --- 5. Fonctions d'Affichage dans le DOM (avec autoLink) ---

/**
 * Remplace les URLs trouvées dans un texte par des balises <a> cliquables.
 */
function autoLink(text) {
    const urlRegex = /(\b(https?:\/\/[^\s]+|www\.[^\s]+))/g;
    
    return text.replace(urlRegex, function(url) {
        let fullUrl = url;
        if (!url.match(/^https?:\/\//i)) {
            fullUrl = 'http://' + url;
        }
        return '<a href="' + fullUrl + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
}

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
    textNode.innerHTML = autoLink(text); // Utilisation de autoLink
    
    textNode.style.margin = '5px 0 0 0';
    messageDiv.appendChild(textNode);
    
    messagesContainer.appendChild(messageDiv);
    
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
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
