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
 * LOGISTICS ENGINE v13 (PRODUCTION READY)
 * Deterministically adds General Conditions based on Smart Thresholds.
 * * Rules:
 * 1. Debris: Volume based (Dumpster vs Pickup).
 * 2. Toilet: Fire Loss OR Severity >= 9 only.
 * 3. Supervision: Complexity based (>2 trades).
 * 4. Fencing: Exterior + High Severity.
 * 5. Containment: Demolition OR High Severity OR Mold.
 * 6. Equipment Setup: If drying equipment is present.
 * 7. Emergency Service: If mitigation job.
 * 8. Floor Protection: If demo/extraction (Scorched Earth).
 * 9. Content Manipulation: If mitigation + clutter detected (>3 items/room).
 * 10. Implicit Demolition: If installing materials, assume removal of old.
 */
export const enrichScopeWithLogistics = (
  rooms: RoomData[], 
  severity: number, 
  context: string = 'Interior',
  lossType: string = 'Water',
  jobType: string = 'R' 
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

  // --- DATA GATHERING ---
  let totalDemoQty = 0;
  let implicitDemoQty = 0; // RULE 10: Implicit demo from install items
  const isMitigationJob = jobType === 'E' || rooms.some(r => r.items.some(i => i.category === 'WTR'));
  let roomsWithContents = 0;

  rooms.forEach(r => {
    r.items.forEach(i => {
      // Rule 1 Data: Explicit Demo Volume
      if (i.activity === '-' || i.activity === ActivityCode.REMOVE || i.category === 'DMO' || i.category === 'DMG') {
        totalDemoQty += (i.quantity || 0);
      }
      
      // RULE 10 Data: Implicit Demo (Install implies prior removal)
      // Flooring install implies flooring removal
      if (['FCW', 'FCV', 'FCC', 'FCT'].includes(i.category) && i.activity === '+') {
        implicitDemoQty += (i.quantity || 0);
      }
      // Drywall install implies drywall removal  
      if (i.category === 'DRY' && i.activity === '+') {
        implicitDemoQty += (i.quantity || 0);
      }
      // Cabinet install implies cabinet removal
      if (i.category === 'CAB' && i.activity === '+') {
        implicitDemoQty += 20; // ~20 SF per cabinet unit
      }
    });

    // Rule 9 Data: Contents Check (Ignore General Conditions)
    // If a room has >3 items, we assume we had to move stuff to do the work.
    if (!r.name.toUpperCase().includes('GENERAL') && r.items.length >= 3) {
        roomsWithContents++;
    }
  });

  // RULE 10: Add implicit demo to total for downstream rules
  totalDemoQty += implicitDemoQty;

  // --- LOGIC RULES ---

  // RULE 1: DEBRIS REMOVAL
  if (totalDemoQty > 500) {
    if (!existingCodes.has('DMO DTRLR')) {
       newItems.push(createLogisticsItem('DMO', 'DTRLR', 'Dumpster load - approx. 30 yards, inc. dump fees', 1, 'EA'));
    }
  } else if (totalDemoQty > 0) {
    if (!existingCodes.has('DMO DBR')) {
      const loads = Math.max(1, Math.ceil(totalDemoQty / 150));
      newItems.push(createLogisticsItem('DMO', 'DBR', 'Debris Removal - pickup or trailer load', loads, 'EA'));
    }
  }

  // RULE 2: PORTABLE TOILET
  const isFire = lossType.toLowerCase().includes('fire') || lossType.toLowerCase().includes('smoke');
  const isCatastrophic = severity >= 9;
  if ((isFire || isCatastrophic) && !existingCodes.has('TMP TLT')) {
    newItems.push(createLogisticsItem('TMP', 'TLT', 'Portable toilet rental - per month', 1, 'MO'));
  }

  // RULE 3: SUPERVISION
  const uniqueCats = new Set<string>();
  rooms.forEach(r => r.items.forEach(i => {
    if (!['DMO', 'CLN', 'TMP', 'LAB', 'WTR'].includes(i.category)) {
      uniqueCats.add(i.category);
    }
  }));
  if (uniqueCats.size > 2 && !existingCodes.has('LAB SUP')) {
    const hours = uniqueCats.size * 4;
    newItems.push(createLogisticsItem('LAB', 'SUP', `Residential Supervision (${uniqueCats.size} trades)`, hours, 'HR'));
  }

  // RULE 4: TEMPORARY FENCING
  if (context === 'Exterior' && severity > 7 && !existingCodes.has('TMP FNC')) {
     newItems.push(createLogisticsItem('TMP', 'FNC', 'Temporary fencing - chain link', 100, 'LF'));
  }

  // RULE 5: CONTAINMENT & NEGATIVE AIR
  const needsContainment = totalDemoQty > 0 || severity >= 5 || lossType.toLowerCase().includes('mold') || lossType.toLowerCase().includes('sewage');
  if (needsContainment) {
    if (!existingCodes.has('WTR BARR')) {
       newItems.push(createLogisticsItem('WTR', 'BARR', 'Containment Barrier - plastic', 150, 'SF'));
    }
    if (!existingCodes.has('WTR NAFAN')) {
       newItems.push(createLogisticsItem('WTR', 'NAFAN', 'Negative air fan/scrubber', 3, 'EA'));
    }
  }

  // RULE 6: EQUIPMENT SETUP
  const hasEquipment = rooms.some(r => r.items.some(i => i.category === 'WTR' && ['DHU', 'DRY', 'DHM', 'AFAN'].includes(i.selector.replace(/[^A-Z]/g, ''))));
  if (hasEquipment && !existingCodes.has('WTR EQ')) {
    const roomsWithEquip = rooms.filter(r => r.items.some(i => i.category === 'WTR' && ['DHU', 'DRY', 'DHM', 'AFAN'].includes(i.selector.replace(/[^A-Z]/g, '')))).length;
    const equipHours = Math.max(2, 2 + (roomsWithEquip * 0.5));
    newItems.push(createLogisticsItem('WTR', 'EQ', 'Equipment setup, take down, and monitoring', equipHours, 'HR'));
  }

  // RULE 7: EMERGENCY SERVICE CALL
  if (jobType === 'E' && !existingCodes.has('WTR ESRVD')) {
      newItems.push(createLogisticsItem('WTR', 'ESRVD', 'Emergency service call - during business hours', 1, 'EA'));
  }

  // RULE 8: FLOOR PROTECTION (Scorched Earth)
  // Now also triggers on implicit demo from reconstruction
  const workPerformed = totalDemoQty > 0 || isMitigationJob;
  if (workPerformed && !existingCodes.has('DMO MASKFL')) {
      newItems.push(createLogisticsItem('DMO', 'MASKFL', 'Masking - floor - per square foot (Walkway)', 150, 'SF'));
  }

  // RULE 9: CONTENT MANIPULATION (The "Missing Link")
  // Logic: If mitigation job AND rooms have significant items (>3), assume we moved stuff.
  // Also trigger for reconstruction jobs with significant work
  const needsContentMove = (isMitigationJob || implicitDemoQty > 100) && roomsWithContents > 0;
  if (needsContentMove && !existingCodes.has('CON ROOM')) {
      newItems.push(createLogisticsItem(
        'CON', 
        'ROOM', 
        'Content Manipulation - Average Room (Move & Reset)', 
        roomsWithContents, 
        'EA'
      ));
  }

  // Update the room items
  generalRoom.items = [...generalRoom.items, ...newItems];
  
  return newRooms;
};