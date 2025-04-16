import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Company, User } from '../types';

const DB_NAME = 'lt_finance_db';
const DB_VERSION = 1;

export type DbError = {
  message: string;
  code: string;
};

interface MyDB extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: { 'phone': string };
  };
  companies: {
    key: number;
    value: Company;
    autoIncrement: true;
    indexes: { 'name': string };
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

export function getDbInstance(): Promise<IDBPDatabase<MyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'phone' });
          userStore.createIndex('phone', 'phone', { unique: true });
        }

        // Companies store
        if (!db.objectStoreNames.contains('companies')) {
          const companyStore = db.createObjectStore('companies', { keyPath: 'id', autoIncrement: true });
          companyStore.createIndex('name', 'name');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveUser(user: User): Promise<User | DbError> {
  try {
    const db = await getDbInstance();
    await db.put('users', user);
    return user;
  } catch (error) {
    return {
      message: 'Failed to save user',
      code: 'DB_ERROR'
    };
  }
}

export async function getUser(phone: string): Promise<User | null | DbError> {
  try {
    const db = await getDbInstance();
    const user = await db.get('users', phone);
    return user || null;
  } catch (error) {
    return {
      message: 'Failed to get user',
      code: 'DB_ERROR'
    };
  }
}

export async function saveCompany(company: Company): Promise<number | DbError> {
  try {
    const db = await getDbInstance();
    const id = await db.put('companies', company);
    return id;
  } catch (error) {
    return {
      message: 'Failed to save company',
      code: 'DB_ERROR'
    };
  }
}

export async function getCompany(id: number): Promise<Company | null | DbError> {
  try {
    const db = await getDbInstance();
    const company = await db.get('companies', id);
    return company || null;
  } catch (error) {
    return {
      message: 'Failed to get company',
      code: 'DB_ERROR'
    };
  }
}