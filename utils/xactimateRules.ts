
import { LineItem, ActivityCode } from '../types';
import { CAT_CODE_DICTIONARY } from './catCodeData';

// Priority Order: Mitigation -> Demo -> Dry -> Reconstruction
const CATEGORY_PRIORITY: Record<string, number> = {
  'WTR': 1, // Water Mitigation
  'DMG': 2, // Demolition
  'DMO': 2, // Demolition Alias
  'CLN': 3, // Cleaning
  'DRY': 4, // Drying (often part of WTR but logic varies)
  'FRM': 5, // Framing
  'INS': 6, // Insulation
  'DRY_REP': 7, // Drywall Repair (Using pseudo-cat for sorting)
  'PNT': 8, // Painting
  'FCC': 9, // Flooring
  'FCW': 9,
  'FCT': 9,
  'FNC': 10, // Finish Carpentry
};

// Strict Code Mappings (Anti-Hallucination)
const CODE_ALIASES: Record<string, { cat: string; sel: string }> = {
  'PNT WALL': { cat: 'PNT', sel: 'P2' }, 
  'PNT WALL-': { cat: 'PNT', sel: 'P2' },
  'PNT CEIL': { cat: 'PNT', sel: 'CEIL' }, 
  'FCC AV-': { cat: 'FCC', sel: 'AV' },
  'FCC PAD-': { cat: 'FCC', sel: 'PAD' },
  'WTR EXTW': { cat: 'WTR', sel: 'EXTW' },
  'WTR GRD': { cat: 'WTR', sel: 'GRD' },
  'FLR': { cat: 'FCC', sel: 'AV' }, // Fallback for lazy FLR
};

/**
 * Helper to split "WTR DHM" into category and selector
 */
export const parseCodeToCatSel = (fullCode: string, fallbackCat?: string): { category: string; selector: string } => {
  const parts = fullCode.trim().split(' ');
  if (parts.length >= 2) {
    return { category: parts[0].toUpperCase(), selector: parts.slice(1).join(' ').toUpperCase() };
  }
  return { category: fallbackCat?.toUpperCase() || 'UNK', selector: fullCode.toUpperCase() };
};

/**
 * STRICT BUSINESS LOGIC ENFORCER
 * Programmatically cleans codes and overrides confidence if invalid.
 */
export const enforceBusinessLogic = (item: LineItem): LineItem => {
  // 1. Aggressive Cleaning (Remove phantom spaces/symbols)
  let cleanCat = (item.category || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let cleanSel = (item.selector || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 2. Validate against Dictionary Source of Truth
  const isValidCode = Object.prototype.hasOwnProperty.call(CAT_CODE_DICTIONARY, cleanCat);

  let finalConfidence = item.confidence;
  let finalReasoning = item.reasoning;

  // 3. Confidence Override (Kill Switch)
  if (!isValidCode) {
    finalConfidence = 'Low';
    if (!finalReasoning?.includes('Auto-Downgraded')) {
      finalReasoning = `${finalReasoning || ''} (Auto-Downgraded: Code ${cleanCat} not in standard database)`.trim();
    }
  }

  return {
    ...item,
    category: cleanCat,
    selector: cleanSel,
    confidence: finalConfidence,
    reasoning: finalReasoning
  };
};

/**
 * Sanitizes a raw line item from AI, fixing codes and enforcing caps.
 */
export const sanitizeLineItem = (item: LineItem): LineItem => {
  let { category, selector, quantity } = item;
  const combinedKey = `${category} ${selector}`.toUpperCase().trim();

  // 1. Fix Hallucinated Codes via Map
  if (CODE_ALIASES[combinedKey]) {
    category = CODE_ALIASES[combinedKey].cat;
    selector = CODE_ALIASES[combinedKey].sel;
  } else if (selector.endsWith('-')) {
    selector = selector.slice(0, -1);
  }

  // 2. Hard Logic Overrides
  if (category === 'PNT' && (selector === 'WALL' || selector === 'W')) {
    selector = 'P2'; // Standard 2 coats
  }

  const intermediateItem = {
    ...item,
    category,
    selector,
    quantity
  };

  // 3. Run Strict Business Logic Enforcer
  return enforceBusinessLogic(intermediateItem);
};

/**
 * Sorts items by restoration sequence (Mitigation -> Recon).
 */
export const sortScopeItems = (items: LineItem[]): LineItem[] => {
  return [...items].sort((a, b) => {
    const catA = CATEGORY_PRIORITY[a.category] || 99;
    const catB = CATEGORY_PRIORITY[b.category] || 99;
    
    if (catA !== catB) return catA - catB;
    
    // Secondary sort: Activity (Remove before Replace)
    if (a.activity === ActivityCode.REMOVE && b.activity !== ActivityCode.REMOVE) return -1;
    if (b.activity === ActivityCode.REMOVE && a.activity !== ActivityCode.REMOVE) return 1;
    
    return a.selector.localeCompare(b.selector);
  });
};

/**
 * Validates mandatory inclusions (e.g., Extraction needs Germicide).
 */
export const validateScopeGaps = (items: LineItem[]): string[] => {
  const warnings: string[] = [];
  const codes = new Set(items.map(i => `${i.category} ${i.selector}`));

  if (codes.has('WTR EXTW') && !codes.has('WTR GRD')) {
    warnings.push('Audit Flag: Water Extraction present but Germicide (WTR GRD) is missing.');
  }
  
  if (codes.has('FCC AV') && !codes.has('FCC PAD')) {
    warnings.push('Audit Flag: Carpet replaced (FCC AV) but Pad (FCC PAD) is missing.');
  }

  return warnings;
};
