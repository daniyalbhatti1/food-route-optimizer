'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Order, OrderItem } from '@/lib/types';
import Link from 'next/link';

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  restaurant: {
    name: string;
  };
}

export default function OrdersPage() {
  // Add safety check for AuthProvider
  let authData;
  try {
    authData = useAuth();
  } catch (error) {
    // AuthProvider not ready yet, show loading
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  const { user, loading, signOut } = authData;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(
    searchParams.get('orderId')
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders', 'user', user?.id],
    queryFn: async (): Promise<OrderWithItems[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          restaurant:restaurants(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Set up real-time subscription for user orders
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch orders when there are changes
          queryClient.invalidateQueries({ queryKey: ['orders', 'user', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Accepted':
        return 'bg-blue-100 text-blue-800';
      case 'OutForDelivery':
        return 'bg-purple-100 text-purple-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OutForDelivery':
        return 'Out for Delivery';
      default:
        return status;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/restaurants" className="text-xl font-bold text-gray-900">
                Food Route Optimizer
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.full_name || user.email}
              </span>
              <Link
                href="/restaurants"
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                Browse Restaurants
              </Link>
              <button
                onClick={() => signOut()}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Orders
            </h1>
            <p className="text-gray-600">
              Track your orders and delivery status
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800">
                Error loading orders. Please try again.
              </p>
            </div>
          )}

          {orders && orders.length > 0 ? (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all duration-300 ${
                    highlightedOrderId === order.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.restaurant?.name || 'Restaurant'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Order Items:</h4>
                    <div className="space-y-2">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.qty}x {item.name_snapshot}
                          </span>
                          <span className="font-medium">
                            {formatPrice(item.price_cents_snapshot * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Delivery Address:</p>
                        <p className="font-medium">{order.delivery_address}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Customer:</p>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-gray-500">{order.customer_phone}</p>
                      </div>
                    </div>
                  </div>

                  {order.status === 'OutForDelivery' && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-blue-800 font-medium">
                          Your order is on its way! Track the delivery in real-time.
                        </span>
                      </div>
                    </div>
                  )}

                  {order.note && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Note:</span> {order.note}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No orders yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start by placing an order from one of our restaurants
              </p>
              <Link
                href="/restaurants"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Browse Restaurants
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
