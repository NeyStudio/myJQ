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

// NOUVEAU: Éléments DOM pour les nouvelles fonctionnalités
const typingBubbleWrapper = document.getElementById('typing-bubble-wrapper'); 
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
        
        // S'assurer que le wrapper de frappe est dans le DOM mais invisible (au fond)
        if (!messagesContainer.contains(typingBubbleWrapper)) {
            messagesContainer.appendChild(typingBubbleWrapper);
        }
        typingBubbleWrapper.classList.add('hidden'); 

        messages.forEach(msg => {
            addMessageToDOM(msg.message, msg.sender, true, msg.timestamp, msg.replyTo, msg.id, msg.reactions || []); 
        });
    });

    // Message reçu
    socket.on('chat message', function(data) {
        typingBubbleWrapper.classList.add('hidden');
        addMessageToDOM(data.message, data.sender, false, data.timestamp, data.replyTo, data.id, data.reactions || []); 
        
        if (data.sender !== currentUser) {
             startNotification(data.sender);
        }
    });
    
    // Indicateur de frappe
    socket.on('typing', (sender) => {
        if (sender !== currentUser) {
            typingBubbleWrapper.classList.remove('hidden');
            scrollToBottom(true); 
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
    
    // Écouteur pour le bouton de défilement
    messagesContainer.addEventListener('scroll', toggleScrollToBottomButton);
}


// --- 4. Logique de Réponse (Reply) ---

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


// --- 6. Fonctions d'Affichage dans le DOM et DÉFILEMENT STABLE ---

// (Les fonctions de formatage et addSystemMessage/addDateSeparator sont conservées)

function addMessageToDOM(text, sender, isHistory = false, timestamp, replyTo = null, messageId = null, reactions = []) {
    let oldScrollHeight = 0;
    
    // Logique de stabilisation pour l'historique
    if (isHistory && messagesContainer.scrollTop < 50 && messagesContainer.scrollHeight > messagesContainer.clientHeight) { 
        oldScrollHeight = messagesContainer.scrollHeight;
    }

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
    // NOTE: La fonction autoLink est omise ici pour ne pas encombrer, mais elle doit être conservée/ajoutée
    textNode.innerHTML = text; // Utilisez autoLink(text) si disponible
    
    textNode.style.margin = '5px 0 0 0';
    messageDiv.appendChild(textNode);
    
    // Conteneur pour les réactions
    const reactionsContainer = document.createElement('div');
    reactionsContainer.classList.add('reaction-container');
    reactionsContainer.setAttribute('id', `reactions-${messageId}`);
    messageDiv.appendChild(reactionsContainer);
    
    // Insertion AVANT l'indicateur de frappe
    messagesContainer.insertBefore(messageDiv, typingBubbleWrapper);
    
    addReactionPickerListener(messageDiv);
    renderReactions(messageId, reactions);
    
    addSwipeListeners(messageDiv);

    // Application de la stabilisation du défilement
    if (isHistory && oldScrollHeight > 0) {
        const newScrollHeight = messagesContainer.scrollHeight;
        messagesContainer.scrollTop = newScrollHeight - oldScrollHeight;
    } else if (!isHistory) {
        scrollToBottom(true); 
    }
}


// =======================================================
// Logique d'affichage et de gestion des RÉACTIONS
// =======================================================

function addReactionPickerListener(element) {
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        messageToReactTo = element.getAttribute('data-id'); 
        showReactionPicker(e.clientX, e.clientY);
    });

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
    
    const pickerWidth = reactionPicker.offsetWidth;
    const pickerHeight = reactionPicker.offsetHeight;
    const containerRect = messagesContainer.getBoundingClientRect();

    let finalX = x;
    let finalY = y - pickerHeight - 10;
    
    if (finalX + pickerWidth > containerRect.right) {
        finalX = containerRect.right - pickerWidth - 5;
    }
    if (finalY < containerRect.top) {
        finalY = y + 10;
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

    const aggregated = allReactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = { count: 0, users: [] };
        }
        acc[reaction.emoji].count += 1;
        if (!acc[reaction.emoji].users.includes(reaction.user)) {
            acc[reaction.emoji].users.push(reaction.user);
        }
        return acc;
    }, {});
    
    container.innerHTML = '';

    Object.entries(aggregated).forEach(([emoji, data]) => {
        const bubble = document.createElement('span');
        bubble.classList.add('reaction-bubble');
        bubble.setAttribute('data-emoji', emoji);
        bubble.setAttribute('data-users', data.users.join(','));
        
        let borderClass = '';
        const hasEric = data.users.includes('Eric');
        const hasOlga = data.users.includes('Olga');
        
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


// --- 8. Fonctions de DÉFILEMENT (Stabilisation + Bouton) ---

function scrollToBottom(smooth = true) {
    if (messagesContainer.classList.contains('hidden')) return; 

    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
    });
}

function toggleScrollToBottomButton() {
    const maxScroll = messagesContainer.scrollHeight - messagesContainer.clientHeight;
    const scrollTolerance = 100;

    if (messagesContainer.scrollTop < maxScroll - scrollTolerance) {
        scrollToBottomButton.classList.remove('hidden');
    } else {
        scrollToBottomButton.classList.add('hidden');
    }
}

scrollToBottomButton.addEventListener('click', () => scrollToBottom(true));
