export interface Profile {
  id: string;
  full_name: string | null;
  role: 'user' | 'owner' | 'admin';
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string | null;
  name: string;
  cuisine: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  restaurant_id: string;
  status: 'Pending' | 'Accepted' | 'OutForDelivery' | 'Delivered' | 'Failed';
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  price_cents_snapshot: number;
  qty: number;
}

export interface DeliveryJob {
  id: string;
  restaurant_id: string;
  status: 'Planned' | 'InProgress' | 'Completed' | 'Canceled';
  algorithm: string | null;
  totals: {
    distanceMeters: number;
    durationSec: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryStop {
  id: string;
  job_id: string;
  order_id: string | null;
  seq: number;
  lat: number | null;
  lng: number | null;
  eta: string | null;
  status: 'Planned' | 'EnRoute' | 'Delivered' | 'Skipped' | 'Failed';
  leg: {
    distanceMeters: number;
    durationSec: number;
    geometry: any;
  } | null;
}

// API Request/Response types
export interface CreateOrderRequest {
  restaurantId: string;
  items: Array<{
    menuItemId: string;
    qty: number;
  }>;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
}

export interface CreateOrderResponse {
  orderId: string;
  status: string;
}

export interface CreateDeliveryRequest {
  restaurantId: string;
  orderIds: string[];
  freezeFirst: boolean;
}

export interface RecomputeDeliveryRequest {
  jobId: string;
  freezeFirst: boolean;
}

export interface MarkDeliveredRequest {
  jobId: string;
  stopId: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  placeName: string;
}

export interface MatrixResult {
  durations: number[][];
  distances: number[][];
}

export interface RouteLeg {
  distanceMeters: number;
  durationSec: number;
  geometry: any;
}

// Component props
export interface RestaurantCardProps {
  restaurant: Restaurant;
}

export interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export interface CartProps {
  items: Array<{
    item: MenuItem;
    qty: number;
  }>;
  onUpdateQty: (itemId: string, qty: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
}

export interface OwnerOrdersTableProps {
  orders: (Order & { order_items: OrderItem[] })[];
  onAcceptOrder: (orderId: string) => void;
}

export interface OwnerDeliveryPanelProps {
  job: DeliveryJob | null;
  stops: DeliveryStop[];
  onStartDelivery: (orderIds: string[], freezeFirst: boolean) => void;
  onRecompute: (freezeFirst: boolean) => void;
  onMarkDelivered: (stopId: string) => void;
  selectedOrders: string[];
  onOrderSelectionChange: (orderIds: string[]) => void;
}

export interface MapViewProps {
  center: [number, number];
  markers: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    color?: string;
  }>;
  route?: {
    geometry: any;
    legs: RouteLeg[];
  };
  onMarkerClick?: (markerId: string) => void;
}

// Cart state
export interface CartItem {
  item: MenuItem;
  qty: number;
}

// Auth types
export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  role: 'user' | 'owner' | 'admin';
}

// Route optimization types
export interface RouteOptimizationResult {
  route: number[];
  totalDistance: number;
  totalDuration: number;
  legs: RouteLeg[];
}

// Database type for Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'created_at'>>;
      };
      restaurants: {
        Row: Restaurant;
        Insert: Omit<Restaurant, 'id' | 'created_at'>;
        Update: Partial<Omit<Restaurant, 'id' | 'created_at'>>;
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, 'id' | 'created_at'>;
        Update: Partial<Omit<MenuItem, 'id' | 'created_at'>>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, 'id'>;
        Update: Partial<Omit<OrderItem, 'id'>>;
      };
      delivery_jobs: {
        Row: DeliveryJob;
        Insert: Omit<DeliveryJob, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeliveryJob, 'id' | 'created_at' | 'updated_at'>>;
      };
      delivery_stops: {
        Row: DeliveryStop;
        Insert: Omit<DeliveryStop, 'id'>;
        Update: Partial<Omit<DeliveryStop, 'id'>>;
      };
    };
  };
}
