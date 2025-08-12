// netlify/functions/send-push.js

const webpush = require('web-push');
const faunadb = require('faunadb');
const q = faunadb.query;

const client = new faunadb.Client({
    secret: process.env.FAUNADB_SERVER_SECRET
});

webpush.setVapidDetails(
    'mailto:votre-email@exemple.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event, context) => {
    try {
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
        } else if (currentHour === 20) {
            notificationPayload = {
                title: "Bonne fin de journée ! 18h.",
                body: "Votre journée de travail est terminée. Jetez un œil à nos derniers articles."
            };
        }

        if (notificationPayload) {
            // Récupère tous les abonnements depuis la base de données
            const subscriptions = await client.query(
                q.Map(
                    q.Paginate(q.Match(q.Index('all_subscriptions'))),
                    q.Lambda('X', q.Get(q.Var('X')))
                )
            );

            subscriptions.data.forEach(sub => {
                webpush.sendNotification(sub.data, JSON.stringify(notificationPayload)).catch(error => {
                    console.error('Erreur lors de l\'envoi de la notification:', error);
                });
            });
        }
        
        return {
            statusCode: 200,
            body: 'Notifications envoyées.'
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
