'use client';

import { CartItem } from '@/lib/types';

interface CartProps {
  items: CartItem[];
  onUpdateQty: (itemId: string, qty: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
}

export default function Cart({ items, onUpdateQty, onRemove, onCheckout }: CartProps) {
  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(2)}`;
  };

  const totalPrice = items.reduce((sum, cartItem) => {
    return sum + (cartItem.item.price_cents * cartItem.qty);
  }, 0);

  const totalItems = items.reduce((sum, cartItem) => sum + cartItem.qty, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Cart</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
            </svg>
          </div>
          <p className="text-gray-500">Your cart is empty</p>
          <p className="text-sm text-gray-400">Add some items to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Cart</h3>
      
      <div className="space-y-4 mb-6">
        {items.map((cartItem) => (
          <div key={cartItem.item.id} className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{cartItem.item.name}</h4>
              <p className="text-sm text-gray-600">{formatPrice(cartItem.item.price_cents)}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onUpdateQty(cartItem.item.id, cartItem.qty - 1)}
                disabled={cartItem.qty <= 1}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              <span className="w-8 text-center font-medium text-gray-900">
                {cartItem.qty}
              </span>
              
              <button
                onClick={() => onUpdateQty(cartItem.item.id, cartItem.qty + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              
              <button
                onClick={() => onRemove(cartItem.item.id)}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-900">Total ({totalItems} items)</span>
          <span className="text-xl font-bold text-indigo-600">{formatPrice(totalPrice)}</span>
        </div>
        
        <button
          onClick={onCheckout}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-md font-medium transition-colors duration-200"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
