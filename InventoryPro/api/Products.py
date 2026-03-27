from flask import Blueprint, jsonify, request
import traceback as tb
from supabase_client import supabase

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

products_bp = Blueprint('products', __name__)
@products_bp.route('/api/Products', methods=['GET', 'POST'])
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
            if not all(key in data for key in ['name', 'description', 'sku', 'selling_price', 'cost_price',  'threshold', 'category', 'quantity', 'Status']):
                return jsonify({'error': 'Missing required fields'}), 400
            record = {
                'name': data['name'],
                'description': data['description'],
                'sku': data['sku'],
                'category': data['category'],
                'selling_price': data['selling_price'],
                'quantity': data['quantity'],
                'status': data['Status'].lower(),
                'cost_price': data['cost_price'],
                'threshold': data['threshold']}
            
            result = supabase.table("Products").insert(record).execute()
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
        


@products_bp.route('/api/Products/<id>', methods=['GET', 'PUT', 'DELETE'])
def manage_inventory(id):
    print(f"Received request for inventory item with ID: {id}")
    if not id:
        return jsonify({'error': 'ID is required'}), 400
    if request.method == 'PUT':
        try:
            data = request.get_json()
            print('Data: ', data)
            if not all(key in data for key in ['name', 'description', 'sku', 'selling_price', 'cost_price', 'threshold', 'category', 'quantity', 'Status']):
                return jsonify({'error': 'Missing required fields'}), 400
            # Get current quantity before update
            current_item = supabase.table('Products').select('quantity').eq('id', id).execute()
            if not current_item.data:
                return jsonify({'error': 'Inventory item not found'}), 404
            
            # Extract quantity from Supabase response
            current_quantity = int(current_item.data[0]['quantity']) if current_item.data and 'quantity' in current_item.data[0] else 0
            new_quantity = int(data['quantity'])
            
            # Convert Status to status for database update
            update_record = {
                'name': data['name'],
                'description': data['description'],
                'sku': data['sku'],
                'category': data['category'],
                'selling_price': data['selling_price'],
                'quantity': data['quantity'],
                'status': data['Status'].lower(),
                'cost_price': data['cost_price'],
                'threshold': data['threshold']}
            
            response = supabase.table('Products').update(update_record).eq('id', id).execute()
            print('Update Response: ',response)

            if not response:
                return jsonify({'error': 'Inventory not found or no data updated'}), 404
            
            product_id = get_inventory_id(data['name'])
            
            if not product_id:
                return jsonify({'error': f'Product with name {data["name"]} not found in inventory.'}), 404
            
            if current_quantity != new_quantity:
                
                data['product_id'] = product_id
                print(f"Product ID found: {product_id}")
                
                quantity = abs(new_quantity - current_quantity)
                if new_quantity > current_quantity:
                    remarks = 'Purchase of ' + data['name']
                    ttype = 'Buy'
                elif new_quantity < current_quantity:
                    remarks = 'Sale of ' + data['name']
                    ttype = 'Sell'
                
                result2 = supabase.table("Transactions").insert({
                    'product_id': data['product_id'],
                    'type': ttype,
                    'quantity': quantity,
                    'remarks': remarks,
                    'Status': 'Completed'
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
            response = supabase.table('Products').select('*').eq('id', id).execute()
            if not response.data:
                return jsonify({'error': 'Inventory not found'}), 404
            return jsonify(response.data), 200
        except ValueError as ve:
            return jsonify({'error': f'Invalid data type: {str(ve)}'}), 400
        except Exception as e:
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(e)}), 500
