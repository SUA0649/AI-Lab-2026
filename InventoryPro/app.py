from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from supabase_client import supabase
import jwt

# Load environment variables from .env file''
status = load_dotenv()
#if not status:
    #raise ValueError("Failed to load environment variables from .env file.")


# Get your Supabase credentials from environment variables
#url = os.environ.get('SUPABASE_URL')
#key = os.environ.get('SERVICE_ROLE_KEY')
#if not url or not key:
 #   raise ValueError("Supabase URL, JWT or Key must be set in the environment variables.")


# Create the Supabase client
#supabase: Client = create_client(url, key)


jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
#if not jwt_secret:
 #   raise ValueError("Supabase JWT must be set in the environment variables.",url,key,jwt)
'''
"https://inventory-pro-self.vercel.app",
"https://inventory-pro-opal.vercel.app",
'''

# app instance
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
@app.route('/', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Backend is running'}), 200


from api.Dashboard import dashboard_bp
from api.Inventory import inventory_bp
from api.Products import products_bp
from api.LowStock import lowstock_bp
from api.accounts import accounts_bp
from api.Transactions import transactions_bp
from api.Agent_api import agent_bp
from api.DemandForecasting import demand_forecasting_bp

app.register_blueprint(dashboard_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(products_bp)
app.register_blueprint(lowstock_bp)
app.register_blueprint(accounts_bp)
app.register_blueprint(transactions_bp)
app.register_blueprint(agent_bp)
app.register_blueprint(demand_forecasting_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5006)
    #app.run()
