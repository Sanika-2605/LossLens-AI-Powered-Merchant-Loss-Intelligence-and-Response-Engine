import os
import json
import sys
from dotenv import load_dotenv
from sqlalchemy import text

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Add backend directory to path if needed
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import engine, Base
from app.models import *

def seed_supabase(data_dir='data/generated'):
    print("Seeding Supabase PostgreSQL database with synthetic dataset...", flush=True)
    
    if not engine:
        print("Error: Database connection not configured in .env.", flush=True)
        return

    # Ensure tables are created in Supabase
    print("Verifying/Creating database tables...", flush=True)
    Base.metadata.create_all(bind=engine)
    print("Tables verified.", flush=True)

    table_files = [
        ('customers', 'customers'),
        ('products', 'products'),
        ('coupons', 'coupons'),
        ('devices', 'devices'),
        ('addresses', 'addresses'),
        ('orders', 'orders'),
        ('payments', 'payments'),
        ('refunds', 'refunds'),
        ('events', 'events'),
        ('customer_device', 'customer_device'),
        ('customer_address', 'customer_address'),
        ('order_product', 'order_product')
    ]

    with engine.begin() as conn:
        for file_name, table_name in table_files:
            path = os.path.join(data_dir, f"{file_name}.json")
            if not os.path.exists(path):
                print(f"Skipping '{table_name}', file not found at {path}", flush=True)
                continue

            with open(path, 'r', encoding='utf-8') as fp:
                data = json.load(fp)

            if not data:
                print(f"No records to insert for '{table_name}'", flush=True)
                continue

            total = len(data)
            print(f"Inserting {total:,} records into table '{table_name}'...", flush=True)

            batch_size = 500
            inserted = 0
            for i in range(0, total, batch_size):
                batch = data[i:i+batch_size]
                
                if table_name == 'customers':
                    conn.execute(text("INSERT INTO customers (id, external_id, created_at, status) VALUES (:id, :external_id, :created_at, :status) ON CONFLICT (id) DO NOTHING"), batch)
                elif table_name == 'products':
                    conn.execute(text("INSERT INTO products (id, product_reference, name, category, price) VALUES (:id, :product_reference, :name, :category, :price) ON CONFLICT (id) DO NOTHING"), batch)
                elif table_name == 'coupons':
                    conn.execute(text("INSERT INTO coupons (id, coupon_code, discount_type, discount_value) VALUES (:id, :coupon_code, :discount_type, :discount_value) ON CONFLICT (id) DO NOTHING"), batch)
                elif table_name == 'devices':
                    conn.execute(text("INSERT INTO devices (id, device_fingerprint_hash, first_seen, last_seen) VALUES (:id, :device_fingerprint_hash, :first_seen, :last_seen) ON CONFLICT (id) DO NOTHING"), batch)
                elif table_name == 'addresses':
                    conn.execute(text("INSERT INTO addresses (id, address_hash, region, first_seen) VALUES (:id, :address_hash, :region, :first_seen) ON CONFLICT (id) DO NOTHING"), batch)
                elif table_name == 'orders':
                    conn.execute(text("INSERT INTO orders (id, customer_id, order_reference, total_amount, currency, status, coupon_id, created_at) VALUES (:id, :customer_id, :order_reference, :total_amount, :currency, :status, :coupon_id, :created_at) ON CONFLICT (id) DO NOTHING"), batch)
                elif table_name == 'payments':
                    formatted = []
                    for r in batch:
                        item = dict(r)
                        item['metadata_json'] = json.dumps(item.get('metadata_json', {}))
                        formatted.append(item)
                    conn.execute(text("INSERT INTO payments (id, order_id, customer_id, amount, currency, status, payment_method, provider, provider_payment_id, created_at, metadata_json) VALUES (:id, :order_id, :customer_id, :amount, :currency, :status, :payment_method, :provider, :provider_payment_id, :created_at, :metadata_json) ON CONFLICT (id) DO NOTHING"), formatted)
                elif table_name == 'refunds':
                    conn.execute(text("INSERT INTO refunds (id, payment_id, order_id, customer_id, amount, status, reason, created_at) VALUES (:id, :payment_id, :order_id, :customer_id, :amount, :status, :reason, :created_at) ON CONFLICT (id) DO NOTHING"), batch)
                elif table_name == 'events':
                    formatted = []
                    for r in batch:
                        item = dict(r)
                        item['payload'] = json.dumps(item.get('payload', {}))
                        formatted.append(item)
                    conn.execute(text("INSERT INTO events (id, event_type, entity_type, entity_id, event_timestamp, source, payload) VALUES (:id, :event_type, :entity_type, :entity_id, :event_timestamp, :source, :payload) ON CONFLICT (id) DO NOTHING"), formatted)
                elif table_name == 'customer_device':
                    conn.execute(text("INSERT INTO customer_device (customer_id, device_id) VALUES (:customer_id, :device_id) ON CONFLICT DO NOTHING"), batch)
                elif table_name == 'customer_address':
                    conn.execute(text("INSERT INTO customer_address (customer_id, address_id) VALUES (:customer_id, :address_id) ON CONFLICT DO NOTHING"), batch)
                elif table_name == 'order_product':
                    conn.execute(text("INSERT INTO order_product (order_id, product_id) VALUES (:order_id, :product_id) ON CONFLICT DO NOTHING"), batch)

                inserted += len(batch)
                print(f"  [{table_name}] {inserted:,}/{total:,} rows inserted...", flush=True)

            print(f"Done: '{table_name}' ({total:,} rows)", flush=True)

    print("\nALL TABLES SUCCESSFULLY SEEDED INTO SUPABASE POSTGRESQL!", flush=True)

if __name__ == '__main__':
    seed_supabase()
