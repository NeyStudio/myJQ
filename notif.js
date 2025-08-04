// --- Configuration des notifications et du Service Worker ---

// 1. Enregistrement du Service Worker
// Un Service Worker est essentiel pour les PWA, y compris les notifications push.
// Il doit être sur la racine de votre application (ou scope défini).
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker enregistré avec succès:', registration);
            })
            .catch(error => {
                console.error('Échec de l\'enregistrement du Service Worker:', error);
            });
    });
}

// 2. Demande de permission de notification au chargement de la page
// Ceci est une bonne pratique pour informer l'utilisateur dès le début.
if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Permission de notification accordée.');
            // Si la permission est accordée, on peut commencer à vérifier les délais
            // et potentiellement créer les rappels quotidiens via l'API GenericReminders.
            // La création des rappels est gérée dans le bloc DOMContentLoaded ci-dessous.
        } else if (permission === 'denied') {
            console.warn('Permission de notification refusée. Les rappels de quêtes ne seront pas envoyés.');
        }
    });
} else {
    console.warn('Ce navigateur ne supporte pas les notifications natives.');
}

// 3. Fonction pour afficher une notification native du navigateur (utilisée par le script principal)
/**
 * Affiche une notification native du navigateur.
 * @param {string} title - Le titre de la notification.
 * @param {string} body - Le corps (message) de la notification.
 * @param {string} [icon='images/logo.jpg'] - L'URL de l'icône de la notification.
 */
function displayNativeNotification(title, body, icon = 'images/logo.jpg') {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: icon });
    } else {
        console.warn(`Impossible d'afficher la notification "${title}": Permission non accordée ou navigateur non compatible.`);
    }
}

// 4. Logique pour créer les rappels quotidiens via l'API GenericReminders
document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier si les rappels quotidiens ont déjà été créés
    const dailyRemindersCreated = localStorage.getItem('dailyRemindersCreated');

    if (dailyRemindersCreated !== 'true') {
        // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        try {
            // Rappel du matin
            console.log("Création du rappel du matin...");
            await generic_reminders.create_reminder(
                title="Rappel Quotidien",
                description="C'est l'heure de planifier vos quêtes du matin !",
                start_date=today,
                time_of_day="08:00:00",
                repeat_interval_unit="DAY",
                repeat_every_n=1
            );

            // Rappel du midi
            console.log("Création du rappel du midi...");
            await generic_reminders.create_reminder(
                title="Rappel Quotidien",
                description="C'est l'heure de faire le point sur vos quêtes de la mi-journée !",
                start_date=today,
                time_of_day="12:00:00",
                repeat_interval_unit="DAY",
                repeat_every_n=1
            );

            // Rappel du soir
            console.log("Création du rappel du soir...");
            await generic_reminders.create_reminder(
                title="Rappel Quotidien",
                description="C'est l'heure de réviser vos quêtes et de vous préparer pour demain !",
                start_date=today,
                time_of_day="18:00:00",
                repeat_interval_unit="DAY",
                repeat_every_n=1
            );

            localStorage.setItem('dailyRemindersCreated', 'true');
            console.log("Rappels quotidiens créés avec succès.");
            // Optionnel: Afficher une alerte à l'utilisateur
            // Si showAlert est une fonction globale ou accessible ici
            // showAlert('Rappels Quotidiens', 'Des rappels pour le matin, midi et soir ont été configurés !');

        } catch (error) {
            console.error("Erreur lors de la création des rappels quotidiens:", error);
            // Optionnel: Afficher une alerte d'erreur
            // if (typeof showAlert === 'function') {
            //     showAlert('Erreur', 'Impossible de configurer les rappels quotidiens. Veuillez vérifier les permissions.');
            // }
        }
    } else {
        console.log("Les rappels quotidiens ont déjà été créés.");
    }
});

// La fonction checkQuestDeadlinesForNotifications est commentée car elle est maintenant gérée
// par l'API generic_reminders pour les rappels quotidiens.
// Si vous aviez une logique de notification de "deadline" spécifique à vos quêtes,
// elle devrait être réintégrée dans script.js en appelant displayNativeNotification.
/*
function checkQuestDeadlinesForNotifications(allQuetes) {
    // ... (votre logique existante pour les deadlines de quêtes si nécessaire)
    // Utilisez displayNativeNotification() ici
}
*/
