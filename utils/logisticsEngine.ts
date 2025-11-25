
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
 * * Rules:
 * 1. Debris: >500 units = Dumpster; <500 units = Pickup Truck.
 * 2. Toilet: Fire Loss OR Severity >= 9 only.
 * 3. Supervision: 4 hours per unique trade if > 2 trades exist.
 * 4. Fencing: Exterior + High Severity.
 * 5. Containment: Demolition OR High Severity OR Mold = Barrier + Negative Air.
 * 6. Equipment Setup: If drying equipment is present.
 * 7. Emergency Service: If mitigation job.
 */
export const enrichScopeWithLogistics = (
  rooms: RoomData[], 
  severity: number, 
  context: string = 'Interior',
  lossType: string = 'Water',
  jobType: string = 'R' // Added Job Type for emergency service logic
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
  const uniqueCats = new Set<string>();
  rooms.forEach(r => r.items.forEach(i => {
    if (!['DMO', 'CLN', 'TMP', 'LAB', 'WTR'].includes(i.category)) {
      uniqueCats.add(i.category);
    }
  }));
  
  if (uniqueCats.size > 2 && !existingCodes.has('LAB SUP')) {
    const hours = uniqueCats.size * 4;
    newItems.push(createLogisticsItem(
      'LAB', 
      'SUP', 
      `Residential Supervision / Project Management (${uniqueCats.size} trades)`, 
      hours, 
      'HR'
    ));
  }

  // RULE 4: TEMPORARY FENCING
  if (context === 'Exterior' && severity > 7 && !existingCodes.has('TMP FNC')) {
     newItems.push(createLogisticsItem(
      'TMP', 
      'FNC', 
      'Temporary fencing - chain link - rent per month', 
      100, 
      'LF'
    ));
  }

  // RULE 5: CONTAINMENT & NEGATIVE AIR (The "Profit Gap" Fix)
  // Trigger: If ANY demolition occurred OR Severity >= 5 OR Mold/Sewage detected.
  const needsContainment = totalDemoQty > 0 || severity >= 5 || lossType.toLowerCase().includes('mold') || lossType.toLowerCase().includes('sewage');

  if (needsContainment) {
    // 5.1 Add Barrier
    if (!existingCodes.has('WTR BARR')) {
       newItems.push(createLogisticsItem(
        'WTR', 
        'BARR', 
        'Containment Barrier - plastic - polyethylene', 
        150, // Standard allowance
        'SF'
      ));
    }

    // 5.2 Add Negative Air Fan (Mandatory with Barrier)
    if (!existingCodes.has('WTR NAFAN')) {
       newItems.push(createLogisticsItem(
        'WTR', 
        'NAFAN', 
        'Negative air fan/scrubber (24 hr period) - No monitoring', 
        3, // Standard 3 days
        'EA'
      ));
    }
  }

  // RULE 6: WTR EQ - Equipment Setup (DETERMINISTIC)
  const hasEquipment = rooms.some(r => 
    r.items.some(i => 
      i.category === 'WTR' && ['DHU', 'DRY', 'DHM', 'AFAN'].includes(i.selector.replace(/[^A-Z]/g, ''))
    )
  );

  if (hasEquipment && !existingCodes.has('WTR EQ')) {
    const roomsWithEquip = rooms.filter(r => 
      r.items.some(i => i.category === 'WTR' && ['DHU', 'DRY', 'DHM', 'AFAN'].includes(i.selector.replace(/[^A-Z]/g, '')))
    ).length;
    const equipHours = Math.max(2, 2 + (roomsWithEquip * 0.5));
    
    newItems.push(createLogisticsItem(
      'WTR', 
      'EQ', 
      'Equipment setup, take down, and monitoring (hourly charge)', 
      equipHours, 
      'HR'
    ));
  }

  // RULE 7: WTR ESRVD - Emergency Service Call
  // Trigger: If Job Type is 'E' (Emergency) OR WTR items present
  const isMitigationJob = jobType === 'E' || rooms.some(r => r.items.some(i => i.category === 'WTR'));
  
  if (isMitigationJob && !existingCodes.has('WTR ESRVD')) {
      newItems.push(createLogisticsItem(
      'WTR', 
      'ESRVD', 
      'Emergency service call - during business hours', 
      1, 
      'EA'
    ));
  }

  // Update the room items
  generalRoom.items = [...generalRoom.items, ...newItems];
  
  return newRooms;
};
