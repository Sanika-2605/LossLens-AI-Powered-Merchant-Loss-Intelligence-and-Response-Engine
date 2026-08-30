import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Table, JSON
from sqlalchemy.orm import relationship
from app.database import Base

customer_device = Table(
    'customer_device',
    Base.metadata,
    Column('customer_id', String, ForeignKey('customers.id'), primary_key=True),
    Column('device_id', String, ForeignKey('devices.id'), primary_key=True)
)

customer_address = Table(
    'customer_address',
    Base.metadata,
    Column('customer_id', String, ForeignKey('customers.id'), primary_key=True),
    Column('address_id', String, ForeignKey('addresses.id'), primary_key=True)
)

order_product = Table(
    'order_product',
    Base.metadata,
    Column('order_id', String, ForeignKey('orders.id'), primary_key=True),
    Column('product_id', String, ForeignKey('products.id'), primary_key=True)
)

class Customer(Base):
    __tablename__ = 'customers'
    id = Column(String, primary_key=True, index=True)
    external_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String)

    orders = relationship("Order", back_populates="customer")
    devices = relationship("Device", secondary=customer_device, back_populates="customers")
    addresses = relationship("Address", secondary=customer_address, back_populates="customers")

class Order(Base):
    __tablename__ = 'orders'
    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey('customers.id'))
    order_reference = Column(String, index=True)
    total_amount = Column(Float)
    currency = Column(String)
    status = Column(String)
    coupon_id = Column(String, ForeignKey('coupons.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="orders")
    payments = relationship("Payment", back_populates="order")
    products = relationship("Product", secondary=order_product, back_populates="orders")
    coupon = relationship("Coupon", back_populates="orders")

class Payment(Base):
    __tablename__ = 'payments'
    id = Column(String, primary_key=True, index=True)
    order_id = Column(String, ForeignKey('orders.id'))
    customer_id = Column(String, ForeignKey('customers.id'))
    amount = Column(Float)
    currency = Column(String)
    status = Column(String)
    payment_method = Column(String)
    provider = Column(String)
    provider_payment_id = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column(JSON)  # using metadata_json since metadata is reserved in Base

    order = relationship("Order", back_populates="payments")
    refunds = relationship("Refund", back_populates="payment")

class Refund(Base):
    __tablename__ = 'refunds'
    id = Column(String, primary_key=True, index=True)
    payment_id = Column(String, ForeignKey('payments.id'))
    order_id = Column(String, ForeignKey('orders.id'))
    customer_id = Column(String, ForeignKey('customers.id'))
    amount = Column(Float)
    status = Column(String)
    reason = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    payment = relationship("Payment", back_populates="refunds")

class Product(Base):
    __tablename__ = 'products'
    id = Column(String, primary_key=True, index=True)
    product_reference = Column(String, index=True)
    name = Column(String)
    category = Column(String)
    price = Column(Float)

    orders = relationship("Order", secondary=order_product, back_populates="products")

class Device(Base):
    __tablename__ = 'devices'
    id = Column(String, primary_key=True, index=True)
    device_fingerprint_hash = Column(String, index=True)
    first_seen = Column(DateTime)
    last_seen = Column(DateTime)

    customers = relationship("Customer", secondary=customer_device, back_populates="devices")

class Address(Base):
    __tablename__ = 'addresses'
    id = Column(String, primary_key=True, index=True)
    address_hash = Column(String, index=True)
    region = Column(String)
    first_seen = Column(DateTime)

    customers = relationship("Customer", secondary=customer_address, back_populates="addresses")

class Coupon(Base):
    __tablename__ = 'coupons'
    id = Column(String, primary_key=True, index=True)
    coupon_code = Column(String, index=True)
    discount_type = Column(String)
    discount_value = Column(Float)

    orders = relationship("Order", back_populates="coupon")

class Event(Base):
    __tablename__ = 'events'
    id = Column(String, primary_key=True, index=True)
    event_type = Column(String, index=True)
    entity_type = Column(String, index=True)
    entity_id = Column(String, index=True)
    event_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    source = Column(String)
    payload = Column(JSON)
