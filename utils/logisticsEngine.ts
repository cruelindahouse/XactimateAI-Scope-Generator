
import { RoomData, LineItem, ActivityCode } from '../types';

/**
 * Helper to create standard logistics items
 */
const createLogisticsItem = (cat: string, sel: string, desc: string, qty: number, unit: string): LineItem => {
  return {
    id: crypto.randomUUID(),
    category: cat,
    selector: sel,
    code: `${cat} ${sel}`,
    description: desc,
    activity: '+',
    quantity: qty,
    quantity_inference: 'Auto-Calculated',
    unit: unit,
    reasoning: 'Logistics Engine Rule: Calculated based on scope volume/complexity.',
    confidence: 'High'
  };
};

/**
 * Deterministically adds General Conditions based on Smart Thresholds.
 * 
 * Rules:
 * 1. Debris: >500 units = Dumpster; <500 units = Pickup Truck.
 * 2. Toilet: Fire Loss OR Severity >= 9 only.
 * 3. Supervision: 4 hours per unique trade if > 2 trades exist.
 */
export const enrichScopeWithLogistics = (
  rooms: RoomData[], 
  severity: number, 
  context: string = 'Interior',
  lossType: string = 'Water' // Added Loss Type for habitability check
): RoomData[] => {
  const newRooms = [...rooms];
  
  // 1. Find or Create "General Conditions" Room
  let generalRoomIndex = newRooms.findIndex(r => 
    r.name.toUpperCase().includes('GENERAL') || 
    r.name.toUpperCase().includes('LOGISTICS')
  );
  
  let generalRoom: RoomData;

  if (generalRoomIndex === -1) {
    generalRoom = {
      id: crypto.randomUUID(),
      name: 'General Conditions',
      narrative_synthesis: 'Logistics and project management items inferred from scope severity and complexity.',
      flagged_issues: [],
      items: []
    };
    // Add to the beginning of the list
    newRooms.unshift(generalRoom);
  } else {
    generalRoom = newRooms[generalRoomIndex];
  }

  const existingCodes = new Set(generalRoom.items.map(i => i.code));
  const newItems: LineItem[] = [];

  // --- LOGIC RULES ---

  // RULE 1: DEBRIS REMOVAL (The "Volume" Rule)
  let totalDemoQty = 0;
  rooms.forEach(r => {
    r.items.forEach(i => {
      // Count item if activity is REMOVE ('-') OR category is DMO
      // Note: ActivityCode.REMOVE is '-', checking strictly
      if (i.activity === '-' || i.activity === ActivityCode.REMOVE || i.category === 'DMO' || i.category === 'DMG') {
        totalDemoQty += (i.quantity || 0);
      }
    });
  });

  if (totalDemoQty > 500) {
    // Significant Demo -> 30 Yard Dumpster
    if (!existingCodes.has('DMO DTRLR')) {
       newItems.push(createLogisticsItem(
        'DMO', 
        'DTRLR', 
        'Dumpster load - approx. 30 yards, inc. dump fees', 
        1, 
        'EA'
      ));
    }
  } else if (totalDemoQty > 0) {
    // Minor Demo -> Pickup/Trailer Load
    if (!existingCodes.has('DMO DBR')) {
      // Calculate loads: 1 load per 100 units approx, min 1
      const loads = Math.max(1, Math.ceil(totalDemoQty / 150));
      newItems.push(createLogisticsItem(
        'DMO', 
        'DBR', 
        'Debris Removal - pickup or trailer load', 
        loads, 
        'EA'
      ));
    }
  }

  // RULE 2: PORTABLE TOILET (The "Habitability" Rule)
  // Only for FIRE (uninhabitable) OR Catastrophic loss (Severity >= 9)
  const isFire = lossType.toLowerCase().includes('fire') || lossType.toLowerCase().includes('smoke');
  const isCatastrophic = severity >= 9;

  if ((isFire || isCatastrophic) && !existingCodes.has('TMP TLT')) {
    newItems.push(createLogisticsItem(
      'TMP', 
      'TLT', 
      'Portable toilet rental - per month', 
      1, 
      'MO'
    ));
  }

  // RULE 3: SUPERVISION (The "Complexity" Rule)
  // Calculate unique trades
  const uniqueCats = new Set<string>();
  rooms.forEach(r => r.items.forEach(i => {
    // Exclude General cats from complexity count to avoid double dipping
    if (!['DMO', 'CLN', 'TMP', 'LAB'].includes(i.category)) {
      uniqueCats.add(i.category);
    }
  }));
  
  if (uniqueCats.size > 2 && !existingCodes.has('LAB SUP')) {
    // Formula: 4 hours per unique trade involved
    const hours = uniqueCats.size * 4;
    newItems.push(createLogisticsItem(
      'LAB', 
      'SUP', 
      `Residential Supervision / Project Management (${uniqueCats.size} trades)`, 
      hours, 
      'HR'
    ));
  }

  // Rule 4: Temporary Fencing (Exterior + High Severity)
  if (context === 'Exterior' && severity > 7 && !existingCodes.has('TMP FNC')) {
     newItems.push(createLogisticsItem(
      'TMP', 
      'FNC', 
      'Temporary fencing - chain link - rent per month', 
      100, // arbitrary start
      'LF'
    ));
  }

  // Update the room items
  generalRoom.items = [...generalRoom.items, ...newItems];
  
  return newRooms;
};
