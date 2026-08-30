import os
import json
import pandas as pd
import datetime

def validate_dataset(data_dir='data/generated'):
    print(f"Validating synthetic dataset in '{data_dir}'...")

    files = [
        'customers', 'orders', 'payments', 'refunds', 'products',
        'devices', 'addresses', 'coupons', 'events',
        'customer_device', 'customer_address', 'order_product'
    ]

    data = {}
    for f in files:
        file_path = os.path.join(data_dir, f"{f}.json")
        if not os.path.exists(file_path):
            print(f"Error: Missing dataset file {file_path}")
            return False
        with open(file_path, 'r') as fp:
            data[f] = json.load(fp)

    errors = []

    # 1. Check duplicate IDs
    for entity in ['customers', 'orders', 'payments', 'refunds', 'products', 'devices', 'addresses', 'coupons', 'events']:
        ids = [item['id'] for item in data[entity]]
        if len(ids) != len(set(ids)):
            errors.append(f"Duplicate IDs detected in '{entity}'")

    # 2. Check foreign keys and orphan records
    cust_ids = {c['id'] for c in data['customers']}
    order_ids = {o['id'] for o in data['orders']}
    payment_ids = {p['id'] for p in data['payments']}
    prod_ids = {p['id'] for p in data['products']}
    dev_ids = {d['id'] for d in data['devices']}
    addr_ids = {a['id'] for a in data['addresses']}

    for o in data['orders']:
        if o['customer_id'] not in cust_ids:
            errors.append(f"Orphan order {o['id']} referencing missing customer {o['customer_id']}")

    for p in data['payments']:
        if p['order_id'] not in order_ids:
            errors.append(f"Orphan payment {p['id']} referencing missing order {p['order_id']}")
        if p['customer_id'] not in cust_ids:
            errors.append(f"Orphan payment {p['id']} referencing missing customer {p['customer_id']}")

    for r in data['refunds']:
        if r['payment_id'] not in payment_ids:
            errors.append(f"Orphan refund {r['id']} referencing missing payment {r['payment_id']}")
        if r['order_id'] not in order_ids:
            errors.append(f"Orphan refund {r['id']} referencing missing order {r['order_id']}")

    # 3. Check negative amounts and refund > payment
    payments_map = {p['id']: p['amount'] for p in data['payments']}

    for p in data['payments']:
        if p['amount'] < 0:
            errors.append(f"Negative amount in payment {p['id']}: {p['amount']}")

    for r in data['refunds']:
        if r['amount'] < 0:
            errors.append(f"Negative amount in refund {r['id']}: {r['amount']}")
        orig_amt = payments_map.get(r['payment_id'])
        if orig_amt is not None and r['amount'] > orig_amt:
            errors.append(f"Refund {r['id']} amount {r['amount']} exceeds payment amount {orig_amt}")

    # 4. Check invalid timestamps
    for entity in ['customers', 'orders', 'payments', 'refunds', 'events']:
        ts_field = 'event_timestamp' if entity == 'events' else 'created_at'
        for item in data[entity]:
            try:
                datetime.datetime.fromisoformat(item[ts_field])
            except (ValueError, KeyError):
                errors.append(f"Invalid timestamp in {entity} {item.get('id')}: {item.get(ts_field)}")

    if errors:
        print(f"\nValidation FAILED with {len(errors)} error(s):")
        for err in errors[:10]:
            print(f"- {err}")
        if len(errors) > 10:
            print(f"...and {len(errors)-10} more errors.")
        return False

    print("\nDataset validation PASSED! All integrity checks clean.")
    return True

if __name__ == '__main__':
    validate_dataset()
