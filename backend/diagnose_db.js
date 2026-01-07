require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'serenestudy';

async function diagnose() {
    console.log(`Connecting to ${COSMOS_ENDPOINT}, DB: ${COSMOS_DATABASE_NAME}`);
    const client = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });

    try {
        const database = client.database(COSMOS_DATABASE_NAME);

        // Check Users
        const usersContainer = database.container('users');
        const { resources: users } = await usersContainer.items.query('SELECT * FROM c').fetchAll();
        console.log(`Users found: ${users.length}`);
        users.forEach(u => console.log(` - ${u.email} (lastMoodDate: ${u.lastMoodDate})`));

        // Check Onboarding/Plans
        const onboardingContainer = database.container('onboarding');
        const { resources: plans } = await onboardingContainer.items.query('SELECT * FROM c').fetchAll();
        console.log(`Plans found: ${plans.length}`);
        plans.forEach(p => console.log(` - User: ${p.userEmail}, Mode: ${p.mode}, CreatedAt: ${p.createdAt}`));

        // Check Tasks
        const tasksContainer = database.container('tasks');
        const { resources: tasks } = await tasksContainer.items.query('SELECT * FROM c').fetchAll();
        console.log(`Tasks found: ${tasks.length}`);

    } catch (e) {
        console.error('Diagnosis failed:', e.message);
    }
}

diagnose();
