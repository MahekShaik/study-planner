require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fixThroughput() {
    const client = new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        key: process.env.COSMOS_KEY
    });

    const databaseId = process.env.COSMOS_DATABASE_NAME || 'serenestudy';

    try {
        console.log(`Targeting database: ${databaseId}`);
        const database = client.database(databaseId);

        // 1. Get all offers in the account
        console.log("Reading all offers in the account...");
        const { resources: allOffers } = await client.offers.readAll().fetchAll();
        console.log(`Found ${allOffers.length} total offers.`);

        // 2. Identify the database self-link
        const { resource: dbResource } = await database.read().catch(e => {
            console.error(`Database '${databaseId}' not found. Please check your .env`);
            process.exit(1);
        });
        console.log(`Database self-link: ${dbResource._self}`);

        // 3. Clear container offers
        const { resources: containers } = await database.containers.readAll().fetchAll();
        console.log(`Found ${containers.length} containers in '${databaseId}'.`);

        for (const container of containers) {
            console.log(`Processing container: ${container.id} (${container._self})`);
            const offer = allOffers.find(o => o.resource === container._self);
            if (offer) {
                console.log(`  -> Detected dedicated offer: ${offer.content.offerThroughput} RU/s. DELETING...`);
                await client.offer(offer.id).delete();
                console.log(`  -> Successfully deleted dedicated offer for '${container.id}'.`);
            } else {
                console.log(`  -> Container '${container.id}' has no dedicated offer.`);
            }
        }

        console.log("\n--- FINISHED ---");
        console.log("Next steps:");
        console.log("1. Your containers no longer have dedicated throughput.");
        console.log("2. Restart your backend server.");
        console.log("3. The 'db.js' should now be able to initialize everything sharing one RU/s pool.");
    } catch (error) {
        console.error('CRITICAL ERROR:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

fixThroughput();
