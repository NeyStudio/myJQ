// netlify/functions/send-push.js

const webpush = require('web-push');

exports.handler = async (event, context) => {
    // Cette fonction sera déclenchée à des heures spécifiques.
    // Vous devez d'abord vous assurer que le package `web-push` est installé.
    // Pour un projet Netlify, vous pouvez le faire en créant un fichier `package.json`
    // et en installant la dépendance.

    const vapidKeys = {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY
    };

    webpush.setVapidDetails(
        'mailto:votre-email@exemple.com',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
    
    // Simuler l'heure actuelle pour l'exemple
    const now = new Date();
    const currentHour = now.getHours();

    let notificationPayload;

    if (currentHour === 6) {
        notificationPayload = {
            title: "Bonjour ! C'est 6h.",
            body: "Il est temps de commencer votre journée. Voici votre première notification."
        };
    } else if (currentHour === 12) {
        notificationPayload = {
            title: "Il est midi, l'heure de manger !",
            body: "Faites une pause bien méritée. N'oubliez pas nos nouvelles recettes."
        };
    } else if (currentHour === 18) {
        notificationPayload = {
            title: "Bonne fin de journée ! 18h.",
            body: "Votre journée de travail est terminée. Jetez un œil à nos derniers articles."
        };
    }

    if (notificationPayload) {
        // Supposons que vous ayez une liste d'abonnements stockée
        const subscriptions = getStoredSubscriptions(); // Fonction pour récupérer vos abonnements

        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, JSON.stringify(notificationPayload)).catch(error => {
                console.error('Erreur lors de l\'envoi de la notification:', error);
            });
        });
    }

    return {
        statusCode: 200,
        body: 'Notifications envoyées.'
    };
};
