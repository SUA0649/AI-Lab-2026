from flask import Blueprint, jsonify, request
import traceback as tb
from supabase_client import supabase


ledger_bp = Blueprint('ledger', __name__)
@ledger_bp.route('/api/Ledger', methods=['GET', 'POST'])
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

