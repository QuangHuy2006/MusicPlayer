export interface OfflineSong {
    id: number;
    name: string;
    author?: string;
    imageUrl?: string;
    lyrics?: string;
    audioBlob: Blob;
    imageBlob: Blob | null;
    downloadedAt: number;
}

const DB_NAME = 'MusicPlayerOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB open error:', event);
            reject(new Error('Cannot open offline database'));
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveSong = async (
    song: any,
    audioBlob: Blob,
    imageBlob: Blob | null
): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const offlineSong: OfflineSong = {
            id: Number(song.id),
            name: song.name,
            author: song.author,
            imageUrl: song.imageUrl,
            lyrics: song.lyrics,
            audioBlob,
            imageBlob,
            downloadedAt: Date.now(),
        };

        const request = store.put(offlineSong);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('IndexedDB put error:', event);
            reject(new Error('Failed to save song offline'));
        };
    });
};

export const deleteSong = async (songId: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(Number(songId));

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('IndexedDB delete error:', event);
            reject(new Error('Failed to delete offline song'));
        };
    });
};

export const getSong = async (songId: number): Promise<OfflineSong | null> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(Number(songId));

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = (event) => {
                console.error('IndexedDB get error:', event);
                reject(new Error('Failed to get song from database'));
            };
        });
    } catch (e) {
        console.error('getSong error:', e);
        return null;
    }
};

export const getAllSongs = async (): Promise<OfflineSong[]> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = (event) => {
                console.error('IndexedDB getAll error:', event);
                reject(new Error('Failed to retrieve offline songs'));
            };
        });
    } catch (e) {
        console.error('getAllSongs error:', e);
        return [];
    }
};