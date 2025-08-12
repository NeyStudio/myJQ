// netlify/functions/subscribe.js

const faunadb = require('faunadb');
const q = faunadb.query;

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
});

exports.handler = async (event, context) => {
    try {
        const subscription = JSON.parse(event.body);

        // Crée une nouvelle entrée dans une collection 'subscriptions'
        await client.query(
            q.Create(
                q.Collection('subscriptions'), {
                    data: subscription
                }
            )
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Abonnement enregistré.'
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};
