require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkCosmos() {
    const client = new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        key: process.env.COSMOS_KEY
    });

    try {
        const { resources: databases } = await client.databases.readAll().fetchAll();
        console.log(`Found ${databases.length} databases.`);

        for (const db of databases) {
            console.log(`\nDatabase: ${db.id}`);
            try {
                const { resource: offer } = await client.offers.readAll().fetchAll().then(res => {
                    return res.resources.find(o => o.resource === db._self) || { content: { offerThroughput: 'None' } };
                });
                console.log(`  Throughput: ${offer.content?.offerThroughput || 'Shared/None'}`);
            } catch (e) {
                console.log(`  Could not read database throughput: ${e.message}`);
            }

            const database = client.database(db.id);
            const { resources: containers } = await database.containers.readAll().fetchAll();
            for (const container of containers) {
                console.log(`  Container: ${container.id}`);
                try {
                    const { resources: offers } = await client.offers.readAll().fetchAll();
                    const offer = offers.find(o => o.resource === container._self);
                    console.log(`    Throughput: ${offer ? offer.content.offerThroughput : 'Shared'}`);
                } catch (e) {
                    console.log(`    Could not read container throughput: ${e.message}`);
                }
            }
        }
    } catch (error) {
        console.error('Check failed:', error.message);
    }
}

checkCosmos();
