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

// Variables et DOM pour la réponse par glissement (Correction des variables globales)
let isSwiping = false;
let startX = 0;
let currentMessageToReply = null; 
const replyBox = document.getElementById('reply-box');
const replySenderSpan = document.getElementById('reply-sender');
const replyTextSpan = document.getElementById('reply-text');
const cancelReplyButton = document.getElementById('cancel-reply');

// NOUVEAU: Variable pour stocker l'élément en cours de glissement
let currentSwipedElement = null; 


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
    
    // Historique 
    socket.on('history', function(messages) {
        messagesContainer.innerHTML = ''; 
        lastDisplayedDate = null; 
        messages.forEach(msg => {
            addMessageToDOM(msg.message, msg.sender, true, msg.timestamp, msg.replyTo, msg.id); 
        });
        scrollToBottom(); 
    });

    // Message reçu
    socket.on('chat message', function(data) {
        typingIndicator.classList.add('hidden');
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

// Fonction pour initialiser la réponse (inclut la conversion d'ID)
function setReplyContext(messageElement) {
    const sender = messageElement.getAttribute('data-sender');
    const text = messageElement.getAttribute('data-text');
    const id = messageElement.getAttribute('data-id');

    // Conversion explicite de l'ID en entier pour le serveur PostgreSQL
    const replyId = parseInt(id); 

    if (isNaN(replyId) || replyId <= 0) {
        console.error("Erreur: ID de message non valide pour la réponse.", id);
        return; 
    }

    currentMessageToReply = { id: replyId, sender, text }; 
    
    replySenderSpan.textContent = `Répondre à ${sender}`;
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


// --- 5. Logique d'Envoi de Message et de Frappe ---

messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser && socket.connected) {
        
        const messageData = {
            message: messageText,
            sender: currentUser,
            replyTo: currentMessageToReply 
        };
        
        socket.emit('chat message', messageData);
        
        messageInput.value = '';
        clearReplyContext(); 
        
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


// --- 6. Fonctions d'Affichage dans le DOM ---

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
    
    messageDiv.setAttribute('data-sender', sender);
    messageDiv.setAttribute('data-text', text);
    messageDiv.setAttribute('data-id', messageId || Date.now()); 

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
    textNode.innerHTML = autoLink(text);
    
    textNode.style.margin = '5px 0 0 0';
    messageDiv.appendChild(textNode);
    
    messagesContainer.appendChild(messageDiv);
    
    addSwipeListeners(messageDiv);
    
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


// --- 7. Fonctions de gestion du SWIPE (glissement CORRIGÉ) ---

function addSwipeListeners(element) {
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('mousedown', handleTouchStart);
}

function handleTouchStart(e) {
    if (e.type === 'mousedown' && e.button !== 0) return; 

    // Définir l'élément actuel à l'élément sur lequel l'événement a démarré
    currentSwipedElement = this; 

    if (e.type === 'mousedown') {
        document.body.style.overflowX = 'hidden'; 
    }
    
    const eventClientX = e.touches ? e.touches[0].clientX : e.clientX;
    
    startX = eventClientX;
    isSwiping = false; 

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('mousemove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mouseup', handleTouchEnd);
}

function handleTouchMove(e) {
    if (startX === 0 || !currentSwipedElement) return; 

    const eventClientX = e.touches ? e.touches[0].clientX : e.clientX;
    const diffX = eventClientX - startX;
    
    if (diffX > 20) {
        isSwiping = true;
        
        const swipeDistance = Math.min(60, diffX);
        currentSwipedElement.style.transform = `translateX(${swipeDistance}px)`;
        
        if (e.type === 'touchmove') {
            // Empêcher le défilement vertical lors du glissement horizontal
            e.preventDefault(); 
        }
    } else if (diffX < 0 && isSwiping) {
        currentSwipedElement.style.transform = `translateX(0px)`;
        isSwiping = false;
    }
}

function handleTouchEnd(e) {
    // Nettoyage des écouteurs
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('mousemove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('mouseup', handleTouchEnd);
    document.body.style.overflowX = ''; 

    // Ramener le message à sa position d'origine (visuel)
    if (currentSwipedElement) {
        currentSwipedElement.style.transform = `translateX(0px)`;
    }

    // Si un glissement suffisant a été détecté
    if (isSwiping && currentSwipedElement) {
        setReplyContext(currentSwipedElement);
    }
    
    // Réinitialisation
    startX = 0;
    isSwiping = false;
    currentSwipedElement = null; 
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
