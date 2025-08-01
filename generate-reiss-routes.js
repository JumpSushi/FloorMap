#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Calculate the distance between two points
 */
function distance(p1, p2) {
  const [lon1, lat1] = p1;
  const [lon2, lat2] = p2;
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate the centroid of a polygon
 */
function getCentroid(polygon) {
  const coords = polygon.coordinates[0];
  let x = 0, y = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    x += coords[i][0];
    y += coords[i][1];
  }
  return [x / (coords.length - 1), y / (coords.length - 1)];
}

/**
 * Get a more intelligent path through a corridor polygon
 * Creates waypoints along the corridor's medial axis
 */
function getCorridorWaypoints(corridor) {
  const coords = corridor.geometry.coordinates[0];
  const centroid = getCentroid(corridor.geometry);
  
  // For corridors, we want to create waypoints that follow the natural flow
  // Find the longest diagonal to determine main direction
  let maxDist = 0;
  let point1, point2;
  
  for (let i = 0; i < coords.length - 1; i++) {
    for (let j = i + 2; j < coords.length - 1; j++) {
      const dist = distance(coords[i], coords[j]);
      if (dist > maxDist) {
        maxDist = dist;
        point1 = coords[i];
        point2 = coords[j];
      }
    }
  }
  
  // Return waypoints that form a reasonable path through the corridor
  return [point1, centroid, point2].filter(Boolean);
}

/**
 * Find shared edges/connections between corridor polygons
 */
function findCorridorConnections(corridors) {
  const connections = [];
  const threshold = 5; // meters - closeness threshold for connection points
  
  for (let i = 0; i < corridors.length; i++) {
    for (let j = i + 1; j < corridors.length; j++) {
      const corridor1 = corridors[i];
      const corridor2 = corridors[j];
      
      // Get all points from both corridors
      const points1 = corridor1.geometry.coordinates[0];
      const points2 = corridor2.geometry.coordinates[0];
      
      // Find closest points between the two corridors
      let minDist = Infinity;
      let connectionPoint1, connectionPoint2;
      
      for (const p1 of points1) {
        for (const p2 of points2) {
          const dist = distance(p1, p2);
          if (dist < minDist) {
            minDist = dist;
            connectionPoint1 = p1;
            connectionPoint2 = p2;
          }
        }
      }
      
      // If corridors are close enough, create a connection
      if (minDist < threshold) {
        const midpoint = [
          (connectionPoint1[0] + connectionPoint2[0]) / 2,
          (connectionPoint1[1] + connectionPoint2[1]) / 2
        ];
        
        connections.push({
          from: i,
          to: j,
          point: midpoint,
          distance: minDist
        });
      }
    }
  }
  
  return connections;
}

/**
 * Find the best connection point in a corridor for a door
 */
function findBestCorridorConnection(doorCoord, corridor) {
  const corridorPoints = corridor.geometry.coordinates[0];
  let closestPoint = null;
  let minDistance = Infinity;
  
  // Check all edges of the corridor polygon to find the closest point
  for (let i = 0; i < corridorPoints.length - 1; i++) {
    const edge = [corridorPoints[i], corridorPoints[i + 1]];
    const closestOnEdge = getClosestPointOnSegment(doorCoord, edge[0], edge[1]);
    const dist = distance(doorCoord, closestOnEdge);
    
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = closestOnEdge;
    }
  }
  
  return { point: closestPoint, distance: minDistance };
}

/**
 * Check if a line segment intersects with any room polygon
 */
function lineIntersectsRooms(startPoint, endPoint, rooms) {
  const intersectingRooms = [];
  
  for (const room of rooms) {
    if (lineIntersectsPolygon(startPoint, endPoint, room.geometry)) {
      intersectingRooms.push(room.properties.name || room.properties.id);
    }
  }
  
  return intersectingRooms.length > 0 ? intersectingRooms : null;
}

/**
 * Check if a line segment intersects with a polygon
 */
function lineIntersectsPolygon(lineStart, lineEnd, polygon) {
  const coords = polygon.coordinates[0];
  
  // Check if line intersects any edge of the polygon
  for (let i = 0; i < coords.length - 1; i++) {
    const edgeStart = coords[i];
    const edgeEnd = coords[i + 1];
    
    if (lineSegmentsIntersect(lineStart, lineEnd, edgeStart, edgeEnd)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if two line segments intersect
 */
function lineSegmentsIntersect(p1, q1, p2, q2) {
  function orientation(p, q, r) {
    const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
    if (val === 0) return 0; // collinear
    return val > 0 ? 1 : 2; // clockwise or counterclockwise
  }
  
  function onSegment(p, q, r) {
    return q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
           q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1]);
  }
  
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  
  // General case
  if (o1 !== o2 && o3 !== o4) return true;
  
  // Special cases
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  
  return false;
}

/**
 * Find a safe path from door to corridor that doesn't go through rooms
 */
function findSafePathToCorridor(doorCoord, corridors, rooms) {
  let bestConnection = null;
  let shortestDistance = Infinity;
  
  for (const corridor of corridors) {
    for (const point of corridor.points) {
      const dist = distance(doorCoord, point);
      
      // Skip if too far
      if (dist > 50) continue;
      
      // Check if this connection avoids major room intersections
      const roomIntersections = lineIntersectsRooms(doorCoord, point, rooms);
      
      // Allow connections that only intersect the door's own room or are very short
      if (!roomIntersections || dist < 10 || roomIntersections.length <= 1) {
        if (dist < shortestDistance) {
          shortestDistance = dist;
          bestConnection = { corridor: point, distance: dist };
        }
      }
    }
  }
  
  // If no safe path found, use closest corridor point as fallback
  if (!bestConnection) {
    for (const corridor of corridors) {
      for (const point of corridor.points) {
        const dist = distance(doorCoord, point);
        if (dist < shortestDistance && dist < 50) {
          shortestDistance = dist;
          bestConnection = { corridor: point, distance: dist };
        }
      }
    }
  }
  
  return bestConnection;
}

async function generateReissRoutes() {
  console.log('🏗️  Generating indoor routes for Reiss Science Building...');
  
  // Read the Reiss GeoJSON
  const reissData = JSON.parse(fs.readFileSync('./reissG.geojson', 'utf8'));
  
  // Extract relevant features
  const corridors = reissData.features.filter(f => 
    f.properties?.tags?.indoor === 'corridor' || 
    f.properties?.indoor === 'corridor'
  );
  
  const doors = reissData.features.filter(f => 
    f.properties?.tags?.door === 'yes' || 
    f.properties?.door === 'yes'
  );
  
  const rooms = reissData.features.filter(f => 
    f.properties?.tags?.indoor === 'room' || 
    f.properties?.indoor === 'room'
  );
  
  console.log(`📊 Found: ${corridors.length} corridors, ${doors.length} doors, ${rooms.length} rooms`);
  
  const routes = [];
  
  // 1. Create a more realistic corridor network using edge points
  console.log('🛤️  Creating corridor network along walkable paths...');
  
  // For each corridor, get edge points that represent walkable areas
  const corridorWalkablePoints = corridors.map((corridor, index) => {
    const coords = corridor.geometry.coordinates[0];
    const centroid = getCentroid(corridor.geometry);
    
    // Get points along the corridor edges that are more realistic for walking
    const edgePoints = [];
    
    // Sample points along the corridor perimeter at regular intervals
    for (let i = 0; i < coords.length - 1; i++) {
      const start = coords[i];
      const end = coords[i + 1];
      const edgeLength = distance(start, end);
      
      // If edge is long enough, add intermediate points
      if (edgeLength > 8) { // More than 8 meters
        const numPoints = Math.floor(edgeLength / 8); // Every 8 meters
        for (let j = 1; j < numPoints; j++) {
          const ratio = j / numPoints;
          const point = [
            start[0] + ratio * (end[0] - start[0]),
            start[1] + ratio * (end[1] - start[1])
          ];
          edgePoints.push(point);
        }
      }
    }
    
    // Always include the centroid as a key waypoint
    edgePoints.push(centroid);
    
    return {
      index: index,
      corridor: corridor,
      points: edgePoints,
      centroid: centroid
    };
  });
  
  // Connect corridor points to create a realistic walking network
  corridorWalkablePoints.forEach((currentCorridor, i) => {
    corridorWalkablePoints.forEach((otherCorridor, j) => {
      if (i >= j) return; // Avoid duplicate connections
      
      // Find the closest points between the two corridors
      let closestDistance = Infinity;
      let bestConnection = null;
      
      currentCorridor.points.forEach(point1 => {
        otherCorridor.points.forEach(point2 => {
          const dist = distance(point1, point2);
          if (dist < closestDistance && dist < 25 && !lineIntersectsRooms(point1, point2, rooms)) {
            closestDistance = dist;
            bestConnection = { from: point1, to: point2 };
          }
        });
      });
      
      // If corridors are close enough, connect them
      if (bestConnection) {
        routes.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [bestConnection.from, bestConnection.to]
          },
          properties: {
            level: 0,
            type: "corridor",
            building: "reiss"
          }
        });
      }
    });
    
    // Connect points within the same corridor
    const points = currentCorridor.points;
    for (let k = 0; k < points.length - 1; k++) {
      const dist = distance(points[k], points[k + 1]);
      if (dist < 20 && dist > 2) { // Connect nearby points but not too close ones
        routes.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [points[k], points[k + 1]]
          },
          properties: {
            level: 0,
            type: "corridor",
            building: "reiss"
          }
        });
      }
    }
  });
  
  // 2. Connect doors to corridor edges avoiding room intersections
  console.log('🚪 Connecting doors to corridors (avoiding rooms)...');
  doors.forEach((door, doorIndex) => {
    const doorCoord = door.geometry.coordinates;
    
    // Find a safe path to corridor that doesn't go through rooms
    const safePath = findSafePathToCorridor(doorCoord, corridorWalkablePoints, rooms);
    
    if (safePath) {
      // Find which room this door belongs to
      let roomName = `door_${doorIndex + 1}`;
      
      for (const room of rooms) {
        if (room.properties?.name || room.properties?.tags?.name) {
          const roomCentroid = getCentroid(room.geometry);
          const distToRoom = distance(doorCoord, roomCentroid);
          if (distToRoom < 15) { // Within 15 meters
            roomName = room.properties?.name || room.properties?.tags?.name;
            break;
          }
        }
      }
      
      routes.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [doorCoord, safePath.corridor]
        },
        properties: {
          level: 0,
          type: "room_connection",
          room: roomName,
          building: "reiss"
        }
      });
    } else {
      // Find room name for warning
      let roomName = `door_${doorIndex + 1}`;
      for (const room of rooms) {
        if (room.properties?.name || room.properties?.tags?.name) {
          const roomCentroid = getCentroid(room.geometry);
          const distToRoom = distance(doorCoord, roomCentroid);
          if (distToRoom < 15) {
            roomName = room.properties?.name || room.properties?.tags?.name;
            break;
          }
        }
      }
      console.warn(`⚠️  Could not find safe path for door ${doorIndex + 1} (room: ${roomName})`);
    }
  });
  
  console.log(`✅ Generated ${routes.length} indoor routes for Reiss`);
  
  // Read existing building data
  const buildingData = JSON.parse(fs.readFileSync('./app/mock/building.json', 'utf8'));
  
  // Remove any existing Reiss routes to prevent duplicates
  const existingRoutes = buildingData.indoor_routes.features;
  const nonReissRoutes = existingRoutes.filter(route => 
    route.properties?.building !== 'reiss'
  );
  
  console.log(`🧹 Removed ${existingRoutes.length - nonReissRoutes.length} existing Reiss routes`);
  
  // Add new Reiss routes to the filtered routes
  const allRoutes = [...nonReissRoutes, ...routes];
  
  buildingData.indoor_routes.features = allRoutes;
  
  // Write back to building.json
  fs.writeFileSync('./app/mock/building.json', JSON.stringify(buildingData, null, 2));
  
  console.log(`🎉 Successfully added ${routes.length} Reiss routes to building.json`);
  console.log(`📈 Total indoor routes: ${allRoutes.length}`);
  
  // Show sample routes for verification
  console.log('\n🔍 Sample generated routes:');
  routes.slice(0, 5).forEach((route, i) => {
    const coords = route.geometry.coordinates;
    console.log(`  ${i+1}. ${route.properties.type}: [${coords[0][0].toFixed(6)}, ${coords[0][1].toFixed(6)}] → [${coords[1][0].toFixed(6)}, ${coords[1][1].toFixed(6)}]`);
    if (route.properties.room) {
      console.log(`     Room: ${route.properties.room}`);
    }
  });
}

// Run the script
generateReissRoutes().catch(console.error);
