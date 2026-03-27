from flask import Blueprint, jsonify, request
import traceback as tb
from supabase_client import supabase


lowstock_bp = Blueprint('lowstock', __name__)
@lowstock_bp.route('/api/LowStock', methods=['GET'])
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
