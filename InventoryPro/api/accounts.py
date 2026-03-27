from flask import Blueprint, jsonify, request
import traceback as tb
from supabase_client import supabase


accounts_bp = Blueprint('accounts', __name__)
@accounts_bp.route('/api/accounts', methods=['GET'])
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

