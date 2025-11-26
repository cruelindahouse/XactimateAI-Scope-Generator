/**
 * Room Sanitizer - Anti-Hallucination & Deduplication Engine
 * 
 * Purpose: Detect and merge duplicate rooms caused by camera cuts,
 * Matterport jumps, or AI misinterpretation of video frames.
 * 
 * Strategy: "Trust but Verify" - Keep AI detection, fix obvious duplicates
 * 
 * DO NOT MODIFY logisticsEngine.ts - this runs BEFORE logistics
 */

import { RoomData, LineItem } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SIMILARITY_THRESHOLD = 0.75; // 75% item overlap = likely duplicate
const MAX_MERGE_PASSES = 5;        // Safety limit for iterative merging

// Room type patterns for fuzzy matching
const ROOM_TYPE_PATTERNS: Record<string, RegExp> = {
  bathroom: /bath(room)?|powder|restroom|wc|lavatory|half\s*bath/i,
  bedroom: /bed(room)?|master|guest\s*room|nursery/i,
  kitchen: /kitchen|kitchenette/i,
  living: /living|family|great\s*room|den|lounge/i,
  laundry: /laundry|utility|mud\s*room/i,
  hallway: /hall(way)?|corridor|passage|foyer|entry/i,
  garage: /garage|carport/i,
  basement: /basement|cellar|lower\s*level/i,
  office: /office|study|home\s*office|workspace/i,
  dining: /dining|breakfast\s*nook/i,
  closet: /closet|storage|pantry|wardrobe/i,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract room type from name (e.g., "Bathroom 2" -> "bathroom")
 */
const extractRoomType = (name: string): string => {
  const normalized = name.toLowerCase().trim();
  
  for (const [type, pattern] of Object.entries(ROOM_TYPE_PATTERNS)) {
    if (pattern.test(normalized)) {
      return type;
    }
  }
  
  // Fallback: use first word (strips numbers)
  return normalized.split(/[\s\d]+/)[0] || 'unknown';
};

/**
 * Extract room number from name (e.g., "Bathroom 2" -> 2)
 */
const extractRoomNumber = (name: string): number => {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0]) : 999;
};

/**
 * Generate normalized item signature for comparison
 * Format: "CAT:SEL:QTY_BUCKET" sorted alphabetically
 * 
 * Quantity buckets prevent false negatives from minor qty differences
 */
const generateItemSignature = (items: LineItem[]): string[] => {
  return items.map(item => {
    // Bucket quantities to allow for minor estimation differences
    // S: 0-10, M: 11-50, L: 51-100, XL: 101-500, XXL: 500+
    const qtyBucket = item.quantity <= 10 ? 'S' :
                      item.quantity <= 50 ? 'M' :
                      item.quantity <= 100 ? 'L' :
                      item.quantity <= 500 ? 'XL' : 'XXL';
    
    // Normalize selector (remove trailing symbols)
    const cleanSelector = item.selector.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    return `${item.category}:${cleanSelector}:${qtyBucket}`;
  }).sort();
};

/**
 * Calculate Jaccard similarity coefficient between two item sets
 * Returns 0-1 (0 = no overlap, 1 = identical)
 */
const calculateJaccardSimilarity = (items1: LineItem[], items2: LineItem[]): number => {
  // Both empty = consider them the same (inspected, no damage)
  if (items1.length === 0 && items2.length === 0) return 1;
  
  // One empty, one not = definitely different
  if (items1.length === 0 || items2.length === 0) return 0;
  
  const sig1 = new Set(generateItemSignature(items1));
  const sig2 = new Set(generateItemSignature(items2));
  
  // Jaccard: |intersection| / |union|
  const intersection = new Set([...sig1].filter(x => sig2.has(x)));
  const union = new Set([...sig1, ...sig2]);
  
  return intersection.size / union.size;
};

/**
 * Check if two rooms are likely duplicates (ghost rooms)
 */
const areLikelyDuplicates = (room1: RoomData, room2: RoomData): boolean => {
  // RULE 1: Must be same room TYPE (bathroom vs bathroom, not bathroom vs bedroom)
  const type1 = extractRoomType(room1.name);
  const type2 = extractRoomType(room2.name);
  
  if (type1 !== type2) return false;
  
  // RULE 2: Never merge "General Conditions" or "Logistics" rooms
  if (type1 === 'unknown') {
    const isGeneral = (name: string) => 
      name.toLowerCase().includes('general') || 
      name.toLowerCase().includes('logistics') ||
      name.toLowerCase().includes('condition');
    
    if (isGeneral(room1.name) || isGeneral(room2.name)) {
      return false;
    }
  }
  
  // RULE 3: Check item similarity using Jaccard coefficient
  const similarity = calculateJaccardSimilarity(room1.items, room2.items);
  
  return similarity >= SIMILARITY_THRESHOLD;
};

/**
 * Merge two duplicate rooms into one
 * Strategy: Keep lower-numbered name, maximum quantities
 */
const mergeRooms = (room1: RoomData, room2: RoomData): RoomData => {
  // Use the lower-numbered room name (Bathroom 2 beats Bathroom 3)
  const num1 = extractRoomNumber(room1.name);
  const num2 = extractRoomNumber(room2.name);
  
  const primaryRoom = num1 <= num2 ? room1 : room2;
  const secondaryRoom = primaryRoom === room1 ? room2 : room1;
  
  // Merge items: combine unique items, keep maximum quantity for duplicates
  const itemMap = new Map<string, LineItem>();
  
  const allItems = [...primaryRoom.items, ...secondaryRoom.items];
  
  allItems.forEach(item => {
    const key = `${item.category}:${item.selector}`;
    const existing = itemMap.get(key);
    
    if (!existing) {
      // New item - add with fresh ID
      itemMap.set(key, { ...item, id: crypto.randomUUID() });
    } else if (item.quantity > existing.quantity) {
      // Duplicate with higher quantity - keep the higher one
      itemMap.set(key, { ...item, id: existing.id });
    }
    // If duplicate with lower quantity, keep existing (do nothing)
  });
  
  // Combine narratives (dedupe if identical)
  const narratives = [primaryRoom.narrative_synthesis, secondaryRoom.narrative_synthesis]
    .filter((n, i, arr) => n && n.trim() && arr.indexOf(n) === i);
  
  // Combine flagged issues
  const flags = [...new Set([
    ...primaryRoom.flagged_issues, 
    ...secondaryRoom.flagged_issues
  ])];
  
  return {
    id: primaryRoom.id,
    name: primaryRoom.name,
    timestamp_in: primaryRoom.timestamp_in || secondaryRoom.timestamp_in,
    timestamp_out: primaryRoom.timestamp_out || secondaryRoom.timestamp_out,
    narrative_synthesis: narratives.join(' ').slice(0, 250), // Cap length
    flagged_issues: flags,
    items: Array.from(itemMap.values())
  };
};

// ============================================================================
// DETECTION & WARNINGS
// ============================================================================

/**
 * Detect suspicious patterns that indicate hallucination
 */
const detectHallucinationPatterns = (rooms: RoomData[]): string[] => {
  const warnings: string[] = [];
  
  // PATTERN 1: Too many of same room type (residential usually has 1-3 bathrooms)
  const roomsByType = new Map<string, RoomData[]>();
  rooms.forEach(r => {
    const type = extractRoomType(r.name);
    if (!roomsByType.has(type)) roomsByType.set(type, []);
    roomsByType.get(type)!.push(r);
  });
  
  // Flag suspicious counts
  const typeThresholds: Record<string, number> = {
    bathroom: 3,
    kitchen: 2,
    laundry: 2,
    garage: 2,
  };
  
  roomsByType.forEach((typeRooms, type) => {
    const threshold = typeThresholds[type];
    if (threshold && typeRooms.length > threshold) {
      warnings.push(
        `⚠️ ${typeRooms.length} ${type}s detected - verify video shows multiple ${type}s`
      );
    }
  });
  
  // PATTERN 2: High similarity between rooms of same type
  roomsByType.forEach((typeRooms, type) => {
    if (typeRooms.length > 1) {
      for (let i = 0; i < typeRooms.length; i++) {
        for (let j = i + 1; j < typeRooms.length; j++) {
          const sim = calculateJaccardSimilarity(typeRooms[i].items, typeRooms[j].items);
          if (sim > 0.6 && sim < SIMILARITY_THRESHOLD) {
            // Similar but not quite duplicate - flag for manual review
            warnings.push(
              `⚠️ "${typeRooms[i].name}" and "${typeRooms[j].name}" are ${Math.round(sim * 100)}% similar - verify they are different rooms`
            );
          }
        }
      }
    }
  });
  
  // PATTERN 3: Empty rooms (inspected but no damage) - INFO only, not warning
  const emptyRooms = rooms.filter(r => 
    r.items.length === 0 && 
    !r.name.toLowerCase().includes('general')
  );
  
  if (emptyRooms.length > 0) {
    // Mark empty rooms as "Inspected - No Visible Damage"
    emptyRooms.forEach(r => {
      if (!r.narrative_synthesis?.includes('No Visible Damage')) {
        r.narrative_synthesis = 'Inspected - No Visible Damage. ' + (r.narrative_synthesis || '');
      }
    });
    warnings.push(
      `ℹ️ ${emptyRooms.length} room(s) inspected with no damage: ${emptyRooms.map(r => r.name).join(', ')}`
    );
  }
  
  return warnings;
};

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Sanitize and deduplicate rooms
 * 
 * @param rooms - Raw rooms from AI parsing
 * @returns Sanitized rooms + diagnostic warnings + merge count
 */
export const sanitizeRooms = (rooms: RoomData[]): { 
  rooms: RoomData[], 
  warnings: string[],
  mergeCount: number 
} => {
  if (!rooms || rooms.length === 0) {
    return { rooms: [], warnings: [], mergeCount: 0 };
  }
  
  // Step 1: Detect patterns BEFORE merging (for diagnostics)
  const warnings = detectHallucinationPatterns(rooms);
  
  // Step 2: Separate "General Conditions" - NEVER merge this room
  const generalRoom = rooms.find(r => 
    r.name.toLowerCase().includes('general') || 
    r.name.toLowerCase().includes('logistics')
  );
  const workingRooms = rooms.filter(r => r !== generalRoom);
  
  // Step 3: Iterative merge pass
  let mergeCount = 0;
  let mergedRooms: RoomData[] = [...workingRooms];
  let didMerge = true;
  let passes = 0;
  
  // Keep merging until no more duplicates found (with safety limit)
  while (didMerge && passes < MAX_MERGE_PASSES) {
    didMerge = false;
    passes++;
    
    const newMerged: RoomData[] = [];
    const consumed = new Set<string>();
    
    for (let i = 0; i < mergedRooms.length; i++) {
      if (consumed.has(mergedRooms[i].id)) continue;
      
      let current = mergedRooms[i];
      
      for (let j = i + 1; j < mergedRooms.length; j++) {
        if (consumed.has(mergedRooms[j].id)) continue;
        
        if (areLikelyDuplicates(current, mergedRooms[j])) {
          // Found duplicate - merge them
          const similarity = calculateJaccardSimilarity(current.items, mergedRooms[j].items);
          
          warnings.push(
            `🔀 Merged "${mergedRooms[i].name}" + "${mergedRooms[j].name}" (${Math.round(similarity * 100)}% similar) → "${current.name}"`
          );
          
          current = mergeRooms(current, mergedRooms[j]);
          consumed.add(mergedRooms[j].id);
          didMerge = true;
          mergeCount++;
        }
      }
      
      consumed.add(mergedRooms[i].id);
      newMerged.push(current);
    }
    
    mergedRooms = newMerged;
  }
  
  // Step 4: Reassemble with General Conditions FIRST
  const finalRooms = generalRoom 
    ? [generalRoom, ...mergedRooms]
    : mergedRooms;
  
  // Step 5: Add summary if merges occurred
  if (mergeCount > 0) {
    warnings.unshift(`✅ Deduplication complete: ${mergeCount} ghost room(s) merged`);
  }
  
  return {
    rooms: finalRooms,
    warnings,
    mergeCount
  };
};

/**
 * OPTIONAL: Calculate room "reality score" (confidence it's a real room)
 * Returns 0-100
 */
export const calculateRoomConfidence = (room: RoomData): number => {
  let score = 100;
  
  // Penalty: Too many items for a single room (>20 is suspicious)
  if (room.items.length > 20) {
    score -= Math.min(30, (room.items.length - 20) * 2);
  }
  
  // Penalty: Contradictory flooring types (carpet AND vinyl in same room)
  const flooringItems = room.items.filter(i => 
    ['FCC', 'FCV', 'FCW', 'FCT'].includes(i.category) ||
    (i.category === 'WTR' && /^(FCC|FCV|FCW|FCT)/.test(i.selector))
  );
  const uniqueFlooring = new Set(
    flooringItems.map(i => i.selector.replace(/[^A-Z]/gi, '').slice(0, 3))
  );
  if (uniqueFlooring.size > 1) {
    score -= 20;
  }
  
  // Bonus: Has timestamp (video evidence)
  if (room.timestamp_in && room.timestamp_in !== '00:00') {
    score += 5;
  }
  
  // Bonus: Has narrative
  if (room.narrative_synthesis && room.narrative_synthesis.length > 20) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, score));
};
