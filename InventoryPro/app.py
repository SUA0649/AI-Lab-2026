from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import traceback as tb
from dotenv import load_dotenv
from supabase import create_client, Client
import jwt


# Load environment variables from .env file''
status = load_dotenv()
#if not status:
    #raise ValueError("Failed to load environment variables from .env file.")


# Get your Supabase credentials from environment variables
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SERVICE_ROLE_KEY')
#if not url or not key:
 #   raise ValueError("Supabase URL, JWT or Key must be set in the environment variables.")


# Create the Supabase client
supabase: Client = create_client(url, key)


jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
#if not jwt_secret:
 #   raise ValueError("Supabase JWT must be set in the environment variables.",url,key,jwt)


# app instance
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["https://inventory-pro-self.vercel.app",
                                             "https://inventory-pro-opal.vercel.app",
                                             "https://localhost:3000"]}}, supports_credentials=True)
 
# Health check route
@app.route('/')
def health():
    return jsonify({'status': 'ok', 'message': 'Backend is running'}), 200



@app.route('/api/Ledger', methods=['GET', 'POST'])
def get_or_create_ledger():
    if request.method == 'GET':
        try:
            response = supabase.rpc("general_ledger").execute()
            if hasattr(response, 'error') and response.error:
                print(f"Supabase RPC error: {response.error}")
                return jsonify({'error': f'Supabase RPC error: {response.error}'}), 500
            print(f"General Ledger RPC response: {response}")
            return jsonify({'General_Ledger': response.data}), 200
        except Exception as e:
            tb.print_exc()  # Full error in console
            print(f"Exception in /api/Ledger: {e}")
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not all(key in data for key in ['accountTitle', 'debit', 'credit', 'description']):
                return jsonify({'error': 'Missing required fields'}), 400
            
            response = supabase.table('General_Ledger').insert(
                {'accountTitle': data['accountTitle'], 
                'debit': data['debit'],  
                'credit': data['credit'],
                'description': data['description']}).execute()
            
            if not response.data:
                return jsonify({'error': 'Failed to insert ledger entry, no data returned'}), 500
            
            return jsonify(response.data), 201
        
        except ValueError as ve:
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': f'Insert failed: {str(e)}'}), 500




@app.route('/api/Dashboard', methods=['GET'])
def get_dashboard():
    if request.method == 'GET':
        try:
            response = supabase.table('Inventory').select('quantity').execute()
            return jsonify({
            'n_active_users': supabase.rpc("get_n_active_users").execute().data, 
            'n_in_stock_items': supabase.rpc("get_n_in_stock_items").execute().data,
            'n_low_stock_items': supabase.rpc("get_n_low_stock_items").execute().data,
            'get_n_out_of_stock_items': supabase.rpc("get_n_out_of_stock_items").execute().data,
            'weekly_sales_purchases': supabase.rpc("weekly_sales_purchases").execute().data,
            'today_sell_total': supabase.rpc("today_sell_total").execute().data,
            'total_products': sum(item['quantity'] for item in response.data) if response.data else 0, }), 200    
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500



@app.route('/api/Products', methods=['GET', 'POST'])
def get_or_create_Products():
    if request.method == 'GET':
        try:
            return jsonify({'Products_table': supabase.rpc("products_table").execute().data}), 200
        
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            print('Request: ',data)
            if not all(key in data for key in ['name', 'description', 'sku', 'selling_price', 'cost_price',  'threshold', 'category', 'quantity', 'supplier', 'Status']):
                return jsonify({'error': 'Missing required fields'}), 400
            record = {
                'name': data['name'],
                'description': data['description'],
                'sku': data['sku'],
                'category': data['category'],
                'selling_price': data['selling_price'],
                'quantity': data['quantity'],
                'supplier': data['supplier'],
                'Status': data['Status'],
                'cost_price': data['cost_price'],
                'threshold': data['threshold']}
            
            result = supabase.table("Inventory").insert(record).execute()
            print("Record:",record,f"Insert response: {result}")
            
            if not result.data:
                return jsonify({'error': 'Failed to insert product, no data returned'}), 500
            
            #ADD transaction
            """
            product_id = get_inventory_id(data['name'])
            if not product_id:
                return jsonify({'error': f'Product with name {data["name"]} not found in inventory.'}), 404
            
            data['product_id'] = product_id
            print(f"Product ID found: {product_id}")
            
            data['total_price'] = (int(data['quantity']) * int(data['cost_price']))
            
            result2 = supabase.table("Transactions").insert({
                'product_id': data['product_id'],
                'item_name': data['name'],
                'type': 'purchase',
                'quantity': data['quantity'],
                'unit_price': data['cost_price'],
                'total_price': data['total_price'],
                'remarks': str('First purchase of ' + data['name'] + '.'),
                'customer_supplier': data['supplier'],
                'Status': data['Status']
            }).execute()
            
            if not result2.data:
                return jsonify({'error': 'Failed to insert transaction, no data returned'}), 500
            
            response1 = supabase.table('General_Ledger').insert({ 'accountTitle': "Accounts Payable", 'debit': data['total_price'], 'credit': None, 'description': str('Purchase:' + str(data['name'])) }).execute()
            if not response1.data:
                return jsonify({'error': 'Failed to insert ledger entry, no data returned'}), 500
            
            response2 = supabase.table('General_Ledger').insert({ 'accountTitle': "Cash", 'debit': None, 'credit': data['total_price'], 'description': str('Purchase:' + str(data['name']))}).execute()
            if not response2.data:
                return jsonify({'error': 'Failed to insert ledger entry, no data returned'}), 500
                
                            return jsonify({'Product Record': result.data, 'Transaction Record': result2.data, 'Ledger Records': {'debit' : response1.data, 'credit': response2.data}}), 200 

            """
            return jsonify({'Product Record': result.data}), 200 
        
        except ValueError as ve:
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as exception:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(exception)}), 500
        


@app.route('/api/Products/<id>', methods=['GET', 'PUT', 'DELETE'])
def manage_inventory(id):
    print(f"Received request for inventory item with ID: {id}")
    if not id:
        return jsonify({'error': 'ID is required'}), 400
    if request.method == 'PUT':
        try:
            data = request.get_json()
            print('Data: ', data)
            if not all(key in data for key in ['name', 'description', 'sku', 'selling_price', 'cost_price', 'threshold', 'category', 'quantity', 'supplier', 'Status']):
                return jsonify({'error': 'Missing required fields'}), 400
            # Get current quantity before update
            current_item = supabase.table('Inventory').select('quantity').eq('item_id', id).execute()
            if not current_item.data:
                return jsonify({'error': 'Inventory item not found'}), 404
            
            # Extract quantity from Supabase response
            current_quantity = int(current_item.data[0]['quantity']) if current_item.data and 'quantity' in current_item.data[0] else 0
            new_quantity = int(data['quantity'])
            
            response = supabase.table('Inventory').update(data).eq('item_id', id).execute()
            print('Update Response: ',response)
            if not response:
                return jsonify({'error': 'Inventory not found or no data updated'}), 404
            
            if new_quantity > current_quantity:
                increment = new_quantity - current_quantity
                total_price = increment * int(data['cost_price'])

                # Add ledger entries only
                ledger_debit = supabase.table('General_Ledger').insert({
                    'accountTitle': "Inventory",
                    'debit': total_price,
                    'credit': None,
                    'description': f'Inventory incremented for product: {data["name"]}'
                }).execute()
                ledger_credit = supabase.table('General_Ledger').insert({
                    'accountTitle': "Accounts Payable",
                    'debit': None,
                    'credit': total_price,
                    'description': f'Inventory incremented for product: {data["name"]}'
                }).execute()

                return jsonify({'Update Record': response.data, 'Ledger Debit': ledger_debit.data, 'Ledger Credit': ledger_credit.data}), 200
            
            elif new_quantity < current_quantity:
                product_id = get_inventory_id(data['name'])
                if not product_id:
                    return jsonify({'error': f'Product with name {data["name"]} not found in inventory.'}), 404
                data['product_id'] = product_id
                print(f"Product ID found: {product_id}")
            
                result2 = supabase.table("Transactions").insert({
                    'product_id': data['product_id'],
                    'item_name': data['name'],
                    'type': 'sell',
                    'quantity': (current_quantity - new_quantity),
                    'unit_price': data['selling_prices'],
                    'total_price': (int(data['quantity']) * int(data['selling_prices'])),
                    'remarks': ('First purchase of ' + data['name']),
                    'customer_supplier': 'Customer',
                    'Status': data['Status']
                }).execute()
                
                if not result2.data:
                    return jsonify({'error': 'Failed to insert transaction, no data returned'}), 500
            
                return jsonify({'Update Record': response.data, 'Transaction Record': result2.data}), 200 
            
            return jsonify(response.data), 200 
        
        except ValueError as ve:    
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            response = supabase.rpc('deactivate_product',{'product_id': id}).execute()
            print(f"Deactivated successfully: {response.data}")
            
            return jsonify({'message': 'Inventory deactivated successfully'}), 200
        except ValueError as ve:
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500
        
    elif request.method == 'GET':
        try:
            response = supabase.table('Inventory').select('*').eq('item_id', id).execute()
            if not response.data:
                return jsonify({'error': 'Inventory not found'}), 404
            return jsonify(response.data), 200
        except ValueError as ve:
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500



@app.route('/api/Inventory', methods=['GET'])
def get_inventory():
    if request.method == 'GET':
        try: 
            return jsonify({'total_stock_value': supabase.rpc("total_stock_value").execute().data, 
                            'n_active_items': supabase.rpc("get_n_active_items").execute().data,
                            'n_low_stock_items': supabase.rpc("get_n_low_stock_items").execute().data,
                            'get_n_out_of_stock_items': supabase.rpc("get_n_out_of_stock_items").execute().data,
                            'inventory_table': supabase.rpc("inventory_tracking").execute().data,
                            'top_3_recent_transactions': supabase.rpc("top_3_recent_transactions").execute().data}), 200
        
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500




@app.route('/api/LowStock', methods=['GET'])
def get_low_stock():
    if request.method == 'GET':
        try:
            response = supabase.rpc("low_stock_items").execute()
            if hasattr(response, 'error') and response.error:
                print(f"Supabase RPC error: {response.error}")
                return jsonify({'error': f'Supabase RPC error: {response.error}'}), 500
            print(f"Low stock RPC response: {response}")
            return jsonify({'Low_Stock_items': response.data}), 200
        except ValueError as ve:
            print(f"ValueError in /api/LowStock: {ve}")
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as e:
            tb.print_exc()  # Full error in console
            print(f"Exception in /api/LowStock: {e}")
            return jsonify({'error': str(e)}), 500




def get_inventory_id(item_name: str):
    try:
        response = supabase.rpc('get_inventory_id_by_name', {'item_name': item_name}).execute()
        print(f"Response from SQL function: {response.data}")
        if response.data:
            print(f"Found ID: {response.data}")
            return response.data
        else:
            print(f"No item named '{item_name}' found.")
            return None
    except ValueError as ve:
        print(f"ValueError: {ve}")
        return None
    except Exception as e:
        tb.print_exc()  # Full error in console
        print(f"Error calling SQL function: {e}")
        return None



@app.route('/api/Transactions', methods=['GET', 'POST'])
def get_or_create_Transactions():
    if request.method == 'GET':
        try:  
            return jsonify({'Transactions_table': supabase.rpc("transactions_table").execute().data}), 200
        except Exception as e:
            
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500
        
    elif request.method == 'POST':
        try:
            data = request.get_json()
            print(data)
            if not all(key in data for key in ['item_name', 'type', 'quantity', 'unit_price', 'total_price', 'customer_supplier']):
                return jsonify({'error': 'Missing required fields'}), 400
            product_id = get_inventory_id(data['item_name'])
            if not product_id:
                return jsonify({'error': f'Product with name {data["item_name"]} not found in inventory.'}), 404
            data['product_id'] = product_id
            print(f"Product ID found: {product_id}")
            print(f"Data to be inserted: {data}")
            result = supabase.table("Transactions").insert({
                'product_id': data['product_id'],
                'item_name': data['item_name'],
                'type': data['type'],
                'quantity': data['quantity'],
                'unit_price': data['unit_price'],
                'total_price': data['total_price'],
                'remarks': data.get('remarks'),
                'customer_supplier': data['customer_supplier'],
                'Status': 'completed'
            }).execute()
            if not result.data:
                return jsonify({'error': 'Failed to insert transaction, no data returned'}), 500
            return jsonify(result.data), 200
        except Exception as exception:
            
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(exception)}), 500



@app.route('/api/Transactions/<id>', methods=['DELETE'])
def delete_transaction(id):
    if request.method == 'DELETE':
        try:
            response = supabase.rpc('deactivate_transaction',{'transaction_id': id}).execute()
            print(f"Deactivate response: {response}")
            print(f"Deactivated successfully: {response.data}")
            return jsonify({'message': 'Transaction deactivated successfully'}), 200
        except ValueError as ve:
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500


@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    if request.method == 'GET':
        try:
            existing_emails = supabase.rpc("get_existing_emails").execute().data
            confirmed_emails = supabase.rpc("get_confirmed_emails").execute().data
            # ...existing code...
            return jsonify({
                'Existing_Emails': existing_emails,
                'Confirmed_Emails': confirmed_emails}), 200
        except ValueError as ve:
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500
