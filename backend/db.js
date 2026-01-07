require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT || 'https://localhost:8081';
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'serenestudy';

// Conditional SSL verification
if (COSMOS_ENDPOINT.includes('localhost') || COSMOS_ENDPOINT.includes('127.0.0.1')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('SSL verification disabled for local Cosmos Emulator');
}

// Emulator fixed key - fallback for teammates when cloud keys are restricted
const EMULATOR_KEY = 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';

let COSMOS_KEY = process.env.COSMOS_KEY;

console.log(`Cosmos Endpoint: ${COSMOS_ENDPOINT}`);
if (COSMOS_KEY) {
    console.log(`Cosmos Key: ${COSMOS_KEY.substring(0, 5)}... (len: ${COSMOS_KEY.length})`);
} else {
    console.warn('WARNING: COSMOS_KEY is missing in .env');
    if (COSMOS_ENDPOINT.includes('localhost')) {
        console.log('Using default emulator key for localhost.');
        COSMOS_KEY = EMULATOR_KEY;
    }
}

const client = new CosmosClient({
    endpoint: COSMOS_ENDPOINT,
    key: COSMOS_KEY
});

const databaseName = COSMOS_DATABASE_NAME;
const usersContainerName = process.env.COSMOS_USERS_CONTAINER;
const onboardingContainerName = process.env.COSMOS_ONBOARDING_CONTAINER;

const tasksContainerName = 'tasks';

let database;
let usersContainer;
let onboardingContainer;
let tasksContainer;

// In-memory fallback storage
const memoryStore = {
    users: [
        {
            id: 'demo-user-id',
            email: 'demo@serenestudy.ai',
            name: 'Demo User',
            // Hash for 'password123'
            hashedPassword: '$2b$10$Kz6u8MSmXOfDrYzOQcbZSeJp5PNd0JbCXZYY4P1ez5lK1oJXxXELfu',
            dailyHours: 4,
            createdAt: new Date().toISOString()
        }
    ],
    onboarding: [],
    tasks: []
};

// Initialize database and containers
async function initializeDatabase() {
    try {
        // Create database if it doesn't exist
        const { database: db } = await client.databases.createIfNotExists({
            id: databaseName
        });
        database = db;
        console.log(`Database '${databaseName}' ready`);

        // Create users container if it doesn't exist
        const { container: usersC } = await database.containers.createIfNotExists({
            id: usersContainerName,
            partitionKey: { paths: ['/email'] }
        });
        usersContainer = usersC;
        console.log(`Container '${usersContainerName}' ready`);

        // Create onboarding container if it doesn't exist
        const { container: onboardingC } = await database.containers.createIfNotExists({
            id: onboardingContainerName,
            partitionKey: { paths: ['/userEmail'] }
        });
        onboardingContainer = onboardingC;
        console.log(`Container '${onboardingContainerName}' ready`);

        // Create tasks container if it doesn't exist
        const { container: tasksC } = await database.containers.createIfNotExists({
            id: tasksContainerName,
            partitionKey: { paths: ['/userEmail'] }
        });
        tasksContainer = tasksC;
        console.log(`Container '${tasksContainerName}' ready`);

        return true;
    } catch (error) {
        console.error('Database initialization error:', error.message);
        console.error('Full error:', error);
        return false;
    }
}

// User operations
async function createUser(email, name, hashedPassword, dailyHours = 4) {
    const user = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        name,
        hashedPassword,
        dailyHours,
        createdAt: new Date().toISOString()
    };

    if (usersContainer) {
        try {
            const { resource } = await usersContainer.items.create(user);
            return resource;
        } catch (error) {
            console.error('Failed to create user in Cosmos DB, falling back to memory:', error.message);
        }
    }

    memoryStore.users.push(user);
    return user;
}

async function getUserByEmail(email) {
    if (usersContainer) {
        try {
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.email = @email',
                parameters: [{ name: '@email', value: email }]
            };

            const { resources } = await usersContainer.items.query(querySpec).fetchAll();
            if (resources.length > 0) return resources[0];
        } catch (error) {
            console.error('Failed to query user in Cosmos DB, checking memory:', error.message);
        }
    }

    return memoryStore.users.find(u => u.email === email) || null;
}

// Onboarding operations
async function createOnboarding(userEmail, mode, onboardingData) {
    const onboarding = {
        id: `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userEmail,
        mode,
        onboardingData,
        createdAt: new Date().toISOString()
    };

    if (onboardingContainer) {
        try {
            const { resource } = await onboardingContainer.items.create(onboarding);
            return resource;
        } catch (error) {
            console.error('Failed to save onboarding in Cosmos DB, falling back to memory:', error.message);
        }
    }

    // Allow multiple onboarding entries in memory
    memoryStore.onboarding.push(onboarding);
    return onboarding;
}

async function getOnboarding(userEmail) {
    if (onboardingContainer) {
        try {
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.userEmail = @userEmail ORDER BY c.createdAt DESC',
                parameters: [{ name: '@userEmail', value: userEmail }]
            };

            const { resources } = await onboardingContainer.items.query(querySpec).fetchAll();
            return resources;
        } catch (error) {
            console.error('Failed to get onboarding from Cosmos DB, checking memory:', error.message);
        }
    }

    return memoryStore.onboarding.filter(o => o.userEmail === userEmail);
}

// Task operations
async function saveTasks(userEmail, tasks) {
    const savedTasks = [];
    const now = new Date().toISOString();

    for (const task of tasks) {
        const taskItem = {
            ...task,
            userEmail,
            createdAt: now,
            id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        if (tasksContainer) {
            try {
                const { resource } = await tasksContainer.items.create(taskItem);
                savedTasks.push(resource);
                continue;
            } catch (error) {
                console.error('Failed to save task in Cosmos DB, falling back to memory:', error.message);
            }
        }

        memoryStore.tasks.push(taskItem);
        savedTasks.push(taskItem);
    }
    return savedTasks;
}

async function getTasks(userEmail) {
    if (tasksContainer) {
        try {
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.userEmail = @userEmail',
                parameters: [{ name: '@userEmail', value: userEmail }]
            };

            const { resources } = await tasksContainer.items.query(querySpec).fetchAll();
            return resources;
        } catch (error) {
            console.error('Failed to get tasks from Cosmos DB, checking memory:', error.message);
        }
    }

    return memoryStore.tasks.filter(t => t.userEmail === userEmail);
}

async function updateTaskProgress(taskId, userEmail, updates) {
    if (tasksContainer) {
        try {
            const task = await tasksContainer.item(taskId, userEmail).read();
            if (task.resource) {
                const updatedTask = { ...task.resource, ...updates };
                const { resource } = await tasksContainer.item(taskId, userEmail).replace(updatedTask);
                return resource;
            }
        } catch (error) {
            console.error('Failed to update task in Cosmos DB, checking memory:', error.message);
        }
    }

    const taskIndex = memoryStore.tasks.findIndex(t => t.id === taskId && t.userEmail === userEmail);
    if (taskIndex !== -1) {
        memoryStore.tasks[taskIndex] = { ...memoryStore.tasks[taskIndex], ...updates };
        return memoryStore.tasks[taskIndex];
    }

    return null;
}

module.exports = {
    initializeDatabase,
    createUser,
    getUserByEmail,
    createOnboarding,
    getOnboarding,
    saveTasks,
    getTasks,
    updateTaskProgress
};
