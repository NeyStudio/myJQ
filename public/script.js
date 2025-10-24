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

// Variables pour la gestion des notifications et du titre
let originalTitle = document.title;
let notificationInterval = null;

// NOUVEAU: Variables et DOM pour la réponse par glissement
let isSwiping = false;
let startX = 0;
let currentMessageToReply = null; // Stocke les données du message cité
const replyBox = document.getElementById('reply-box');
const replySenderSpan = document.getElementById('reply-sender');
const replyTextSpan = document.getElementById('reply-text');
const cancelReplyButton = document.getElementById('cancel-reply');


// --- 1. Logique de Connexion et Statuts ---

function updateGlobalStatus(status) {
    globalConnectionIndicator.classList.remove('green', 'orange', 'red');
    
    if (!navigator.onLine) {
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

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        stopNotification();
    }
});

window.addEventListener('offline', () => {
    updateGlobalStatus('red'); 
});
window.addEventListener('online', () => {
    updateGlobalStatus('orange'); 
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
    
    // Historique (mis à jour pour la réponse)
    socket.on('history', function(messages) {
        messagesContainer.innerHTML = ''; 
        lastDisplayedDate = null; 
        messages.forEach(msg => {
            // Le serveur doit renvoyer msg.replyTo et msg.id
            addMessageToDOM(msg.message, msg.sender, false, msg.timestamp, msg.replyTo, msg.id); 
        });
        scrollToBottom(); 
    });

    // Message reçu (mis à jour pour la réponse)
    socket.on('chat message', function(data) {
        typingIndicator.classList.add('hidden');
        // Le serveur doit renvoyer data.replyTo et data.id
        addMessageToDOM(data.message, data.sender, false, data.timestamp, data.replyTo, data.id);
        
        if (data.sender !== currentUser) {
             startNotification(data.sender);
        }
    });
    
    // Indicateur de frappe
    socket.on('typing', (sender) => {
        if (sender !== currentUser) {
            typingIndicator.textContent = `${sender} est en train d'écrire...`;
            typingIndicator.classList.remove('hidden');
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


// --- 4. Logique de Réponse (Reply) ---

// Fonction pour initialiser la réponse (déclenchée par glissement)
function setReplyContext(messageElement) {
    const sender = messageElement.getAttribute('data-sender');
    const text = messageElement.getAttribute('data-text');
    const id = messageElement.getAttribute('data-id');

    currentMessageToReply = { id, sender, text };
    
    replySenderSpan.textContent = `Répondre à ${sender}`;
    // Limiter l'affichage du texte pour la boîte
    replyTextSpan.textContent = text.length > 50 ? text.substring(0, 50) + '...' : text;
    replyBox.classList.remove('hidden');

    messageInput.focus();
}

// Fonction pour annuler la réponse
function clearReplyContext() {
    currentMessageToReply = null;
    replyBox.classList.add('hidden');
}

// Écouteur pour le bouton Annuler
cancelReplyButton.addEventListener('click', clearReplyContext);


// --- 5. Logique d'Envoi de Message et de Frappe (MISE À JOUR) ---

messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser && socket.connected) {
        
        const messageData = {
            message: messageText,
            sender: currentUser,
            // Ajout du contexte de réponse si présent
            replyTo: currentMessageToReply 
        };
        
        socket.emit('chat message', messageData);
        
        messageInput.value = '';
        clearReplyContext(); // Efface la boîte après l'envoi
        
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


// --- 6. Fonctions d'Affichage dans le DOM (MISE À JOUR) ---

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

function addMessageToDOM(text, sender, isHistory = false, timestamp, replyTo = null, messageId = null) {
    const messageDate = new Date(timestamp);
    const dateString = messageDate.toDateString(); 

    if (lastDisplayedDate !== dateString) {
        addDateSeparator(timestamp);
        lastDisplayedDate = dateString;
    }
    
    const messageDiv = document.createElement('div');
    const senderClass = (sender === 'Olga' || sender === 'Eric') ? `sender-${sender}` : 'sender-Eric';

    messageDiv.classList.add('message', senderClass); 
    
    // NOUVEAU: Ajouter les attributs de données pour le glissement 
    messageDiv.setAttribute('data-sender', sender);
    messageDiv.setAttribute('data-text', text);
    messageDiv.setAttribute('data-id', messageId || Date.now()); 

    // NOUVEAU: Afficher la bulle de citation si 'replyTo' existe
    if (replyTo && replyTo.sender && replyTo.text) {
        const replyBubble = document.createElement('div');
        replyBubble.classList.add('message-reply');
        replyBubble.innerHTML = `
            <span class="message-reply-sender">${replyTo.sender}</span>
            ${replyTo.text.length > 50 ? replyTo.text.substring(0, 50) + '...' : replyTo.text}
        `;
        messageDiv.appendChild(replyBubble);
    }
    
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
    
    // NOUVEAU: Ajout des écouteurs d'événements de glissement au message
    addSwipeListeners(messageDiv);
    
    if (!isHistory) {
        scrollToBottom(); 
    }
}

// ... (addDateSeparator et addSystemMessage inchangés) ...


// --- 7. Fonctions de gestion du SWIPE (glissement) ---

function addSwipeListeners(element) {
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('mousedown', handleTouchStart);
}

function handleTouchStart(e) {
    if (e.type === 'mousedown' && e.button !== 0) return; 

    // Assurez-vous que le défilement de la conversation n'est pas bloqué lors d'un simple clic
    if (e.type === 'mousedown') {
        // Empêche le défilement horizontal du corps si l'utilisateur commence à glisser
        document.body.style.overflowX = 'hidden'; 
    }

    const eventClientX = e.touches ? e.touches[0].clientX : e.clientX;
    
    startX = eventClientX;
    isSwiping = false; 

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('mousemove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mouseup', handleTouchEnd);
    
    this.messageElement = this; 
}

function handleTouchMove(e) {
    if (startX === 0 || !handleTouchStart.messageElement) return; 

    const eventClientX = e.touches ? e.touches[0].clientX : e.clientX;
    const diffX = eventClientX - startX;
    
    // Glissement vers la droite (diffX positif)
    if (diffX > 20) {
        isSwiping = true;
        
        // Applique la transformation visuelle (max 60px)
        const swipeDistance = Math.min(60, diffX);
        handleTouchStart.messageElement.style.transform = `translateX(${swipeDistance}px)`;
    } else if (diffX < 0 && isSwiping) {
        // L'utilisateur annule le glissement
        handleTouchStart.messageElement.style.transform = `translateX(0px)`;
        isSwiping = false;
    }
}

function handleTouchEnd(e) {
    // Nettoyage des écouteurs
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('mousemove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('mouseup', handleTouchEnd);
    document.body.style.overflowX = ''; // Rétablit le défilement horizontal

    // Ramener le message à sa position d'origine (visuel)
    if (handleTouchStart.messageElement) {
        handleTouchStart.messageElement.style.transform = `translateX(0px)`;
    }

    // Si un glissement suffisant a été détecté
    if (isSwiping) {
        setReplyContext(handleTouchStart.messageElement);
    }
    
    // Réinitialisation
    startX = 0;
    isSwiping = false;
    handleTouchStart.messageElement = null;
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
