import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('C:/laragon/www/LeakGuard-Monitoring-System/web/.env.local')
url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

supabase = create_client(url, key)
res = supabase.table('prediction_logs').select('*').order('created_at', desc=True).limit(5).execute()
print(res.data)
