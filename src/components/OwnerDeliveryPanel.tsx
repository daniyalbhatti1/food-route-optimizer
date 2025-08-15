'use client';

import { DeliveryJob, DeliveryStop } from '@/lib/types';

interface OwnerDeliveryPanelProps {
  job: DeliveryJob | null;
  stops: DeliveryStop[];
  onStartDelivery: (orderIds: string[], freezeFirst: boolean) => void;
  onRecompute: (freezeFirst: boolean) => void;
  onMarkDelivered: (stopId: string) => void;
  selectedOrders: string[];
  onOrderSelectionChange: (orderIds: string[]) => void;
  loading?: boolean;
}

export default function OwnerDeliveryPanel({
  job,
  stops,
  onStartDelivery,
  onRecompute,
  onMarkDelivered,
  selectedOrders,
  onOrderSelectionChange,
  loading = false
}: OwnerDeliveryPanelProps) {
  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned':
        return 'bg-gray-100 text-gray-800';
      case 'EnRoute':
        return 'bg-blue-100 text-blue-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Skipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartDelivery = () => {
    if (selectedOrders.length === 0) return;
    onStartDelivery(selectedOrders, false);
  };

  return (
    <div className="space-y-6">
      {/* Delivery Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Delivery Management
        </h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Selected Orders: {selectedOrders.length}
            </p>
            <button
              onClick={handleStartDelivery}
              disabled={selectedOrders.length === 0 || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
            >
              {loading ? 'Optimizing Route...' : 'Start Delivery'}
            </button>
          </div>

          {job && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Current Delivery Job</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
              
              {job.totals && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDistance(job.totals.distanceMeters)}
                    </div>
                    <div className="text-sm text-gray-500">Total Distance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDuration(job.totals.durationSec)}
                    </div>
                    <div className="text-sm text-gray-500">Total Time</div>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => onRecompute(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Recompute Route
                </button>
                <button
                  onClick={() => onRecompute(true)}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Freeze First Stop
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Stops */}
      {stops.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Delivery Stops ({stops.length})
          </h3>
          
          <div className="space-y-3">
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  stop.status === 'Delivered'
                    ? 'border-green-200 bg-green-50'
                    : stop.status === 'EnRoute'
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      stop.status === 'Delivered'
                        ? 'bg-green-500'
                        : stop.status === 'EnRoute'
                        ? 'bg-blue-500'
                        : 'bg-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        Stop {index + 1}
                      </div>
                      <div className="text-sm text-gray-500">
                        ETA: {formatTime(stop.eta)}
                      </div>
                      {stop.leg && (
                        <div className="text-xs text-gray-400">
                          {formatDistance(stop.leg.distanceMeters)} • {formatDuration(stop.leg.durationSec)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(stop.status)}`}>
                      {stop.status}
                    </span>
                    
                    {stop.status === 'Planned' && (
                      <button
                        onClick={() => onMarkDelivered(stop.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select orders you want to deliver together</li>
          <li>• Click "Start Delivery" to optimize the route</li>
          <li>• Use "Recompute" to recalculate the route</li>
          <li>• "Freeze First Stop" keeps the first stop fixed</li>
          <li>• Mark stops as delivered as you complete them</li>
        </ul>
      </div>
    </div>
  );
}
