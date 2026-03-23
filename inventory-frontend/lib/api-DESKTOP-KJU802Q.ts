'use client';
import type { Product, Transaction, LowStockAlert, DashboardStats, LedgerEntry, LedgerEntry2 } from "./types"

// This file contains API functions that interact with the Flask backend.
// It includes functions for managing products, transactions, low stock alerts, and dashboard stats.    
export const api = {
  // General Ledger

  async addLedgerEntry(entry: LedgerEntry) {
    try {
      const response = await fetch('http://localhost:5000/api/Ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (!data) {
        throw new Error("Ledger entry not created");
      }
    } catch (error) {
      throw new Error(`Failed to add ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  
  async deleteTransaction(id: string): Promise<void> {  // Replace with: await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    try {
      const response = await fetch(`http://localhost:5000/api/Transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete transaction: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  // Products --
  async getProducts(): Promise<Product[]> { // Replace with: const response = await fetch('/api/products')
    try {
      const response = await fetch('http://localhost:5000/api/Products');
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
        }
      const data = await response.json();
      if (!data || !data.Products_table) {
        throw new Error("Products not found");
      }
      return data.Products_table as Product[];
    } catch (error) {
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
//--
  async getProduct(id: string): Promise<Product | null> { // Replace with: const response = await fetch(`/api/products/${id}`)
    try {
      const response = await fetch(`http://localhost:5000/api/Products/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data) {
        throw new Error("Product not found");
      }
      return data as Product;
    } catch (error) {
      throw new Error(`Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
//--00000

  async createProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
    try {
      let res = await fetch('http://localhost:5000/api/Products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      if (!data) {
        throw new Error("Product not created");
      }
      const amount = product.selling_price * product.quantity;
      await api.addLedgerEntry({ accountTitle: "Inventory", debit: amount, credit: null, description: `Product added: ${product.name}` });
      await api.addLedgerEntry({ accountTitle: "Accounts Payable", debit: null, credit: amount, description: `Product added: ${product.name}` });
      return data as Product; // Assuming the response contains the created product
    } catch (error) {
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> { // Replace with: const response = await fetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    try {
      const response = await fetch(`http://localhost:5000/api/Products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response) {
        throw new Error(`Failed to update product: ${response}`);
      }
      const data = await response.json();
      if (!data) {
        throw new Error("Product not found");
      }
      return data; // updated row with item_id
    } catch (error) {
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteProduct(id: string): Promise<void> { // Replace with: await fetch(`/api/products/${id}`, { method: 'DELETE' })
    try {
      const response = await fetch(`http://localhost:5000/api/Products/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete product: ${response.statusText}, ID: ${id}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}, ID: ${id}`);
    }
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> { // Replace with: const response = await fetch('/api/transactions')
    try {
      const response = await fetch('http://localhost:5000/api/Transactions');
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }
      const data = await response.json();
      return data.Transactions_table as Transaction[];
    } catch (error) {
      throw new Error(`Failed to fetch transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /*async createTransaction(transaction: Omit<Transaction, "id" | "created_at">): Promise<Transaction> {
    try {
      let res = await fetch('http://localhost:5000/api/Transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.id) {
        throw new Error("Transaction not created");
      }
      transaction = { ...transaction, id: data.id, created_at: new Date().toISOString() } as Transaction;

      const date = new Date().toISOString().split("T")[0]

      if (transaction.type === "purchase") { 

        api.addLedgerEntry({ date, accountTitle: "Accounts Payable", debit: transaction.total_price, credit: null, description: `Purchase: ${transaction.item_name}` }).then(() => {
        }).catch((error) => {
          throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
        api.addLedgerEntry({ date, accountTitle: "Cash", debit: null, credit: transaction.total_price, description: `Purchase: ${transaction.item_name}` }).then(() => {
        }).catch((error) => {
          throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });

      } else if (transaction.type === "sale") { // Cash ↑, Inventory ↓
        api.addLedgerEntry({ date, accountTitle: "Cash", debit: transaction.total_price, credit: null, description: `Sale: ${transaction.item_name}` }).then(() => {
        }).catch((error) => {
          throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
        api.addLedgerEntry({ date, accountTitle: "Inventory", debit: null, credit: transaction.total_price, description: `Sale: ${transaction.item_name}` }).then(() => {
        }).catch((error) => {
          throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
      }
      return transaction as Transaction;
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },*/

  async createTransaction(transaction: Omit<Transaction, "id" | "created_at">): Promise<Transaction> {
    try {
      let res = await fetch('http://localhost:5000/api/Transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! Status: ${res.status}, ${errorText}`);
      }
      const data = await res.json();
      if (!data || !data[0]?.id) {
        throw new Error("Transaction not created");
      }
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
  async getLowStockAlerts(): Promise<LowStockAlert[]> { // Replace with: const response = await fetch('/api/low-stock')
    try {
      const response = await fetch('http://localhost:5000/api/LowStock');
      if (!response) {
        throw new Error(`Failed to fetch low stock alerts: ${response}`);
      }
      const data = await response.json();
      return data.Low_Stock_items as LowStockAlert[];
    } catch (error) {
      throw new Error(`Failed to fetch low stock alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats[]> { // Replace with: const response = await fetch('/api/dashboard/stats')
    try {
      const response = await fetch('http://localhost:5000/api/Dashboard');
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
      }
      const data = await response.json();
      return data as DashboardStats[];
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getLedger(): Promise<LedgerEntry2[]> {
    try {
      let response = await fetch('http://localhost:5000/api/Ledger');
      if (!response.ok) {
        throw new Error(`Failed to fetch ledger: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || !data.General_Ledger) {
        throw new Error("Ledger not found");
      }
      //const mockLedger : LedgerEntry[] = data.General_Ledger as LedgerEntry[];
      const mockLedger : LedgerEntry2[] = data.General_Ledger.map((entry: any) => ({
      date: entry.date,
      accountTitle: entry.accountTitle,// || 'Unknown', // Handle casing or missing field
      debit: entry.debit,
      credit: entry.credit,
      description: entry.description,
    }));

      if (mockLedger.length === 0) { // Generate ledger entries from products (initial inventory)
        const mockProducts = await api.getProducts();
        mockProducts.forEach((product) => {
          const amount = product.cost_price * product.quantity;
          if (product.quantity > 0) {
            api.addLedgerEntry({accountTitle: "Inventory", debit: amount, credit: null, description: `Initial stock: ${product.name}`}).then(() => {
              
            }).catch((error) => {
              throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
            api.addLedgerEntry({accountTitle: "Accounts Payable", debit: null, credit: amount, description: `Initial stock: ${product.name}`}).then(() => {
              
            }).catch((error) => {
              throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
          }
        });

        const mockTransactions = await api.getTransactions();
        mockTransactions.forEach((transaction) => {
          const date = transaction.created_at.split("T")[0];
          if (transaction.type === "purchase") {
            api.addLedgerEntry({accountTitle: "Accounts Payable", debit: (transaction.quantity * transaction.unit_price), credit: null, description: `Purchase: ${transaction.item_name}`}).then(() => {
            }).catch((error) => {
              throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
            api.addLedgerEntry({accountTitle: "Cash", debit: null, credit: transaction.total_price, description: `Purchase: ${transaction.item_name}`,}).then(() => {
              
            }).catch((error) => {
              throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
          } else if (transaction.type === "sale") {
            
            api.addLedgerEntry({ accountTitle: "Cash", debit: transaction.total_price, credit: null, description: `Sale: ${transaction.item_name}`,}).then(() => {
              
            }).catch((error) => {
              throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
            api.addLedgerEntry({ accountTitle: "Inventory", debit: null, credit: transaction.total_price, description: `Sale: ${transaction.item_name}`,}).then(() => {
              
            }).catch((error) => {
              throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
            
          }
        });
      }
      return mockLedger;
    } catch (error) {
      throw new Error(`Failed to fetch ledger: ${error instanceof Error ? error.message : ' Unknown error'}`);
    }
  },
};