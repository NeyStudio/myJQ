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
const typingIndicatorContainer = document.getElementById('typing-indicator-container'); // MODIFIÉ
const typingIndicatorBubble = document.getElementById('typing-indicator-bubble'); // NOUVEAU
const reactionPicker = document.getElementById('reaction-picker'); // NOUVEAU
const scrollToBottomButton = document.getElementById('scroll-to-bottom-button'); // NOUVEAU

let socket; 
let typingTimeout;
const TYPING_TIMER_LENGTH = 1500; 
let lastDisplayedDate = null; 

// Variables pour la gestion des notifications et du titre
let originalTitle = document.title;
let notificationInterval = null;

// Variables pour la réponse par glissement 
let isSwiping = false;
let startX = 0;
let currentMessageToReply = null; 
const replyBox = document.getElementById('reply-box');
const replySenderSpan = document.getElementById('reply-sender');
const replyTextSpan = document.getElementById('reply-text');
const cancelReplyButton = document.getElementById('cancel-reply');

let currentSwipedElement = null; 
let messageToReactTo = null; // NOUVEAU: ID du message pour les réactions


// --- 1. Logique de Connexion et Statuts (Inchagée) ---

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

// --- 2. Logique de Notification (Inchagée) ---

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
            // NOUVEAU: Passer les réactions à la fonction d'affichage
            addMessageToDOM(msg.message, msg.sender, true, msg.timestamp, msg.replyTo, msg.id, msg.reactions); 
        });
        scrollToBottom(); 
    });

    // Message reçu
    socket.on('chat message', function(data) {
        typingIndicatorContainer.classList.add('hidden'); // MODIFIÉ
        // NOUVEAU: Passer les réactions (qui est vide par défaut à l'envoi)
        addMessageToDOM(data.message, data.sender, false, data.timestamp, data.replyTo, data.id, data.reactions); 
        
        if (data.sender !== currentUser) {
             startNotification(data.sender);
        }
    });
    
    // Indicateur de frappe MODIFIÉ (Bulle Fantôme)
    socket.on('typing', (sender) => {
        if (sender !== currentUser) {
            typingIndicatorContainer.classList.remove('hidden');
        }
    });

    socket.on('stop typing', (sender) => {
        if (sender !== currentUser) {
            typingIndicatorContainer.classList.add('hidden');
        }
    });
    
    // NOUVEAU: Mise à jour des réactions
    socket.on('reaction updated', function(data) {
        updateMessageReactions(data.messageId, data.reactions);
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
    
    // Écouteur de défilement pour le bouton "Retour en bas"
    messagesContainer.addEventListener('scroll', toggleScrollToBottomButton);
}


// --- 4. Logique de Réponse (Reply) (Inchagée) ---

// Fonction pour initialiser la réponse (inclut la conversion d'ID)
function setReplyContext(messageElement) {
    const sender = messageElement.getAttribute('data-sender');
    const text = messageElement.getAttribute('data-text');
    const id = messageElement.getAttribute('data-id');

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


// --- 5. Logique d'Envoi de Message et de Frappe (Inchagée) ---

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


// --- 6. Fonctions d'Affichage dans le DOM et Réactions ---

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

function addMessageToDOM(text, sender, isHistory = false, timestamp, replyTo = null, messageId = null, reactions = []) {
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
    messageDiv.setAttribute('id', `msg-${messageId}`); // ID unique pour la gestion des réactions

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
    
    // NOUVEAU: Conteneur pour les réactions
    const reactionsContainer = document.createElement('div');
    reactionsContainer.classList.add('reaction-container');
    reactionsContainer.setAttribute('id', `reactions-${messageId}`);
    messageDiv.appendChild(reactionsContainer);
    
    // NOUVEAU: Ajouter l'écouteur pour le picker d'emoji
    addReactionPickerListener(messageDiv);
    
    // NOUVEAU: Afficher les réactions existantes
    renderReactions(messageId, reactions);
    
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

// =======================================================
// NOUVEAU: Logique d'affichage et de gestion des RÉACTIONS
// =======================================================

// Affiche le picker d'emoji au clic droit (ou clic long sur mobile)
function addReactionPickerListener(element) {
    // Clic droit/Contexte Menu (Desktop)
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        messageToReactTo = element.getAttribute('data-id');
        showReactionPicker(e.clientX, e.clientY);
    });

    // Clic long (Mobile)
    let touchTimer;
    element.addEventListener('touchstart', (e) => {
        touchTimer = setTimeout(() => {
            e.preventDefault();
            messageToReactTo = element.getAttribute('data-id');
            showReactionPicker(e.touches[0].clientX, e.touches[0].clientY);
        }, 500); // 500ms pour un clic long
    });
    element.addEventListener('touchend', () => clearTimeout(touchTimer));
    element.addEventListener('touchmove', () => clearTimeout(touchTimer));
    
    // Clic sur une réaction existante pour la retirer
    element.querySelector('.reaction-container').addEventListener('click', (e) => {
        const bubble = e.target.closest('.reaction-bubble');
        if (bubble) {
            const emoji = bubble.getAttribute('data-emoji');
            // Retirer uniquement si l'utilisateur a déjà mis cette réaction
            const isUserReaction = bubble.getAttribute('data-users').split(',').includes(currentUser);
            if (isUserReaction) {
                socket.emit('toggle reaction', { 
                    messageId: element.getAttribute('data-id'), 
                    emoji: emoji, 
                    user: currentUser 
                });
                e.stopPropagation(); // Empêcher l'ouverture du picker
            }
        }
    });
}

function showReactionPicker(x, y) {
    reactionPicker.classList.remove('hidden');
    // Positionner le picker près du curseur/doigt
    reactionPicker.style.left = `${Math.min(x, messagesContainer.clientWidth - reactionPicker.offsetWidth - 20)}px`;
    reactionPicker.style.top = `${y - reactionPicker.offsetHeight - 10}px`;
    
    // Masquer le picker si l'utilisateur clique n'importe où ailleurs
    setTimeout(() => {
        document.addEventListener('click', hideReactionPicker, { once: true });
    }, 10);
}

function hideReactionPicker() {
    reactionPicker.classList.add('hidden');
    messageToReactTo = null;
}

// Écouteurs pour les options d'emoji dans le picker
document.querySelectorAll('.emoji-option').forEach(option => {
    option.addEventListener('click', (e) => {
        if (messageToReactTo && currentUser) {
            socket.emit('toggle reaction', { 
                messageId: messageToReactTo, 
                emoji: e.target.getAttribute('data-emoji'), 
                user: currentUser 
            });
        }
    });
});

function renderReactions(messageId, allReactions) {
    const container = document.getElementById(`reactions-${messageId}`);
    if (!container) return;

    // 1. Agréger les réactions
    const aggregated = allReactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = { count: 0, users: [] };
        }
        acc[reaction.emoji].count += 1;
        acc[reaction.emoji].users.push(reaction.user);
        return acc;
    }, {});
    
    // 2. Vider le conteneur
    container.innerHTML = '';

    // 3. Afficher les bulles agrégées
    Object.entries(aggregated).forEach(([emoji, data]) => {
        const bubble = document.createElement('span');
        bubble.classList.add('reaction-bubble');
        bubble.setAttribute('data-emoji', emoji);
        bubble.setAttribute('data-users', data.users.join(',')); // Pour le retrait au clic
        
        let borderClass = '';
        
        if (data.users.length === 1) {
            borderClass = data.users[0] === 'Eric' ? 'reaction-border-Eric' : 'reaction-border-Olga';
        } else if (data.users.length > 1) {
            borderClass = 'reaction-border-Both';
        }
        
        bubble.classList.add(borderClass);
        
        let content = emoji;
        if (data.count > 1) {
            content += `<span class="reaction-count">${data.count}</span>`;
        }
        
        bubble.innerHTML = content;
        container.appendChild(bubble);
    });
}

function updateMessageReactions(messageId, reactions) {
    renderReactions(messageId, reactions);
}


// --- 7. Fonctions de gestion du SWIPE (Inchagées) ---

function addSwipeListeners(element) {
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('mousedown', handleTouchStart);
}

function handleTouchStart(e) {
    if (e.type === 'mousedown' && e.button !== 0) return; 

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

// =======================================================
// NOUVEAU: Logique de DÉFILEMENT (Stabilisation & Bouton)
// =======================================================

function scrollToBottom() {
    // Utiliser le défilement doux pour le nouveau message
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// Logique de stabilisation du défilement pour le chargement de l'historique
const originalAddMessageToDOM = addMessageToDOM; 

addMessageToDOM = function(text, sender, isHistory = false, timestamp, replyTo = null, messageId = null, reactions = []) {
    let oldScrollHeight = 0;
    let shouldStabilize = false;
    
    if (isHistory && messagesContainer.scrollTop < 50) {
        // Enregistrer la hauteur AVANT d'insérer l'historique
        oldScrollHeight = messagesContainer.scrollHeight;
        shouldStabilize = true;
    }
    
    // Exécuter l'ancienne fonction pour insérer le message dans le DOM
    originalAddMessageToDOM(text, sender, isHistory, timestamp, replyTo, messageId, reactions);
    
    if (shouldStabilize) {
        // Calculer la nouvelle hauteur
        const newScrollHeight = messagesContainer.scrollHeight;
        // Déplacer le défilement de la différence de hauteur
        messagesContainer.scrollTop = newScrollHeight - oldScrollHeight;
    }
};

// Logique pour afficher/masquer le bouton "Retour en bas"
function toggleScrollToBottomButton() {
    const maxScroll = messagesContainer.scrollHeight - messagesContainer.clientHeight;
    // Si l'utilisateur est loin du bas (ex: plus de 300px)
    if (messagesContainer.scrollTop < maxScroll - 300) {
        scrollToBottomButton.classList.remove('hidden');
    } else {
        scrollToBottomButton.classList.add('hidden');
    }
}

// Écouteur pour le bouton "Retour en bas"
scrollToBottomButton.addEventListener('click', scrollToBottom);
