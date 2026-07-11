document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://sc-production-6d0a.up.railway.app'; 

    let currentUser = null; 
    let socket; 
    let typingTimeout;
    const TYPING_TIMER_LENGTH = 1500; 
    let lastDisplayedDate = null; 
    let originalTitle = document.title;
    let notificationInterval = null;

    // Gestion de l'état du Swipe
    let isSwiping = false;
    let startX = 0;
    let currentMessageToReply = null; 
    let currentSwipedElement = null; 

    // Sélections DOM Épurées
    const messagesContainer = document.getElementById('messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const userSelectionDiv = document.getElementById('user-selection');
    const chatInterfaceDiv = document.getElementById('chat-interface');
    const globalConnectionIndicator = document.getElementById('global-connection-indicator');
    const otherUserStatusDot = document.getElementById('other-user-status-dot'); 
    const typingIndicator = document.getElementById('typing-indicator');
    const replyBox = document.getElementById('reply-box');
    const replySenderSpan = document.getElementById('reply-sender');
    const replyTextSpan = document.getElementById('reply-text');

    // Mises à jour des statuts de connexion
    function updateGlobalStatus(status) {
        globalConnectionIndicator.classList.remove('green', 'orange', 'red');
        if (!navigator.onLine) {
            globalConnectionIndicator.classList.add('red');
            globalConnectionIndicator.title = "Réseau hors ligne";
            return;
        }
        globalConnectionIndicator.classList.add(status);
        globalConnectionIndicator.title = status === 'green' ? "Connecté au serveur" : (status === 'orange' ? "Connexion..." : "Déconnecté");
    }

    function updateOtherUserStatus(isOnline) {
        otherUserStatusDot.classList.remove('green', 'red');
        otherUserStatusDot.classList.add(isOnline ? 'green' : 'red');
    }

    // Notifications Onglet Dynamiques
    function startNotification(sender) {
        if (document.visibilityState === 'visible' || notificationInterval) return;
        let isNotifying = false;
        notificationInterval = setInterval(() => {
            document.title = isNotifying ? originalTitle : `(${sender} écrit...) ${originalTitle}`;
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
        if (document.visibilityState === 'visible') stopNotification();
    });

    window.addEventListener('offline', () => updateGlobalStatus('red'));
    window.addEventListener('online', () => updateGlobalStatus('orange'));

    // Connexion Utilisateurs
    document.getElementById('select-Olga').onclick = () => initializeChat('Olga');
    document.getElementById('select-Eric').onclick = () => initializeChat('Eric');

    function initializeChat(user) {
        currentUser = user;
        userSelectionDiv.classList.add('hidden');
        chatInterfaceDiv.classList.remove('hidden');
        document.getElementById('header-title').textContent = `Chat | ${currentUser}`;
        
        socket = io(BACKEND_URL); 
        updateOtherUserStatus(false);
        updateGlobalStatus('orange'); 

        socket.on('connect', () => {
            updateGlobalStatus('green'); 
            stopNotification(); 
            messagesContainer.innerHTML = ''; 
            addSystemMessage(`Connexion établie pour ${currentUser}. Chargement...`);
            socket.emit('user joined', currentUser); 
        });

        socket.on('disconnect', () => {
            updateGlobalStatus('red'); 
            updateOtherUserStatus(false);
        });
        
        socket.on('history', (messages) => {
            messagesContainer.innerHTML = ''; 
            lastDisplayedDate = null; 
            messages.forEach(msg => addMessageToDOM(msg.message, msg.sender, true, msg.timestamp, msg.replyTo, msg.id)); 
            scrollToBottom(); 
        });

        socket.on('chat message', (data) => {
            typingIndicator.classList.add('hidden');
            addMessageToDOM(data.message, data.sender, false, data.timestamp, data.replyTo, data.id);
            if (data.sender !== currentUser) startNotification(data.sender);
        });
        
        socket.on('typing', (sender) => {
            if (sender !== currentUser) {
                typingIndicator.textContent = `${sender} est en train d'écrire...`;
                typingIndicator.classList.remove('hidden');
            }
        });

        socket.on('stop typing', (sender) => {
            if (sender !== currentUser) typingIndicator.classList.add('hidden');
        });
        
        socket.on('online users', (onlineUsers) => {
            const target = currentUser === 'Olga' ? 'Eric' : 'Olga';
            updateOtherUserStatus(onlineUsers.includes(target));
        });
    }

    // Gestion du Mode Réponse Contextuelle
    function setReplyContext(element) {
        const sender = element.getAttribute('data-sender');
        const text = element.getAttribute('data-text');
        const id = parseInt(element.getAttribute('data-id')); 

        if (isNaN(id) || id <= 0) return; 

        currentMessageToReply = { id, sender, text }; 
        replySenderSpan.textContent = `Répondre à ${sender}`;
        replyTextSpan.textContent = text.length > 50 ? `${text.substring(0, 50)}...` : text;
        replyBox.classList.remove('hidden');
        messageInput.focus();
    }

    function clearReplyContext() {
        currentMessageToReply = null;
        replyBox.classList.add('hidden');
    }

    document.getElementById('cancel-reply').onclick = clearReplyContext;

    // Envois de Messages
    messageForm.onsubmit = (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();

        if (text && currentUser && socket?.connected) {
            socket.emit('chat message', { message: text, sender: currentUser, replyTo: currentMessageToReply });
            messageInput.value = '';
            clearReplyContext(); 
            socket.emit('stop typing', currentUser);
            clearTimeout(typingTimeout);
        } else if (socket && !socket.connected) {
            showAlert('Erreur', 'Connexion réseau perdue.');
        }
    };

    messageInput.oninput = () => {
        if (!currentUser || !socket?.connected) return;
        socket.emit('typing', currentUser);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => socket.emit('stop typing', currentUser), TYPING_TIMER_LENGTH);
    };

    // Génération et Intégration DOM
    function autoLink(text) {
        const regex = /(\b(https?:\/\/[^\s]+|www\.[^\s]+))/g;
        return text.replace(regex, (url) => {
            const hypertexte = url.match(/^https?:\/\//i) ? url : `http://${url}`;
            return `<a href="${hypertexte}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }

    function addMessageToDOM(text, sender, isHistory = false, timestamp, replyTo = null, messageId = null) {
        const dateObj = new Date(timestamp);
        const dateString = dateObj.toDateString(); 

        if (lastDisplayedDate !== dateString) {
            addDateSeparator(timestamp);
            lastDisplayedDate = dateString;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message sender-${sender}`;
        messageDiv.setAttribute('data-sender', sender);
        messageDiv.setAttribute('data-text', text);
        messageDiv.setAttribute('data-id', messageId || Date.now()); 

        if (replyTo?.sender && replyTo?.text) {
            const replyBubble = document.createElement('div');
            replyBubble.className = 'message-reply';
            replyBubble.innerHTML = `<span class="message-reply-sender">${replyTo.sender}</span> : ${replyTo.text.length > 50 ? `${replyTo.text.substring(0, 50)}...` : replyTo.text}`;
            messageDiv.appendChild(replyBubble);
        }
        
        const infoRow = document.createElement('div');
        infoRow.style.display = 'flex';
        infoRow.style.justifyContent = 'space-between';
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'message-sender';
        senderSpan.textContent = `${sender} :`;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        const targetTime = timestamp ? dateObj : new Date();
        timeSpan.textContent = `${targetTime.getHours().toString().padStart(2, '0')}:${targetTime.getMinutes().toString().padStart(2, '0')}`;
        
        infoRow.appendChild(senderSpan);
        infoRow.appendChild(timeSpan);
        messageDiv.appendChild(infoRow);
        
        const paragraph = document.createElement('p');
        paragraph.innerHTML = autoLink(text);
        paragraph.style.margin = '4px 0 0 0';
        messageDiv.appendChild(paragraph);
        
        messagesContainer.appendChild(messageDiv);
        addSwipeListeners(messageDiv);
        
        if (!isHistory) scrollToBottom(); 
    }

    function addDateSeparator(timestamp) {
        const container = document.createElement('div');
        container.className = 'date-separator-container';
        const span = document.createElement('span');
        span.className = 'date-separator';
        span.textContent = new Date(timestamp).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
        container.appendChild(span);
        messagesContainer.appendChild(container);
    }

    function addSystemMessage(text) {
        const p = document.createElement('p');
        p.style.cssText = 'text-align:center; font-style:italic; font-size:0.85em; color:var(--text-muted);';
        p.textContent = text;
        messagesContainer.appendChild(p);
    }

    // Gestion Technique du Swipe (Touch & Mouse drag)
    function addSwipeListeners(el) {
        el.addEventListener('touchstart', handleTouchStart);
        el.addEventListener('mousedown', handleTouchStart);
    }

    function handleTouchStart(e) {
        if (e.type === 'mousedown' && e.button !== 0) return; 
        currentSwipedElement = this; 
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        isSwiping = false; 

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('mousemove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('mouseup', handleTouchEnd);
    }

    function handleTouchMove(e) {
        if (!startX || !currentSwipedElement) return; 
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - startX;
        
        if (deltaX > 20) {
            isSwiping = true;
            currentSwipedElement.style.transform = `translateX(${Math.min(60, deltaX)}px)`;
            if (e.type === 'touchmove') e.preventDefault(); 
        } else if (deltaX < 0 && isSwiping) {
            currentSwipedElement.style.transform = 'translateX(0px)';
            isSwiping = false;
        }
    }

    function handleTouchEnd() {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mousemove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('mouseup', handleTouchEnd);

        if (currentSwipedElement) {
            currentSwipedElement.style.transform = 'translateX(0px)';
            if (isSwiping) setReplyContext(currentSwipedElement);
        }
        startX = 0;
        isSwiping = false;
        currentSwipedElement = null; 
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});
