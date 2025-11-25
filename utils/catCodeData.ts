
import { type ClassAttributes } from "react";

export interface CatDefinition {
  code: string;
  name: string;
  description: string;
}

export const CAT_CODE_DICTIONARY: Record<string, CatDefinition> = {
  "WTR": { code: "WTR", name: "Water Extraction", description: "Extraction, drying, mitigation" },
  "DRY": { code: "DRY", name: "Drywall", description: "Gypsum board, texture, tape and float" },
  "PNT": { code: "PNT", name: "Painting", description: "Seal, prime, paint walls and trim" },
  "FCC": { code: "FCC", name: "Carpet", description: "Carpet material and installation" },
  "FCW": { code: "FCW", name: "Wood Flooring", description: "Hardwood, engineered wood, laminate" },
  "FCV": { code: "FCV", name: "Vinyl Flooring", description: "LVT, VCT, sheet vinyl" },
  "FCT": { code: "FCT", name: "Ceramic Tile", description: "Ceramic, porcelain, stone tile" },
  "FNC": { code: "FNC", name: "Finish Carpentry", description: "Baseboards, trim, molding" },
  "CAB": { code: "CAB", name: "Cabinetry", description: "Kitchen and bath cabinets, vanities" },
  "DOR": { code: "DOR", name: "Doors", description: "Interior and exterior doors and frames" },
  "WDV": { code: "WDV", name: "Windows Vinyl", description: "Standard vinyl windows" },
  "RFG": { code: "RFG", name: "Roofing", description: "Shingles, flashing, felt, vents" },
  "SDG": { code: "SDG", name: "Siding", description: "Vinyl, wood, metal siding" },
  "FRM": { code: "FRM", name: "Framing", description: "Structural wood, studs, joists" },
  "INS": { code: "INS", name: "Insulation", description: "Batt, blown-in, vapor barrier" },
  "PLA": { code: "PLA", name: "Lath and Plaster", description: "Interior lath and plaster for older homes" },
  "SFG": { code: "SFG", name: "Soffit Fascia Gutter", description: "Roof overhangs and gutters" },
  "ELE": { code: "ELE", name: "Electrical", description: "Wiring, outlets, switches, panels" },
  "LIT": { code: "LIT", name: "Light Fixtures", description: "Lamps, fans, chandeliers" },
  "PLM": { code: "PLM", name: "Plumbing", description: "Pipes, sinks, toilets, tubs" },
  "HVC": { code: "HVC", name: "HVAC", description: "Ducts, vents, furnaces, AC units" },
  "APP": { code: "APP", name: "Appliances", description: "Stove, fridge, washer dryer" },
  "DMO": { code: "DMO", name: "Demolition", description: "General tear out, trash removal" },
  "CLN": { code: "CLN", name: "Cleaning", description: "Final clean, contents cleaning" },
  "TMP": { code: "TMP", name: "Temporary", description: "Board up, temp toilets, fencing" },
  "HMR": { code: "HMR", name: "HazMat", description: "Mold, asbestos, lead remediation" },
  "LAB": { code: "LAB", name: "Labor Only", description: "General labor, supervision, project management" },
  "SCF": { code: "SCF", name: "Scaffolding", description: "Scaffolding, lifts, overhead protection" },
  "CON": { code: "CON", name: "Content Manipulation", description: "Moving furniture or boxes on site" },
  "FEE": { code: "FEE", name: "Permits and Fees", description: "Building permits, dump fees" }
};

export const getCatDefinition = (code: string): CatDefinition | null => {
  if (!code) return null;
  const upperCode = code.trim().toUpperCase();
  return CAT_CODE_DICTIONARY[upperCode] || null;
};
