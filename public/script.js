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
const typingBubbleWrapper = document.getElementById('typing-bubble-wrapper'); 
const typingIndicatorBubble = document.getElementById('typing-indicator-bubble'); 
const reactionPicker = document.getElementById('reaction-picker'); 
const scrollToBottomButton = document.getElementById('scroll-to-bottom-button'); 

let socket; 
let typingTimeout;
const TYPING_TIMER_LENGTH = 1500; 
let lastDisplayedDate = null; 

let originalTitle = document.title;
let notificationInterval = null;

let isSwiping = false;
let startX = 0;
let currentMessageToReply = null; 
const replyBox = document.getElementById('reply-box');
const replySenderSpan = document.getElementById('reply-sender');
const replyTextSpan = document.getElementById('reply-text');
const cancelReplyButton = document.getElementById('cancel-reply');

let currentSwipedElement = null; 
let messageToReactTo = null; 


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
        
        // CORRIGÉ: S'assurer que le wrapper de frappe est là, mais invisible, pour la stabilisation
        if (!messagesContainer.contains(typingBubbleWrapper)) {
            messagesContainer.appendChild(typingBubbleWrapper);
        }
        typingBubbleWrapper.classList.add('hidden'); 

        messages.forEach(msg => {
            addMessageToDOM(msg.message, msg.sender, true, msg.timestamp, msg.replyTo, msg.id, msg.reactions); 
        });
        scrollToBottom(); 
    });

    // Message reçu
    socket.on('chat message', function(data) {
        typingBubbleWrapper.classList.add('hidden');
        
        addMessageToDOM(data.message, data.sender, false, data.timestamp, data.replyTo, data.id, data.reactions); 
        
        if (data.sender !== currentUser) {
             startNotification(data.sender);
        }
    });
    
    // Indicateur de frappe
    socket.on('typing', (sender) => {
        if (sender !== currentUser) {
            typingBubbleWrapper.classList.remove('hidden');
            scrollToBottom(); 
        }
    });

    socket.on('stop typing', (sender) => {
        if (sender !== currentUser) {
            typingBubbleWrapper.classList.add('hidden');
        }
    });
    
    // Mise à jour des réactions
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
    
    messagesContainer.addEventListener('scroll', toggleScrollToBottomButton);
}


// --- 4. Logique de Réponse (Reply) (Inchagée) ---

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

function clearReplyContext() {
    currentMessageToReply = null;
    replyBox.classList.add('hidden');
}

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

function addDateSeparator(timestamp) {
    const separatorContainer = document.createElement('div');
    separatorContainer.classList.add('date-separator-container');

    const separator = document.createElement('span');
    separator.classList.add('date-separator');
    separator.textContent = formatSeparatorDate(timestamp);
    
    separatorContainer.appendChild(separator);
    messagesContainer.insertBefore(separatorContainer, typingBubbleWrapper);
}

function addSystemMessage(text) {
    const sysMsg = document.createElement('p');
    sysMsg.style.textAlign = 'center';
    sysMsg.style.fontStyle = 'italic';
    sysMsg.style.fontSize = '0.9em';
    messagesContainer.insertBefore(sysMsg, typingBubbleWrapper);
}

// Logique de stabilisation du défilement et d'insertion de message (CORRIGÉ)
const originalAddMessageToDOM = function(text, sender, isHistory = false, timestamp, replyTo = null, messageId = null, reactions = []) {
    const messageDate = new Date(timestamp);
    const dateString = messageDate.toDateString(); 

    // Gérer le séparateur de date
    if (lastDisplayedDate !== dateString) {
        addDateSeparator(timestamp);
        lastDisplayedDate = dateString;
    }
    
    const messageDiv = document.createElement('div');
    const senderClass = (sender === 'Olga' || sender === 'Eric') ? `sender-${sender}` : 'sender-Eric';

    messageDiv.classList.add('message', senderClass); 
    
    messageDiv.setAttribute('data-sender', sender);
    messageDiv.setAttribute('data-text', text);
    messageDiv.setAttribute('data-id', messageId); 
    messageDiv.setAttribute('id', `msg-${messageId}`); 

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
    
    // Conteneur pour les réactions
    const reactionsContainer = document.createElement('div');
    reactionsContainer.classList.add('reaction-container');
    reactionsContainer.setAttribute('id', `reactions-${messageId}`);
    messageDiv.appendChild(reactionsContainer);
    
    addReactionPickerListener(messageDiv);
    renderReactions(messageId, reactions);
    
    // Insertion AVANT l'indicateur de frappe
    messagesContainer.insertBefore(messageDiv, typingBubbleWrapper);
    
    addSwipeListeners(messageDiv);
    
    if (!isHistory) {
        scrollToBottom(); 
    }
};

// Fonction wrapper pour la stabilisation du défilement (problème 1 résolu)
function addMessageToDOM(text, sender, isHistory = false, timestamp, replyTo = null, messageId = null, reactions = []) {
    let oldScrollHeight = 0;
    
    // Si nous sommes au début de la liste (messagesContainer.scrollTop est proche de 0)
    // ET que nous chargeons l'historique, nous devons stabiliser.
    if (isHistory && messagesContainer.scrollTop < 50) { 
        oldScrollHeight = messagesContainer.scrollHeight;
        
        // Appeler la fonction originale pour l'insertion
        originalAddMessageToDOM(text, sender, isHistory, timestamp, replyTo, messageId, reactions);
        
        // Stabiliser la vue après l'insertion
        const newScrollHeight = messagesContainer.scrollHeight;
        messagesContainer.scrollTop = newScrollHeight - oldScrollHeight;
    } else {
        // Pour les nouveaux messages et le chargement d'historique loin du haut
        originalAddMessageToDOM(text, sender, isHistory, timestamp, replyTo, messageId, reactions);
    }
}


// =======================================================
// Logique d'affichage et de gestion des RÉACTIONS (Problème 3 résolu)
// =======================================================

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
        }, 500); 
    });
    element.addEventListener('touchend', () => clearTimeout(touchTimer));
    element.addEventListener('touchmove', () => clearTimeout(touchTimer));
    
    // Clic sur une réaction existante pour la retirer
    element.querySelector('.reaction-container').addEventListener('click', (e) => {
        const bubble = e.target.closest('.reaction-bubble');
        if (bubble) {
            const emoji = bubble.getAttribute('data-emoji');
            const isUserReaction = bubble.getAttribute('data-users').split(',').includes(currentUser);
            if (isUserReaction) {
                socket.emit('toggle reaction', { 
                    messageId: element.getAttribute('data-id'), 
                    emoji: emoji, 
                    user: currentUser 
                });
                e.stopPropagation(); 
            }
        }
    });
}

function showReactionPicker(x, y) {
    reactionPicker.classList.remove('hidden');
    
    // Adapter la position pour éviter que le picker ne sorte de l'écran
    const pickerWidth = reactionPicker.offsetWidth;
    const pickerHeight = reactionPicker.offsetHeight;
    const containerRect = messagesContainer.getBoundingClientRect();

    let finalX = x;
    let finalY = y - pickerHeight - 10;
    
    if (finalX + pickerWidth > containerRect.right) {
        finalX = containerRect.right - pickerWidth - 5;
    }
    if (finalY < containerRect.top) {
        finalY = y + 10; // Si trop haut, afficher en dessous
    }
    
    reactionPicker.style.left = `${finalX}px`;
    reactionPicker.style.top = `${finalY}px`;
    
    setTimeout(() => {
        document.addEventListener('click', hideReactionPicker, { once: true });
    }, 10);
}

function hideReactionPicker() {
    reactionPicker.classList.add('hidden');
    messageToReactTo = null;
    document.removeEventListener('click', hideReactionPicker);
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
            hideReactionPicker();
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
    
    container.innerHTML = '';

    // 2. Afficher les bulles agrégées
    Object.entries(aggregated).forEach(([emoji, data]) => {
        const bubble = document.createElement('span');
        bubble.classList.add('reaction-bubble');
        bubble.setAttribute('data-emoji', emoji);
        bubble.setAttribute('data-users', data.users.join(','));
        
        let borderClass = '';
        
        const hasEric = data.users.includes('Eric');
        const hasOlga = data.users.includes('Olga');
        
        // Logique de couleur de bordure personnalisée
        if (hasEric && hasOlga) {
            borderClass = 'reaction-border-Both';
        } else if (hasEric) {
            borderClass = 'reaction-border-Eric';
        } else if (hasOlga) {
            borderClass = 'reaction-border-Olga';
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
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('mousemove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('mouseup', handleTouchEnd);
    document.body.style.overflowX = ''; 

    if (currentSwipedElement) {
        currentSwipedElement.style.transform = `translateX(0px)`;
    }

    if (isSwiping && currentSwipedElement) {
        setReplyContext(currentSwipedElement);
    }
    
    startX = 0;
    isSwiping = false;
    currentSwipedElement = null; 
}


// =======================================================
// Logique de DÉFILEMENT et Bouton (Problèmes 1 & 2 résolus)
// =======================================================

function scrollToBottom() {
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
}

function toggleScrollToBottomButton() {
    const maxScroll = messagesContainer.scrollHeight - messagesContainer.clientHeight;
    
    // Afficher si l'utilisateur est loin du bas (plus de 100 pixels du fond)
    if (messagesContainer.scrollTop < maxScroll - 100) {
        scrollToBottomButton.classList.remove('hidden');
    } else {
        scrollToBottomButton.classList.add('hidden');
    }
}

scrollToBottomButton.addEventListener('click', scrollToBottom);
