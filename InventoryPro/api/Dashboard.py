from flask import Blueprint, jsonify, request
import traceback as tb
from supabase_client import supabase


dashboard_bp = Blueprint('dashboard', __name__)
@dashboard_bp.route('/api/Dashboard', methods=['GET'])
def get_dashboard():
    if request.method == 'GET':
        try:
            response = supabase.table('Products').select('quantity').execute()
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
