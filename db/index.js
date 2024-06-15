// This could be a universal database handler or specific to IndexedDB/WebSQL/SQLite etc.
const dbName = "CharactersDB";
const storeName = "characters";

function initDB(version = 1) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, version);

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'name' });
            }
        };

        request.onerror = function(event) {
            console.error("Database error: " + event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onsuccess = function(event) {
            console.log("DB initialized");
            const db = event.target.result;
            resolve(db);
        };
    });
}

// Function to add or update characters
async function saveCharacter(character) {
    console.log("Saving character:", character);
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(character);
}

// Function to retrieve a character
async function getCharacter(name) {
    console.log("Getting character with name:", name);
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(name);

        request.onerror = function(event) {
            reject("Error fetching character: " + event.target.errorCode);
        };

        request.onsuccess = function(event) {
            resolve(request.result);
        };
    });
}

// Function to get all data from a specified object store
async function getAllDataFromStore(dbName, storeName) {
    const db = await initDB() // Open the database; adjust version as necessary
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onerror = (event) => {
            console.error('Error fetching data from store:', event.target.error);
            reject(event.target.error);
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

// Function to log all data from a specific store
async function logAllData(dbName, storeName) {
    console.log("Logging all data from the database...");
    try {
        const data = await getAllDataFromStore(dbName, storeName);
        console.log('Data in store:', data);
    } catch (error) {
        console.error('Failed to read data:', error);
    }
}


async function initializeDatabase() {
    const db = await initDB();
    const count = await getCount(db);
    if (count === 0) {
        console.log("Initializing database...");
        await populateInitialData(db);
    }
}

async function getCount(db) {
    const transaction = db.transaction(['characters'], 'readonly');
    const store = transaction.objectStore('characters');
    const countRequest = store.count();
    return new Promise(resolve => {
        countRequest.onsuccess = () => resolve(countRequest.result);
    });
}

async function populateInitialData(db) {
    const response = await fetch('db/data.json');
    const characters = await response.json();
    const transaction = db.transaction(['characters'], 'readwrite');
    const store = transaction.objectStore('characters');
    characters.forEach(character => {
        store.add(character);
    });
    return new Promise(resolve => transaction.oncomplete = resolve);
}


async function clearData(storeName) {
    const db = await initDB(); // Ensure the DB is initialized
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
            console.log(`${storeName} store cleared.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`Error clearing ${storeName} store:`, event.target.error);
            reject(event.target.error);
        };
    });
}

async function resetAndInitializeData() {
    await clearData('characters');
    const db = await initDB();
    await populateCharacters(db);
}

function deleteDatabase(dbName) {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);

        deleteRequest.onerror = function(event) {
            console.error("Error deleting database:", event.target.error);
            reject(event.target.error);
        };

        deleteRequest.onsuccess = function() {
            console.log("Database deleted successfully");
            resolve();
        };

        // This event is optional: it is triggered when a database is being deleted which was not closed
        deleteRequest.onblocked = function() {
            console.warn("Database delete blocked because it is being used by another tab");
            // You might need to alert users to close other tabs that might be using this database
        };
    });
}

module.exports = {
    initializeDatabase,
    initDB,
    saveCharacter,
    getCharacter,
    logAllData,
    resetAndInitializeData,
    deleteDatabase
};