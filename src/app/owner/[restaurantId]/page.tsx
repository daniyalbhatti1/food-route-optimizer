'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Restaurant, Order, OrderItem, DeliveryJob, DeliveryStop } from '@/lib/types';
import OwnerOrdersTable from '@/components/OwnerOrdersTable';
import OwnerDeliveryPanel from '@/components/OwnerDeliveryPanel';
import MapView from '@/components/MapView';
import Link from 'next/link';

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export default function RestaurantOwnerPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = use(params);
  
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
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'delivery'>('orders');
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    } else if (!loading && user && user.role !== 'owner') {
      router.push('/restaurants');
    }
  }, [user, loading, router]);

  // Fetch restaurant details
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ['restaurants', restaurantId],
    queryFn: async (): Promise<Restaurant> => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch orders with real-time updates
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'restaurant', restaurantId],
    queryFn: async (): Promise<OrderWithItems[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Set up real-time subscription for orders
  useEffect(() => {
    if (!user || !restaurantId) return;

    console.log('Setting up real-time subscription for orders:', { restaurantId, userId: user.id });

    const channel = supabase
      .channel(`orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Real-time order update received:', payload);
          // Refetch orders when there are changes
          queryClient.invalidateQueries({ queryKey: ['orders', 'restaurant', restaurantId] });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription for orders');
      supabase.removeChannel(channel);
    };
  }, [user, restaurantId, queryClient]);

  // Fetch current delivery job
  const { data: currentJob } = useQuery({
    queryKey: ['delivery', 'jobs', restaurantId],
    queryFn: async (): Promise<DeliveryJob | null> => {
      const { data, error } = await supabase
        .from('delivery_jobs')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['Planned', 'InProgress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
    enabled: !!user
  });

  // Fetch delivery job data including route
  const { data: deliveryData } = useQuery({
    queryKey: ['delivery', 'job', currentJob?.id],
    queryFn: async () => {
      if (!currentJob) return null;
      
      const response = await fetch(`/api/owner/delivery/job?jobId=${currentJob.id}`);
      if (!response.ok) throw new Error('Failed to fetch delivery job data');
      return response.json();
    },
    enabled: !!currentJob
  });

  const stops = deliveryData?.stops || [];
  const routeData = deliveryData?.route;

  // Set up real-time subscription for delivery stops
  useEffect(() => {
    if (!user || !currentJob?.id) return;

    const channel = supabase
      .channel(`delivery-stops-${currentJob.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_stops',
          filter: `job_id=eq.${currentJob.id}`
        },
        () => {
          // Refetch delivery data when stops change
          queryClient.invalidateQueries({ queryKey: ['delivery', 'job', currentJob.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentJob?.id, queryClient]);

  // Accept order mutation removed - orders are auto-accepted

  // Create delivery mutation
  const createDeliveryMutation = useMutation({
    mutationFn: async ({ orderIds, freezeFirst }: { orderIds: string[], freezeFirst: boolean }) => {
      const response = await fetch('/api/owner/delivery/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurantId,
          orderIds,
          freezeFirst
        })
      });
      if (!response.ok) throw new Error('Failed to create delivery');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery', 'jobs', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['delivery', 'job'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'restaurant', restaurantId] });
      setSelectedOrders([]);
    }
  });

  // Recompute delivery mutation
  const recomputeDeliveryMutation = useMutation({
    mutationFn: async ({ freezeFirst }: { freezeFirst: boolean }) => {
      if (!currentJob) throw new Error('No active delivery job');
      
      const response = await fetch('/api/owner/delivery/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.id,
          freezeFirst
        })
      });
      if (!response.ok) throw new Error('Failed to recompute delivery');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery', 'jobs', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['delivery', 'job'] });
    }
  });

  // Mark delivered mutation
  const markDeliveredMutation = useMutation({
    mutationFn: async (stopId: string) => {
      if (!currentJob) throw new Error('No active delivery job');
      
      const response = await fetch('/api/owner/delivery/mark-delivered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.id,
          stopId
        })
      });
      if (!response.ok) throw new Error('Failed to mark delivered');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery', 'jobs', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['delivery', 'job'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'restaurant', restaurantId] });
    }
  });

  // handleAcceptOrder removed - orders are auto-accepted

  const handleStartDelivery = async (orderIds: string[], freezeFirst: boolean) => {
    setDeliveryLoading(true);
    try {
      await createDeliveryMutation.mutateAsync({ orderIds, freezeFirst });
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleRecompute = async (freezeFirst: boolean) => {
    setDeliveryLoading(true);
    try {
      await recomputeDeliveryMutation.mutateAsync({ freezeFirst });
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleMarkDelivered = (stopId: string) => {
    markDeliveredMutation.mutate(stopId);
  };

  // Prepare map data
  const mapCenter: [number, number] = restaurant ? 
    [restaurant.lng || 0, restaurant.lat || 0] : [0, 0];

  const mapMarkers = [
    // Restaurant marker
    ...(restaurant && restaurant.lat && restaurant.lng ? [{
      id: 'restaurant',
      lat: restaurant.lat,
      lng: restaurant.lng,
      title: restaurant.name,
      color: '#10B981' // Green for restaurant
    }] : []),
    // Delivery stops markers
    ...stops.filter((stop: DeliveryStop) => stop.lat && stop.lng).map((stop: DeliveryStop, index: number) => ({
      id: stop.id,
      lat: stop.lat!,
      lng: stop.lng!,
      title: `Stop ${index + 1}`,
      color: stop.status === 'Delivered' ? '#10B981' : '#3B82F6'
    }))
  ];

  // routeData is now fetched from the API

  if (loading || restaurantLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'owner' || !restaurant) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/owner" className="text-xl font-bold text-gray-900">
                Food Route Optimizer
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Owner: {user.full_name || user.email}
              </span>
              <Link
                href="/owner"
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                My Restaurants
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
          {/* Restaurant Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {restaurant.name}
            </h1>
            {restaurant.cuisine && (
              <p className="text-lg text-gray-600 mb-2">
                {restaurant.cuisine}
              </p>
            )}
            {restaurant.address && (
              <p className="text-gray-500">
                📍 {restaurant.address}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'delivery'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Delivery
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'orders' ? (
            <OwnerOrdersTable
              orders={orders || []}
              selectedOrders={selectedOrders}
              onOrderSelectionChange={setSelectedOrders}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Map */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Route</h3>
                  <MapView
                    center={mapCenter}
                    markers={mapMarkers}
                    route={routeData}
                  />
                </div>
              </div>

              {/* Delivery Panel */}
              <div className="lg:col-span-1">
                <OwnerDeliveryPanel
                  job={currentJob || null}
                  stops={stops}
                  onStartDelivery={handleStartDelivery}
                  onRecompute={handleRecompute}
                  onMarkDelivered={handleMarkDelivered}
                  selectedOrders={selectedOrders}
                  onOrderSelectionChange={setSelectedOrders}
                  loading={deliveryLoading}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
