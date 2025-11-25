
interface Room {
  name: string;
  squareFootage: number;
  damage: {
    drywall: boolean;
    flooring: boolean;
    baseboard: boolean;
    paint: boolean;
  };
  drywallSF?: number;
  drywallLF?: number;
  perimeterLF?: number;
}

export interface Item {
  category: string;
  selector: string;
  code: string;
  description: string;
  activity: '+' | '-' | '&';
  quantity: number;
  unit: string;
  reasoning: string;
}

export class ReconstructionGenerator {
  
  /**
   * Generate reconstruction scope for Type R jobs
   * NO water mitigation items - mitigation already completed
   */
  generate(rooms: Room[]): Item[] {
    const items: Item[] = [];
    
    // Add General Conditions first
    items.push(...this.generateGeneralConditions(rooms));
    
    // Process each room
    rooms.forEach(room => {
      items.push(...this.generateRoomItems(room));
    });
    
    return items;
  }
  
  private generateGeneralConditions(rooms: Room[]): Item[] {
    return [
      {
        category: 'DMO',
        selector: 'DTRLR',
        code: 'DMO DTRLR',
        description: 'Dumpster load - approx. 30 yards, inc. dump fees',
        activity: '+',
        quantity: 1,
        unit: 'EA',
        reasoning: 'Debris removal for reconstruction'
      },
      {
        category: 'LAB',
        selector: 'SUP',
        code: 'LAB SUP',
        description: 'Residential Supervision / Project Management',
        activity: '+',
        quantity: 32,
        unit: 'HR',
        reasoning: 'Project management for reconstruction'
      }
    ];
  }
  
  private generateRoomItems(room: Room): Item[] {
    const items: Item[] = [];
    
    // 1. DEMOLITION PHASE
    if (room.damage.flooring) {
      items.push({
        category: 'DMO',
        selector: 'FCC',
        code: 'DMO FCC',
        description: 'Remove wet carpet and pad',
        activity: '-',
        quantity: room.squareFootage,
        unit: 'SF',
        reasoning: 'Remove damaged flooring'
      });
    }
    
    if (room.damage.drywall && room.drywallSF) {
      items.push({
        category: 'DMO',
        selector: 'DRY12',
        code: 'DMO DRY 1/2',
        description: 'Remove 2ft flood cut drywall',
        activity: '-',
        quantity: room.drywallSF,
        unit: 'SF',
        reasoning: 'Remove water damaged drywall'
      });
    }
    
    if (room.damage.baseboard && room.perimeterLF) {
      items.push({
        category: 'DMO',
        selector: 'FNCBBB',
        code: 'DMO FNC BBB',
        description: 'Remove wet baseboards',
        activity: '-',
        quantity: room.perimeterLF,
        unit: 'LF',
        reasoning: 'Remove damaged trim'
      });
    }
    
    // 2. DRYWALL RECONSTRUCTION
    if (room.damage.drywall && room.drywallSF) {
      items.push(
        {
          category: 'DRY',
          selector: '12',
          code: 'DRY 1/2',
          description: 'Install 1/2" drywall',
          activity: '+',
          quantity: room.drywallSF,
          unit: 'SF',
          reasoning: 'Replace removed drywall'
        },
        {
          category: 'DRY',
          selector: 'PATCHJ',
          code: 'DRY PATCHJ',
          description: 'Tape joint for new to existing drywall',
          activity: '+',
          quantity: room.drywallLF || Math.ceil(room.drywallSF / 4),
          unit: 'LF',
          reasoning: 'Finish drywall joints'
        },
        {
          category: 'DRY',
          selector: 'TEX-',
          code: 'DRY TEX-',
          description: 'Texture drywall - machine',
          activity: '+',
          quantity: Math.ceil(room.drywallSF * 1.5),
          unit: 'SF',
          reasoning: 'Match existing texture'
        }
      );
    }
    
    // 3. PAINT
    if (room.damage.paint || room.damage.drywall) {
      items.push({
        category: 'PNT',
        selector: 'SP',
        code: 'PNT SP',
        description: 'Seal/prime (1 coat) then paint (1 coat)',
        activity: '+',
        quantity: room.squareFootage,
        unit: 'SF',
        reasoning: 'Finish walls'
      });
    }
    
    // 4. FLOORING RECONSTRUCTION
    if (room.damage.flooring) {
      items.push(
        {
          category: 'FCC',
          selector: 'PAD',
          code: 'FCC PAD',
          description: 'Carpet pad',
          activity: '+',
          quantity: room.squareFootage,
          unit: 'SF',
          reasoning: 'Install new carpet pad'
        },
        {
          category: 'FCC',
          selector: 'AV',
          code: 'FCC AV',
          description: 'Install new carpet',
          activity: '+',
          quantity: room.squareFootage,
          unit: 'SF',
          reasoning: 'Replace removed flooring'
        }
      );
    }
    
    // 5. BASEBOARD
    if (room.damage.baseboard && room.perimeterLF) {
      items.push({
        category: 'FNC',
        selector: 'BBB',
        code: 'FNC BBB',
        description: 'Install new baseboards',
        activity: '+',
        quantity: room.perimeterLF,
        unit: 'LF',
        reasoning: 'Replace removed trim'
      });
    }
    
    // 6. FINAL CLEANING
    items.push({
      category: 'CLN',
      selector: 'FINALR',
      code: 'CLN FINALR',
      description: 'Final cleaning - construction - Residential',
      activity: '+',
      quantity: room.squareFootage,
      unit: 'SF',
      reasoning: 'Clean after construction'
    });
    
    return items;
  }
}

export function generateReconstructionScope(rooms: Room[]): Item[] {
  const generator = new ReconstructionGenerator();
  return generator.generate(rooms);
}
