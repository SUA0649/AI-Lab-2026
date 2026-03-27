from flask import Blueprint, jsonify, request
import traceback as tb
from supabase_client import supabase

inventory_bp = Blueprint('inventory', __name__)
@inventory_bp.route('/api/Inventory', methods=['GET'])
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
