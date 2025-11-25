
interface Room {
  name: string;
  squareFootage: number;
  damage: {
    drywall: boolean;
    flooring: boolean;
  };
}

interface EmergencyConfig {
  severity: 1 | 2 | 3 | 4 | 5;
  affectedArea: number;
}

interface Item {
  category: string;
  selector: string;
  code: string;
  description: string;
  activity: '+' | '-';
  quantity: number;
  unit: string;
  reasoning: string;
}

export class EmergencyGenerator {
  
  /**
   * Generate emergency mitigation scope for Type E jobs
   * FOCUS: Water extraction, drying equipment, containment
   */
  generate(rooms: Room[], config: EmergencyConfig): Item[] {
    const items: Item[] = [];
    
    // Calculate total affected area
    const totalSF = rooms.reduce((sum, r) => sum + r.squareFootage, 0);
    const severity = config.severity;
    
    // Calculate anticipated Drywall Demo (Estimate 30% of affected area)
    // We calculate this upfront to determine if containment is needed
    const wetDrywallSF = Math.ceil(totalSF * 0.3);

    // 1. PROTECTION & CONTAINMENT (Updated Rules)
    items.push(...this.generateProtectionAndContainment(wetDrywallSF));
    
    // 2. EQUIPMENT RENTAL (per 24-hour period)
    items.push(...this.generateEquipment(totalSF, severity));
    
    // 3. WATER EXTRACTION & TREATMENT
    items.push(...this.generateExtraction(totalSF));
    
    // 4. EMERGENCY DEMOLITION
    items.push(...this.generateEmergencyDemo(wetDrywallSF));
    
    // 5. EQUIPMENT SETUP
    items.push(...this.generateSetup());
    
    return items;
  }

  private generateProtectionAndContainment(wetDrywallSF: number): Item[] {
    const items: Item[] = [];

    // RULE: ALWAYS include DMO MASKFL (Floor protection) for the walkway
    // Estimated 3ft wide path x 40ft entry/exit = 120 SF
    items.push({
      category: 'DMO',
      selector: 'MASKFL',
      code: 'DMO MASKFL',
      description: 'Masking - floor - per square foot (Walkway protection)',
      activity: '+',
      quantity: 120, 
      unit: 'SF',
      reasoning: 'Mandatory walkway protection to affected area'
    });

    // RULE: ALWAYS include DMO BARR (Containment) if drywall is being demolished
    if (wetDrywallSF > 0) {
      items.push({
        category: 'DMO',
        selector: 'BARR',
        code: 'DMO BARR',
        description: 'Containment Barrier - plastic - polyethylene',
        activity: '+',
        quantity: 160, // Standard barrier/chamber allowance
        unit: 'SF',
        reasoning: 'Containment required due to drywall demolition'
      });

      // Good practice: If building containment, likely need HEPA monitoring
      items.push({
        category: 'WTR',
        selector: 'HEPAVAC',
        code: 'WTR HEPAVAC',
        description: 'HEPA Vacuuming - hourly charge',
        activity: '+',
        quantity: 1,
        unit: 'HR',
        reasoning: 'Air quality control during demo'
      });
    }

    return items;
  }
  
  private generateEquipment(totalSF: number, severity: number): Item[] {
    // Calculate equipment needs
    // Standard rule: 1 air mover per 10-16 linear feet of wall, usually approx 1 per 100 SF floor
    const airMovers = Math.max(1, Math.ceil(totalSF / 100)); 
    // Standard rule: 1 large dehu per 800-1000 cubic feet, approx 1 per 300 SF floor for simplicity in estimation
    const dehumidifiers = Math.max(1, Math.ceil(totalSF / 300)); 
    const dryingDays = severity >= 3 ? 3 : 2;
    
    return [
      {
        category: 'WTR',
        selector: 'DRY',
        code: 'WTR DRY',
        description: 'Air mover (per 24 hour period) - No monitoring',
        activity: '+',
        quantity: airMovers * dryingDays,
        unit: 'EA',
        reasoning: `${airMovers} units × ${dryingDays} days for drying`
      },
      {
        category: 'WTR',
        selector: 'DHM>',
        code: 'WTR DHM>',
        description: 'Dehumidifier (per 24 hr period) - 70-109 pints',
        activity: '+',
        quantity: dehumidifiers * dryingDays,
        unit: 'EA',
        reasoning: `${dehumidifiers} units × ${dryingDays} days for drying`
      }
    ];
  }
  
  private generateExtraction(totalSF: number): Item[] {
    return [
      {
        category: 'WTR',
        selector: 'EXTW',
        code: 'WTR EXTW',
        description: 'Water extraction from carpet',
        activity: '+',
        quantity: totalSF,
        unit: 'SF',
        reasoning: 'Remove standing water'
      },
      {
        category: 'WTR',
        selector: 'GRMIC',
        code: 'WTR GRMIC',
        description: 'Apply plant-based anti-microbial agent',
        activity: '+',
        quantity: totalSF,
        unit: 'SF',
        reasoning: 'Prevent mold growth'
      }
    ];
  }
  
  private generateEmergencyDemo(wetDrywallSF: number): Item[] {
    // Uses the pre-calculated wet drywall square footage
    
    if (wetDrywallSF <= 0) return [];

    return [
      {
        category: 'WTR',
        selector: 'DRYW',
        code: 'WTR DRYW',
        description: 'Tear out wet drywall, cleanup, bag for disposal',
        activity: '-',
        quantity: wetDrywallSF,
        unit: 'SF',
        reasoning: 'Remove wet materials to prevent mold'
      },
      {
        category: 'DMO',
        selector: 'PU',
        code: 'DMO PU',
        description: 'Haul debris - per pickup truck load',
        activity: '-',
        quantity: 0.25,
        unit: 'EA',
        reasoning: 'Emergency debris removal'
      }
    ];
  }
  
  private generateSetup(): Item[] {
    return [
      {
        category: 'WTR',
        selector: 'EQ',
        code: 'WTR EQ',
        description: 'Equipment setup, take down, and monitoring',
        activity: '+',
        quantity: 4,
        unit: 'HR',
        reasoning: 'Setup and monitor drying equipment'
      }
    ];
  }
}

export function generateEmergencyScope(rooms: Room[], severity: number): Item[] {
  const generator = new EmergencyGenerator();
  // Clamp severity between 1 and 5
  const clampedSeverity = Math.max(1, Math.min(5, severity)) as 1 | 2 | 3 | 4 | 5;
  
  return generator.generate(rooms, { 
    severity: clampedSeverity,
    affectedArea: rooms.reduce((sum, r) => sum + r.squareFootage, 0)
  });
}
