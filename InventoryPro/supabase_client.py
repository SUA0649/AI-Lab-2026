import os
from dotenv import load_dotenv
from supabase import create_client, Client
import traceback as tb

load_dotenv()

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SERVICE_ROLE_KEY')

supabase: Client = create_client(url, key)
