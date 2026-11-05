import * as SQLite from 'expo-sqlite';
import { Transaction, Payment, Goal, SupportedCurrency } from '@saldo/core';

const DB_NAME = 'saldo_mobile.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getMobileDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await initDatabaseSchema(dbInstance);
  return dbInstance;
}

async function initDatabaseSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      categoryIcon TEXT,
      account TEXT NOT NULL,
      isoDate TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PLN',
      tags TEXT,
      isRecurring INTEGER DEFAULT 0,
      balanceAfter REAL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      dueDate TEXT NOT NULL,
      status TEXT NOT NULL,
      category TEXT,
      currency TEXT NOT NULL DEFAULT 'PLN'
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      target REAL NOT NULL,
      saved REAL NOT NULL DEFAULT 0,
      targetDate TEXT,
      currency TEXT NOT NULL DEFAULT 'PLN'
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(isoDate DESC);
  `);
}

export async function insertTransaction(tx: Transaction): Promise<void> {
  const db = await getMobileDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO transactions (id, name, amount, type, category, categoryIcon, account, isoDate, currency, tags, isRecurring, balanceAfter)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id,
      tx.name,
      tx.amount,
      tx.type,
      tx.category,
      tx.categoryIcon || null,
      tx.account,
      tx.isoDate,
      tx.currency || 'PLN',
      tx.tags ? JSON.stringify(tx.tags) : null,
      tx.isRecurring ? 1 : 0,
      tx.balanceAfter ?? null,
    ]
  );
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getMobileDatabase();
  const rows = await db.getAllAsync<any>(`SELECT * FROM transactions ORDER BY isoDate DESC`);
  return rows.map((r) => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : [],
    isRecurring: Boolean(r.isRecurring),
  }));
}

export async function getMonthlyTransactions(year: number, month: number): Promise<Transaction[]> {
  const db = await getMobileDatabase();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}%`;
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM transactions WHERE isoDate LIKE ? ORDER BY isoDate DESC`,
    [monthPrefix]
  );
  return rows.map((r) => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : [],
    isRecurring: Boolean(r.isRecurring),
  }));
}
