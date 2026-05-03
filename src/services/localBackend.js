import { createInitialThreads } from '../data/messages.js';
import { DEFAULT_CONTACT_GROUPS, INITIAL_CONTACTS, normalizeContactGroups, normalizeContacts } from '../data/contactModel.js';
import { DEFAULT_WORLD_BOOK_STATE, normalizeWorldBooks } from '../data/worldBook.js';
import { DEFAULT_APPEARANCE_SETTINGS, normalizeAppearanceSettings, normalizeCustomFont } from './appearance.js';
import { DEFAULT_API_SETTINGS } from './llmClient.js';

const DB_NAME = 'live2love-local-backend';
const DB_VERSION = 1;
const STORE_NAME = 'records';

const KEYS = {
  contacts: 'contacts',
  contactGroups: 'contactGroups',
  threads: 'threads',
  apiSettings: 'apiSettings',
  worldBooks: 'worldBooks',
  appearanceSettings: 'appearanceSettings',
  customFont: 'customFont',
};

let dbPromise = null;

function canUseIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDatabase() {
  if (!canUseIndexedDb()) {
    return Promise.reject(new Error('当前环境不支持 IndexedDB'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'));
  });

  return dbPromise;
}

async function readRecord(key) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error ?? new Error(`无法读取 ${key}`));
  });
}

async function writeRecord(key, value) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`无法保存 ${key}`));
  });
}

export async function loadLocalState() {
  const [contacts, contactGroups, threads, apiSettings, worldBooks, appearanceSettings, customFont] = await Promise.all([
    readRecord(KEYS.contacts),
    readRecord(KEYS.contactGroups),
    readRecord(KEYS.threads),
    readRecord(KEYS.apiSettings),
    readRecord(KEYS.worldBooks),
    readRecord(KEYS.appearanceSettings),
    readRecord(KEYS.customFont),
  ]);
  const normalizedContactGroups = normalizeContactGroups(contactGroups ?? DEFAULT_CONTACT_GROUPS);
  const sourceContacts = Array.isArray(contacts) && contacts.length > 0 ? contacts : INITIAL_CONTACTS;

  return {
    contacts: normalizeContacts(sourceContacts, normalizedContactGroups),
    contactGroups: normalizedContactGroups,
    threads: Array.isArray(threads) && threads.length > 0 ? threads : createInitialThreads(),
    apiSettings: {
      ...DEFAULT_API_SETTINGS,
      ...(apiSettings ?? {}),
    },
    worldBooks: worldBooks ? normalizeWorldBooks(worldBooks) : DEFAULT_WORLD_BOOK_STATE,
    appearanceSettings: normalizeAppearanceSettings(appearanceSettings ?? DEFAULT_APPEARANCE_SETTINGS),
    customFont: normalizeCustomFont(customFont),
  };
}

export function saveContacts(contacts) {
  return writeRecord(KEYS.contacts, contacts);
}

export function saveContactGroups(contactGroups) {
  return writeRecord(KEYS.contactGroups, normalizeContactGroups(contactGroups));
}

export function saveThreads(threads) {
  return writeRecord(KEYS.threads, threads);
}

export function saveApiSettings(apiSettings) {
  return writeRecord(KEYS.apiSettings, apiSettings);
}

export function saveWorldBooks(worldBooks) {
  return writeRecord(KEYS.worldBooks, normalizeWorldBooks(worldBooks));
}

export function saveAppearanceSettings(appearanceSettings) {
  return writeRecord(KEYS.appearanceSettings, normalizeAppearanceSettings(appearanceSettings));
}

export function saveCustomFont(customFont) {
  return writeRecord(KEYS.customFont, normalizeCustomFont(customFont));
}
