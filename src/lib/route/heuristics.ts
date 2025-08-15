import { MatrixResult, RouteOptimizationResult } from '../types';

// Nearest Neighbor algorithm for initial route
export function nearestNeighbor(
  matrix: MatrixResult,
  startIndex: number = 0
): number[] {
  const { durations } = matrix;
  const n = durations.length;
  const visited = new Array(n).fill(false);
  const route = [startIndex];
  visited[startIndex] = true;
  
  let current = startIndex;
  
  // Visit each unvisited city
  for (let i = 1; i < n; i++) {
    let nearest = -1;
    let minDistance = Infinity;
    
    // Find the nearest unvisited city
    for (let j = 0; j < n; j++) {
      if (!visited[j] && durations[current][j] < minDistance) {
        minDistance = durations[current][j];
        nearest = j;
      }
    }
    
    if (nearest === -1) break;
    
    route.push(nearest);
    visited[nearest] = true;
    current = nearest;
  }
  
  return route;
}

// 2-opt algorithm for route improvement
export function twoOpt(
  route: number[],
  matrix: MatrixResult,
  maxIter: number = 50
): number[] {
  const { durations } = matrix;
  const n = route.length;
  let improved = true;
  let iterations = 0;
  
  while (improved && iterations < maxIter) {
    improved = false;
    iterations++;
    
    let bestImprovement = 0;
    let bestI = -1;
    let bestJ = -1;
    
    // Try all possible 2-opt swaps
    for (let i = 1; i < n - 2; i++) {
      for (let j = i + 1; j < n; j++) {
        // Calculate improvement from this swap
        const improvement = calculate2OptImprovement(route, durations, i, j);
        
        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          bestI = i;
          bestJ = j;
        }
      }
    }
    
    // Apply the best improvement if it's significant (> 1 second)
    if (bestImprovement > 1) {
      route = apply2OptSwap(route, bestI, bestJ);
      improved = true;
    }
  }
  
  return route;
}

// Calculate the improvement from a 2-opt swap
function calculate2OptImprovement(
  route: number[],
  durations: number[][],
  i: number,
  j: number
): number {
  const n = route.length;
  
  // Current distances
  const current1 = durations[route[i - 1]][route[i]];
  const current2 = durations[route[j]][route[j + 1 < n ? j + 1 : 0]];
  
  // New distances after swap
  const new1 = durations[route[i - 1]][route[j]];
  const new2 = durations[route[i]][route[j + 1 < n ? j + 1 : 0]];
  
  // Return improvement (positive means better)
  return (current1 + current2) - (new1 + new2);
}

// Apply a 2-opt swap to the route
function apply2OptSwap(route: number[], i: number, j: number): number[] {
  const newRoute = [...route];
  
  // Reverse the segment from i to j
  while (i < j) {
    [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
    i++;
    j--;
  }
  
  return newRoute;
}

// Main route optimization function
export function optimizeRoute(
  matrix: MatrixResult,
  startIndex: number = 0,
  freezeFirst: boolean = false
): RouteOptimizationResult {
  const { durations, distances } = matrix;
  const n = durations.length;
  
  if (n === 0) {
    return {
      route: [],
      totalDistance: 0,
      totalDuration: 0,
      legs: []
    };
  }
  
  if (n === 1) {
    return {
      route: [startIndex],
      totalDistance: 0,
      totalDuration: 0,
      legs: []
    };
  }
  
  // Build initial route with nearest neighbor
  let route = nearestNeighbor(matrix, startIndex);
  
  // Apply 2-opt improvement
  route = twoOpt(route, matrix);
  
  // If freezing first stop, ensure it stays at the beginning
  if (freezeFirst && route[0] !== startIndex) {
    // Find the start index in the route and move it to the front
    const startPos = route.indexOf(startIndex);
    if (startPos > 0) {
      const beforeStart = route.slice(0, startPos);
      const afterStart = route.slice(startPos + 1);
      route = [startIndex, ...afterStart, ...beforeStart];
    }
  }
  
  // Calculate totals
  let totalDistance = 0;
  let totalDuration = 0;
  
  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];
    totalDistance += distances[from][to];
    totalDuration += durations[from][to];
  }
  
  // Add return to start if it's a closed route
  if (route.length > 1) {
    const last = route[route.length - 1];
    const first = route[0];
    totalDistance += distances[last][first];
    totalDuration += durations[last][first];
  }
  
  return {
    route,
    totalDistance,
    totalDuration,
    legs: [] // Will be populated by the calling function
  };
}

// Calculate ETAs for a route
export function computeEtas(
  legs: Array<{ durationSec: number }>,
  startTime: Date,
  serviceMinutes: number = 3
): Date[] {
  const etas: Date[] = [];
  let currentTime = new Date(startTime);
  
  for (let i = 0; i < legs.length; i++) {
    // Add travel time
    currentTime = new Date(currentTime.getTime() + legs[i].durationSec * 1000);
    
    // Add service time (except for the last stop if it's a return to start)
    if (i < legs.length - 1) {
      currentTime = new Date(currentTime.getTime() + serviceMinutes * 60 * 1000);
    }
    
    etas.push(new Date(currentTime));
  }
  
  return etas;
}
