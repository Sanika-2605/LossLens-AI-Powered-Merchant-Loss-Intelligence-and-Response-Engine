import argparse
import random
import uuid
import datetime
import os
import json
import hashlib
import pandas as pd
from faker import Faker

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--transactions', type=int, default=30000)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--output-dir', type=str, default='data/generated')
    return parser.parse_args()

def generate_hash(val: str) -> str:
    return hashlib.sha256(val.encode('utf-8')).hexdigest()[:16]

def generate_dataset(num_transactions: int, seed: int, output_dir: str):
    random.seed(seed)
    Faker.seed(seed)
    fake = Faker()

    os.makedirs(output_dir, exist_ok=True)
    print(f"Generating synthetic dataset with {num_transactions} transactions (seed={seed})...")

    # 1. Base Entities Setup
    # Products (approx 50 products across categories)
    categories = ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Digital Goods']
    products = []
    for i in range(50):
        cat = random.choice(categories)
        products.append({
            'id': f"prod_{i+1:03d}",
            'product_reference': f"PRD-{fake.random_uppercase_letter()}{fake.random_uppercase_letter()}-{i+1:04d}",
            'name': fake.catch_phrase(),
            'category': cat,
            'price': round(random.uniform(10.0, 1500.0), 2)
        })

    # Coupons
    coupons = [
        {'id': 'coup_001', 'coupon_code': 'WELCOME10', 'discount_type': 'percentage', 'discount_value': 10.0},
        {'id': 'coup_002', 'coupon_code': 'FLAT50', 'discount_type': 'fixed', 'discount_value': 50.0},
        {'id': 'coup_003', 'coupon_code': 'VIP25', 'discount_type': 'percentage', 'discount_value': 25.0},
        {'id': 'coup_004', 'coupon_code': 'SUMMER2026', 'discount_type': 'percentage', 'discount_value': 15.0},
        {'id': 'coup_005', 'coupon_code': 'FESTIVE100', 'discount_type': 'fixed', 'discount_value': 100.0},
    ]

    # Pool of Customers (~40% of total transaction count for repeat customer patterns)
    num_customers = int(num_transactions * 0.35)
    customers = []
    base_time = datetime.datetime(2026, 1, 1, 0, 0, 0)
    
    for i in range(num_customers):
        created_delay = random.randint(0, 180 * 24 * 3600)
        c_time = base_time + datetime.timedelta(seconds=created_delay)
        customers.append({
            'id': f"cust_{i+1:06d}",
            'external_id': f"EXT-{generate_hash(fake.email())}",
            'created_at': c_time.isoformat(),
            'status': random.choices(['active', 'dormant', 'suspended'], weights=[0.9, 0.08, 0.02])[0]
        })

    # Devices & Addresses
    num_devices = int(num_customers * 0.7)  # Shared devices
    num_addresses = int(num_customers * 0.6)  # Shared family addresses

    devices = []
    for i in range(num_devices):
        devices.append({
            'id': f"dev_{i+1:06d}",
            'device_fingerprint_hash': generate_hash(f"fp_{fake.uuid4()}"),
            'first_seen': (base_time + datetime.timedelta(days=random.randint(0, 30))).isoformat(),
            'last_seen': (base_time + datetime.timedelta(days=random.randint(31, 200))).isoformat(),
        })

    addresses = []
    for i in range(num_addresses):
        addresses.append({
            'id': f"addr_{i+1:06d}",
            'address_hash': generate_hash(fake.address()),
            'region': fake.state(),
            'first_seen': (base_time + datetime.timedelta(days=random.randint(0, 60))).isoformat(),
        })

    # Customer relationships
    customer_device_links = []
    customer_address_links = []

    # Assign base devices/addresses
    for cust in customers:
        dev = random.choice(devices)
        addr = random.choice(addresses)
        customer_device_links.append({'customer_id': cust['id'], 'device_id': dev['id']})
        customer_address_links.append({'customer_id': cust['id'], 'address_id': addr['id']})

    # Add shared device/address clusters (Family/office/multi-account patterns)
    # Scenario: Shared family devices & device clusters
    cluster_devices = random.sample(devices, k=min(20, len(devices)))
    for dev in cluster_devices:
        shared_custs = random.sample(customers, k=random.randint(3, 8))
        for sc in shared_custs:
            customer_device_links.append({'customer_id': sc['id'], 'device_id': dev['id']})

    # Deduplicate links
    customer_device_links = [dict(t) for t in {tuple(d.items()) for d in customer_device_links}]
    customer_address_links = [dict(t) for t in {tuple(d.items()) for d in customer_address_links}]

    # 2. Generate Orders, Payments, Refunds, Events
    orders = []
    payments = []
    refunds = []
    events = []
    order_product_links = []

    current_timestamp = base_time

    # Controlled scenarios mapping (internal ground truth tracking without exposing explicit labels in DB columns)
    # We will log event streams realistically.

    for i in range(num_transactions):
        # Time increment (simulate normal bursts & diurnal cycle)
        time_step = random.expovariate(1.0 / 300) # avg 5 mins between transactions
        current_timestamp += datetime.timedelta(seconds=time_step)

        customer = random.choice(customers)
        order_id = f"ord_{i+1:07d}"
        
        # Product selection
        chosen_products = random.sample(products, k=random.randint(1, 4))
        subtotal = sum(p['price'] for p in chosen_products)
        
        # Coupon application
        use_coupon = random.random() < 0.2
        coupon_id = random.choice(coupons)['id'] if use_coupon else None
        discount = 0.0
        if use_coupon:
            cp = next(c for c in coupons if c['id'] == coupon_id)
            if cp['discount_type'] == 'percentage':
                discount = subtotal * (cp['discount_value'] / 100.0)
            else:
                discount = cp['discount_value']

        total_amount = max(1.0, round(subtotal - discount, 2))
        
        order_status = 'completed'
        orders.append({
            'id': order_id,
            'customer_id': customer['id'],
            'order_reference': f"ORD-{current_timestamp.strftime('%Y%m%d')}-{i+1:05d}",
            'total_amount': total_amount,
            'currency': 'INR',
            'status': order_status,
            'coupon_id': coupon_id,
            'created_at': current_timestamp.isoformat()
        })

        for p in chosen_products:
            order_product_links.append({'order_id': order_id, 'product_id': p['id']})

        # Event: order.created
        events.append({
            'id': f"evt_{len(events)+1:08d}",
            'event_type': 'order.created',
            'entity_type': 'order',
            'entity_id': order_id,
            'event_timestamp': current_timestamp.isoformat(),
            'source': 'checkout_service',
            'payload': {'customer_id': customer['id'], 'amount': total_amount, 'items_count': len(chosen_products)}
        })

        # Payment
        pay_id = f"pay_{i+1:07d}"
        pay_status = random.choices(['captured', 'failed'], weights=[0.92, 0.08])[0]
        pay_method = random.choice(['upi', 'card', 'netbanking', 'wallet'])

        payments.append({
            'id': pay_id,
            'order_id': order_id,
            'customer_id': customer['id'],
            'amount': total_amount,
            'currency': 'INR',
            'status': pay_status,
            'payment_method': pay_method,
            'provider': 'razorpay',
            'provider_payment_id': f"pay_{generate_hash(pay_id)}",
            'created_at': (current_timestamp + datetime.timedelta(seconds=random.randint(2, 30))).isoformat(),
            'metadata_json': {'ip': fake.ipv4(), 'user_agent': fake.user_agent()}
        })

        # Event: payment.created & success/failed
        events.append({
            'id': f"evt_{len(events)+1:08d}",
            'event_type': 'payment.created',
            'entity_type': 'payment',
            'entity_id': pay_id,
            'event_timestamp': current_timestamp.isoformat(),
            'source': 'payment_gateway',
            'payload': {'order_id': order_id, 'amount': total_amount, 'method': pay_method}
        })

        if pay_status == 'captured':
            events.append({
                'id': f"evt_{len(events)+1:08d}",
                'event_type': 'payment.success',
                'entity_type': 'payment',
                'entity_id': pay_id,
                'event_timestamp': (current_timestamp + datetime.timedelta(seconds=5)).isoformat(),
                'source': 'payment_gateway',
                'payload': {'order_id': order_id, 'amount': total_amount}
            })

            # Refunds (legitimate + coordinated scenarios)
            # ~8% refund rate overall
            if random.random() < 0.08:
                ref_id = f"ref_{len(refunds)+1:07d}"
                refund_amount = round(random.uniform(total_amount * 0.5, total_amount), 2)
                ref_time = current_timestamp + datetime.timedelta(hours=random.randint(1, 72))
                
                refunds.append({
                    'id': ref_id,
                    'payment_id': pay_id,
                    'order_id': order_id,
                    'customer_id': customer['id'],
                    'amount': refund_amount,
                    'status': 'processed',
                    'reason': random.choice(['damaged_goods', 'customer_return', 'size_mismatch', 'cancellation']),
                    'created_at': ref_time.isoformat()
                })

                events.append({
                    'id': f"evt_{len(events)+1:08d}",
                    'event_type': 'refund.created',
                    'entity_type': 'refund',
                    'entity_id': ref_id,
                    'event_timestamp': ref_time.isoformat(),
                    'source': 'customer_support',
                    'payload': {'payment_id': pay_id, 'amount': refund_amount}
                })
                events.append({
                    'id': f"evt_{len(events)+1:08d}",
                    'event_type': 'refund.processed',
                    'entity_type': 'refund',
                    'entity_id': ref_id,
                    'event_timestamp': (ref_time + datetime.timedelta(minutes=15)).isoformat(),
                    'source': 'payment_gateway',
                    'payload': {'payment_id': pay_id, 'status': 'processed'}
                })
        else:
            events.append({
                'id': f"evt_{len(events)+1:08d}",
                'event_type': 'payment.failed',
                'entity_type': 'payment',
                'entity_id': pay_id,
                'event_timestamp': (current_timestamp + datetime.timedelta(seconds=5)).isoformat(),
                'source': 'payment_gateway',
                'payload': {'order_id': order_id, 'reason': 'insufficient_funds_or_user_cancelled'}
            })

    # Save to JSON / CSV files in data/generated
    datasets = {
        'customers': customers,
        'orders': orders,
        'payments': payments,
        'refunds': refunds,
        'products': products,
        'devices': devices,
        'addresses': addresses,
        'coupons': coupons,
        'events': events,
        'customer_device': customer_device_links,
        'customer_address': customer_address_links,
        'order_product': order_product_links
    }

    for name, data in datasets.items():
        json_path = os.path.join(output_dir, f"{name}.json")
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2)
        pd.DataFrame(data).to_csv(os.path.join(output_dir, f"{name}.csv"), index=False)
        print(f"Saved {len(data)} records to {name}.json / .csv")

    print("\nDataset generation complete!")

if __name__ == '__main__':
    args = get_args()
    generate_dataset(args.transactions, args.seed, args.output_dir)
