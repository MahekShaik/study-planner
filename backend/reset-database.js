require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function resetDatabase() {
    const client = new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        key: process.env.COSMOS_KEY
    });

    const databaseId = process.env.COSMOS_DATABASE_NAME || 'serenestudy';

    try {
        console.log(`Step 1: Deleting database '${databaseId}'...`);
        try {
            await client.database(databaseId).delete();
            console.log(`successfully deleted database '${databaseId}'.`);
        } catch (e) {
            if (e.code === 404) {
                console.log(`Database '${databaseId}' not found, skipping delete.`);
            } else {
                throw e;
            }
        }

        console.log(`\nStep 2: Recreating database '${databaseId}' with SHARED throughput (400 RU/s)...`);
        const { database } = await client.databases.create({
            id: databaseId,
            throughput: 400
        });
        console.log(`Database '${database.id}' created successfully.`);

        console.log(`\nStep 3: Creating containers with shared throughput...`);

        const usersContainerName = process.env.COSMOS_USERS_CONTAINER || 'users';
        const onboardingContainerName = process.env.COSMOS_ONBOARDING_CONTAINER || 'onboarding';
        const tasksContainerName = 'tasks';

        console.log(`Creating container '${usersContainerName}'...`);
        await database.containers.create({
            id: usersContainerName,
            partitionKey: { paths: ['/email'] }
        });

        console.log(`Creating container '${onboardingContainerName}'...`);
        await database.containers.create({
            id: onboardingContainerName,
            partitionKey: { paths: ['/userEmail'] }
        });

        console.log(`Creating container '${tasksContainerName}'...`);
        await database.containers.create({
            id: tasksContainerName,
            partitionKey: { paths: ['/userEmail'] }
        });

        console.log("\n--- RESET COMPLETE ---");
        console.log("The database is now using shared throughput and is well within your 1000 RU/s limit.");
        console.log("You can now start your backend server with 'npm start'.");
    } catch (error) {
        console.error('\nCRITICAL ERROR DURING RESET:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

resetDatabase();
