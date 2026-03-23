'use client';
import type { Product, Transaction, LowStockAlert, DashboardStats, LedgerEntry, LedgerEntry2, Accounts } from "./types";

//Defining URL base once
//const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const api = {
  // General Ledger
  async addLedgerEntry(entry: LedgerEntry) {
    try {
      const response = await fetch("https://inventory-pro-self.vercel.app/api/Ledger", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      if (!data) throw new Error("Ledger entry not created");
    } catch (error) {
      throw new Error(`Failed to add ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      const response = await fetch(`https://inventory-pro-self.vercel.app/api/Transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`Failed to delete transaction: ${response.statusText}`);
    } catch (error) {
      throw new Error(`Failed to delete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Products
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch("https://inventory-pro-self.vercel.app/api/Products");
      if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
      const data = await response.json();
      if (!data || !data.Products_table) throw new Error("Products not found");
      return data.Products_table as Product[];
    } catch (error) {
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getProduct(id: string): Promise<Product | null> {
    try {
      const response = await fetch(`https://inventory-pro-self.vercel.app/api/Products/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch product: ${response.statusText}`);
      const data = await response.json();
      if (!data) throw new Error("Product not found");
      return data as Product;
    } catch (error) {
      throw new Error(`Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async createProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
    try {
      let res = await fetch("https://inventory-pro-self.vercel.app/api/Products", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      if (!data) throw new Error("Product not created");

      const amount = product.selling_price * product.quantity;

      // Ledger entries
      await fetch("https://inventory-pro-self.vercel.app/api/Ledger", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountTitle: "Inventory", debit: amount, credit: null, description: `Product added: ${product.name}` }),
      });

      await fetch("https://inventory-pro-self.vercel.app/api/Ledger", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountTitle: "Accounts Payable", debit: null, credit: amount, description: `Product added: ${product.name}` }),
      });

      return data as Product;
    } catch (error) {
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    try {
      const response = await fetch(`https://inventory-pro-self.vercel.app/api/Products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response) throw new Error(`Failed to update product`);
      const data = await response.json();
      if (!data) throw new Error("Product not found");
      return data;
    } catch (error) {
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const response = await fetch(`https://inventory-pro-self.vercel.app/api/Products/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`Failed to delete product: ${response.statusText}, ID: ${id}`);
    } catch (error) {
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}, ID: ${id}`);
    }
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    try {
      const response = await fetch("https://inventory-pro-self.vercel.app/api/Transactions");
      if (!response.ok) throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      const data = await response.json();
      return data.Transactions_table as Transaction[];
    } catch (error) {
      throw new Error(`Failed to fetch transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async createTransaction(transaction: Omit<Transaction, "id" | "created_at">): Promise<Transaction> {
    try {
      let res = await fetch("https://inventory-pro-self.vercel.app/api/Transactions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! Status: ${res.status}, ${errorText}`);
      }
      const data = await res.json();
      if (!data || !data[0]?.id) throw new Error("Transaction not created");

      const newTransaction: Transaction = { ...transaction, id: data[0].id, created_at: new Date().toISOString() };

      if (newTransaction.type === "purchase") {
        await api.addLedgerEntry({ accountTitle: "Accounts Payable", debit: newTransaction.total_price, credit: null, description: `Purchase: ${newTransaction.item_name}` });
        await api.addLedgerEntry({ accountTitle: "Cash", debit: null, credit: newTransaction.total_price, description: `Purchase: ${newTransaction.item_name}` });
      } else if (newTransaction.type === "sale") {
        await api.addLedgerEntry({ accountTitle: "Cash", debit: newTransaction.total_price, credit: null, description: `Sale: ${newTransaction.item_name}` });
        await api.addLedgerEntry({ accountTitle: "Inventory", debit: null, credit: newTransaction.total_price, description: `Sale: ${newTransaction.item_name}` });
      }

      return newTransaction;
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Low Stock Alerts
  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    try {
      const response = await fetch("https://inventory-pro-self.vercel.app/api/LowStock");
      if (!response.ok) throw new Error(`Failed to fetch low stock alerts: ${response.statusText}`);
      const data = await response.json();
      return data.Low_Stock_items as LowStockAlert[];
    } catch (error) {
      throw new Error(`Failed to fetch low stock alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats[]> {
    try {
      const response = await fetch("https://inventory-pro-self.vercel.app/api/Dashboard");
      if (!response.ok) throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
      const data = await response.json();
      return data as DashboardStats[];
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Ledger
  async getLedger(): Promise<LedgerEntry2[]> {
    try {
      const response = await fetch("https://inventory-pro-self.vercel.app/api/Ledger");
      if (!response.ok) throw new Error(`Failed to fetch ledger: ${response.statusText}`);
      const data = await response.json();
      if (!data || !data.General_Ledger) throw new Error("Ledger not found");

      const mockLedger: LedgerEntry2[] = data.General_Ledger.map((entry: any) => ({
        date: entry.date,
        accountTitle: entry.accountTitle,
        debit: entry.debit,
        credit: entry.credit,
        description: entry.description,
      }));

      return mockLedger;
    } catch (error) {
      throw new Error(`Failed to fetch ledger: ${error instanceof Error ? error.message : ' Unknown error'}`);
    }
  },

  // Accounts
  async get_Existing_Emails(): Promise<Accounts[]> {
    try {
      const response = await fetch("https://inventory-pro-self.vercel.app/api/accounts");
      if (!response.ok) throw new Error(`Failed to fetch ledger: ${response.statusText}`);
      const data = await response.json();
      if (!data || !data.Existing_Emails) throw new Error("Emails not found");
      return data.Existing_Emails.map((entry: any) => ({ emails: entry.emails })) as Accounts[];
    } catch (error) {
      throw new Error(`Failed to fetch ledger: ${error instanceof Error ? error.message : ' Unknown error'}`);
    }
  },

  async get_Confirmed_Emails(): Promise<Accounts[]> {
    try {
      const response = await fetch("https://inventory-pro-self.vercel.app/api/accounts");
      if (!response.ok) throw new Error(`Failed to fetch ledger: ${response.statusText}`);
      const data = await response.json();
      if (!data || !data.Confirmed_Emails) throw new Error("Emails not found");
      return data.Confirmed_Emails.map((entry: any) => ({ emails: entry.emails })) as Accounts[];
    } catch (error) {
      throw new Error(`Failed to fetch ledger: ${error instanceof Error ? error.message : ' Unknown error'}`);
    }
  },
};
