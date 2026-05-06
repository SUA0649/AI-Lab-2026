import os
from supabase_client import supabase
import random
from datetime import datetime, timedelta

def main():
    # Get all products
    products = supabase.table('Products').select('id, name').execute().data
    
    # Get all transactions
    transactions = supabase.table('Transactions').select('product_id').eq('Status', 'Completed').in_('type', ['Sell', 'Sell ']).execute().data
    
    # Count transactions per product
    trans_counts = {}
    for t in transactions:
        pid = t['product_id']
        trans_counts[pid] = trans_counts.get(pid, 0) + 1
        
    dates = [
        '2025-12-15 10:00:00',
        '2026-01-15 10:00:00',
        '2026-02-15 10:00:00',
        '2026-03-15 10:00:00',
        '2026-04-15 10:00:00'
    ]
    
    inserts = []
    for p in products:
        pid = p['id']
        pname = p['name']
        
        # If product already has >= 3 transactions, skip it
        if trans_counts.get(pid, 0) >= 3:
            continue
            
        print(f"Generating data for {pname}...")
        
        # Determine a trend based on the product name to make it look realistic
        if "Laptop" in pname or "Pro" in pname:
            # Upward trend (High demand items)
            base = random.randint(10, 30)
            for i, d in enumerate(dates):
                qty = base + (i * random.randint(5, 15))
                inserts.append({"product_id": pid, "type": "Sell", "Status": "Completed", "quantity": qty, "created_at": d})
                
        elif "Chair" in pname or "Neo" in pname:
            # Stable trend
            base = random.randint(20, 50)
            for d in dates:
                qty = base + random.randint(-5, 5)
                inserts.append({"product_id": pid, "type": "Sell", "Status": "Completed", "quantity": qty, "created_at": d})
                
        else:
            # Downward trend
            base = random.randint(80, 120)
            for i, d in enumerate(dates):
                qty = max(5, base - (i * random.randint(10, 20)))
                inserts.append({"product_id": pid, "type": "Sell", "Status": "Completed", "quantity": qty, "created_at": d})
                
    if inserts:
        print(f"Inserting {len(inserts)} fake transaction records into Supabase...")
        # Insert in chunks of 50 to avoid any limits
        for i in range(0, len(inserts), 50):
            chunk = inserts[i:i+50]
            supabase.table('Transactions').insert(chunk).execute()
        print("Done! Database is now fully populated.")
    else:
        print("All products already have data!")

if __name__ == "__main__":
    main()
