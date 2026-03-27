from flask import Blueprint, jsonify, request
from supabase_client import supabase
import traceback as tb

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


transactions_bp = Blueprint('transactions', __name__)
@transactions_bp.route('/api/Transactions', methods=['GET', 'POST'])
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
            #if not all(key in data for key in [''type', 'quantity', 'unit_price', 'total_price', 'customer_supplier']):
            #    return jsonify({'error': 'Missing required fields'}), 400
            for i in range(len(data['item_name'])):
                product_id = get_inventory_id(data['item_name'][i])
                if not product_id:
                    return jsonify({'error': f'Product with name {data["item_name"][i]} not found in inventory.'}), 404
                data['product_id'] = product_id
                print(f"Product ID found: {product_id}")
                print(f"Data to be inserted: {data}")
                result = supabase.table("Transactions").insert({
                    'product_id': data['product_id'],
                    'type': data['type'],
                    'quantity': data['quantity'][i],
                    'remarks': data.get('remarks'),
                    'name': data['name'],
                    'Status': data['Status']
                    }).execute()
                if not result.data:
                    return jsonify({'error': 'Failed to insert transaction, no data returned'}), 500
            return jsonify(result.data), 200
        except Exception as exception:
            
            tb.print_exc()  # Full error in console
            return jsonify({'error': str(exception)}), 500



@transactions_bp.route('/api/Transactions/<id>', methods=['DELETE'])
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