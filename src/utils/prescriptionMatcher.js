import enterpriseData from '../data/enterpriseData.js';

/**
 * Transpose prescription between minus cylinder and plus cylinder notation
 */
const transposePrescription = (sph, cyl, axis) => {
  const newSph = parseFloat(sph) + parseFloat(cyl);
  const newCyl = -parseFloat(cyl);
  let newAxis = parseInt(axis) + 90;
  if (newAxis > 180) newAxis -= 180;
  return { sph: newSph, cyl: newCyl, axis: newAxis };
};

/**
 * Map axis to nearest standard axis (45, 90, 135, 180)
 */
const mapAxisToStandard = (axis) => {
  const axisNum = parseInt(axis) || 0;
  if (axisNum === 0) return 0;
  
  const standards = [45, 90, 135, 180];
  return standards.reduce((prev, curr) => 
    Math.abs(curr - axisNum) < Math.abs(prev - axisNum) ? curr : prev
  );
};

/**
 * Check if value is within a range
 */
const isValueInRange = (value, min, max) => {
  return parseFloat(value) >= min && parseFloat(value) <= max;
};

/**
 * Match range string like "-6.0 to -2.0"
 * Format: "SPH_MAX to CYL_BAND"
 * Example: "-6.0 to -4.0" means SPH from 0 to -6.0, and CYL from -2.25 to -4.0
 */
const matchesRange = (sph, cyl, rangeStr) => {
  const sphVal = parseFloat(sph) || 0;
  const cylVal = parseFloat(cyl) || 0;
  
  // Handle "sph" suffix (single sphere value, no cylinder)
  if (rangeStr.includes('sph')) {
    const targetSph = parseFloat(rangeStr);
    return Math.abs(sphVal - targetSph) <= 1.0 && cylVal === 0;
  }
  
  // Handle "to" ranges like "-6.0 to -2.0" or "+6.0 to +2.0"
  if (rangeStr.includes('to')) {
    const parts = rangeStr.split('to').map(p => parseFloat(p.trim()));
    if (parts.length === 2) {
      const [maxSph, cylBand] = parts;
      
      // Check SPH is within range (from 0 to maxSph)
      const sphInRange = maxSph < 0 
        ? (sphVal <= 0 && sphVal >= maxSph)  // Minus: 0 to -6.0
        : (sphVal >= 0 && sphVal <= maxSph); // Plus: 0 to +6.0
      
      if (!sphInRange) return false;
      
      // If no cylinder in prescription, match only the -2.0/+2.0 band (smallest cylinder)
      if (cylVal === 0) {
        return Math.abs(cylBand) === 2.0;
      }
      
      // For cylinder matching, determine which band this CYL falls into
      // Bands: -2.0 (0.25 to 2.0), -4.0 (2.25 to 4.0), -6.0 (4.25 to 6.0)
      const cylAbs = Math.abs(cylVal);
      const bandAbs = Math.abs(cylBand);
      
      if (bandAbs === 2.0) {
        // Band for -2.0: covers 0.25 to 2.0
        return cylAbs >= 0.25 && cylAbs <= 2.0;
      } else if (bandAbs === 4.0) {
        // Band for -4.0: covers 2.25 to 4.0
        return cylAbs >= 2.25 && cylAbs <= 4.0;
      } else if (bandAbs === 6.0) {
        // Band for -6.0: covers 4.25 to 6.0
        return cylAbs >= 4.25 && cylAbs <= 6.0;
      } else {
        // For other values, use exact match with small tolerance
        return Math.abs(cylAbs - bandAbs) <= 0.5;
      }
    }
  }
  
  // Handle ADD ranges like "+3/+ ADD" or "-2/+ ADD"
  // Format: "[baseValue]/+ ADD"
  // Logic: Match DV SPH values within specific ranges based on baseValue
  if (rangeStr.includes('ADD')) {
    const baseValue = parseFloat(rangeStr);
    
    // Cylinder must be 0 for ADD ranges (bifocal/progressive with CYL goes to other categories)
    if (cylVal !== 0) return false;
    
    // Positive ADD ranges (e.g., "+3/+ ADD", "+4/+ ADD")
    if (baseValue > 0) {
      let lowerLimit = 0;
      
      // For ranges above +3, use sequential logic
      if (baseValue > 3) {
        lowerLimit = baseValue - 1 + 0.25; // e.g., +4: 3.25 to 4.0
      }
      
      const upperLimit = baseValue;
      return (sphVal >= lowerLimit) && (sphVal <= upperLimit);
    }
    
    // Negative ADD ranges (e.g., "-2/+ ADD", "-3/+ ADD")
    else if (baseValue < 0) {
      let upperLimit = 0;
      
      // For ranges below -2, use sequential logic
      if (baseValue < -2) {
        upperLimit = baseValue + 1 - 0.25; // e.g., -3: -3.0 to -2.25
      }
      
      const lowerLimit = baseValue;
      return (sphVal >= lowerLimit) && (sphVal <= upperLimit);
    }
  }
  
  return false;
};

/**
 * Match CYL_KT and PROGRESSIVE__CYL range with axis
 * Format: "+2, 90" or "-2, 180" (cylinder, axis)
 * These are for prescriptions where SPH is 0 or very close to 0
 */
const matchesCylRange = (sph, cyl, axis, rangeStr) => {
  if (!rangeStr.includes(',')) return false;
  
  const parts = rangeStr.split(',');
  const rangeCyl = parseFloat(parts[0]);
  const rangeAxis = parseInt(parts[1].trim().replace('°', ''));
  
  const sphVal = parseFloat(sph) || 0;
  const cylVal = parseFloat(cyl) || 0;
  const axisVal = mapAxisToStandard(parseInt(axis) || 0);
  
  // For CYL ranges, SPH should be close to 0 (within tolerance)
  const sphNearZero = Math.abs(sphVal) <= 1.0;
  const cylMatch = Math.abs(cylVal - rangeCyl) <= 1.0;
  const axisMatch = axisVal === rangeAxis;
  
  return sphNearZero && cylMatch && axisMatch;
};

/**
 * Match COMP_KT and PROGRESSIVE_COMP range (SPH/CYL with axis)
 * Format: "+2/+1 180°" or "+2/-2, 180°" (SPH/CYL, axis)
 */
const matchesCompRange = (sph, cyl, axis, rangeStr) => {
  if (!rangeStr.includes('/')) return false;
  
  // Handle both formats: "+2/+1 180°" and "+2/-2, 180°"
  const cleanStr = rangeStr.replace(/,/g, '');
  const parts = cleanStr.split('/');
  if (parts.length < 2) return false;
  
  const rangeSph = parseFloat(parts[0]);
  const rangeCylPart = parts[1].trim();
  const rangeCyl = parseFloat(rangeCylPart);
  
  const sphVal = parseFloat(sph) || 0;
  const cylVal = parseFloat(cyl) || 0;
  
  // Extract axis if present
  let rangeAxis = 0;
  const axisMatch = rangeCylPart.match(/(\d+)°/);
  if (axisMatch) {
    rangeAxis = parseInt(axisMatch[1]);
  }
  
  // Use category-based matching for SPH and CYL
  // Round to nearest integer category for comparison
  const sphCategory = Math.round(Math.abs(sphVal));
  const cylCategory = Math.round(Math.abs(cylVal));
  const rangeSphCategory = Math.round(Math.abs(rangeSph));
  const rangeCylCategory = Math.round(Math.abs(rangeCyl));
  
  // Check signs match
  const sphSignMatch = (sphVal >= 0 && rangeSph >= 0) || (sphVal < 0 && rangeSph < 0) || (Math.abs(sphVal) < 0.5);
  const cylSignMatch = (cylVal >= 0 && rangeCyl >= 0) || (cylVal < 0 && rangeCyl < 0) || (Math.abs(cylVal) < 0.5);
  
  const sphMatch = sphCategory === rangeSphCategory && sphSignMatch;
  const cylMatch = cylCategory === rangeCylCategory && cylSignMatch;
  
  if (rangeAxis === 0) {
    return sphMatch && cylMatch;
  }
  
  const axisVal = mapAxisToStandard(parseInt(axis) || 0);
  return sphMatch && cylMatch && axisVal === rangeAxis;
};

/**
 * Try matching prescription in all enterprise data categories
 */
const findBestMatch = (sph, cyl, axis, brandData, isBifocal = false, isProgressive = false) => {
  const sphVal = parseFloat(sph) || 0;
  const cylVal = parseFloat(cyl) || 0;
  const axisVal = parseInt(axis) || 0;
  
  // Try original prescription
  let result = tryMatchPrescription(sphVal, cylVal, axisVal, brandData, isBifocal, isProgressive);
  if (result) return result;
  
  // Try transposed prescription
  if (cylVal !== 0) {
    const transposed = transposePrescription(sphVal, cylVal, axisVal);
    result = tryMatchPrescription(transposed.sph, transposed.cyl, transposed.axis, brandData, isBifocal, isProgressive);
    if (result) return result;
  }
  
  return null;
};

/**
 * Try to match prescription against all categories
 * @param {boolean} isBifocal - Whether this is for bifocal lenses
 * @param {boolean} isProgressive - Whether this is for progressive lenses
 */
const tryMatchPrescription = (sph, cyl, axis, brandData, isBifocal = false, isProgressive = false) => {
  const sphVal = parseFloat(sph) || 0;
  const cylVal = parseFloat(cyl) || 0;
  
  // For bifocal: Check different categories based on prescription type
  if (isBifocal) {
    // If SPH is near zero and CYL is present, check CYL_KT first
    if (Math.abs(sphVal) <= 1.0 && cylVal !== 0 && brandData.CYL_KT) {
      const match = brandData.CYL_KT.find(item => matchesCylRange(sph, cyl, axis, item.range));
      if (match) return { category: 'CYL_KT', subcategory: 'CYL_KT', match };
    }
    
    // If both SPH and CYL are present, check COMP_KT
    if (Math.abs(sphVal) > 1.0 && cylVal !== 0 && brandData.COMP_KT) {
      const match = brandData.COMP_KT.find(item => matchesCompRange(sph, cyl, axis, item.range));
      if (match) return { category: 'COMP_KT', subcategory: 'COMP_KT', match };
    }
    
    // Otherwise check Bifocal KT (SPH only)
    if (brandData['Bifocal KT']) {
      const match = brandData['Bifocal KT'].find(item => matchesRange(sph, cyl, item.range));
      if (match) return { category: 'Bifocal KT', subcategory: 'Bifocal KT', match };
    }
  }
  
  // For progressive: prioritize Progressive categories
  if (isProgressive) {
    // If SPH is near zero and CYL is present, check PROGRESSIVE__CYL first
    if (Math.abs(sphVal) <= 1.0 && cylVal !== 0 && brandData.PROGRESSIVE__CYL) {
      const match = brandData.PROGRESSIVE__CYL.find(item => matchesCylRange(sph, cyl, axis, item.range));
      if (match) return { category: 'PROGRESSIVE__CYL', subcategory: 'PROGRESSIVE__CYL', match };
    }
    
    // Try PROGRESSIVE_COMP for compound (SPH > 1 with CYL)
    if (Math.abs(sphVal) > 1.0 && cylVal !== 0 && brandData.PROGRESSIVE_COMP) {
      const match = brandData.PROGRESSIVE_COMP.find(item => matchesCompRange(sph, cyl, axis, item.range));
      if (match) return { category: 'PROGRESSIVE_COMP', subcategory: 'PROGRESSIVE_COMP', match };
    }
    
    // Try PROGRESSIVE_SPH for SPH-only or as fallback
    if (brandData.PROGRESSIVE_SPH) {
      const match = brandData.PROGRESSIVE_SPH.find(item => matchesRange(sph, cyl, item.range));
      if (match) return { category: 'PROGRESSIVE_SPH', subcategory: 'PROGRESSIVE_SPH', match };
    }
  }
  
  // For single vision (default behavior)
  if (!isBifocal && !isProgressive) {
    // Special case: All zeros (SPH=0, CYL=0, AXIS=0) - return first Minus Comp range
    if (sphVal === 0 && cylVal === 0 && brandData.single_vision && brandData.single_vision['Minus Comp']) {
      const firstRange = brandData.single_vision['Minus Comp'][0];
      if (firstRange) {
        return { category: 'single_vision', subcategory: 'Minus Comp', match: firstRange };
      }
    }
    
    // Priority 1: Try Single Vision categories
    if (brandData.single_vision) {
      // Try SV Cross Comp FIRST (different signs - cross cylinder)
      if ((sphVal > 0 && cylVal < 0) || (sphVal < 0 && cylVal > 0)) {
        const match = findMatchInCategory(sph, cyl, axis, brandData.single_vision['SV Cross Comp']);
        if (match) return { category: 'single_vision', subcategory: 'SV Cross Comp', match };
      }
      
      // Try Minus Comp
      if (sphVal < 0 || (sphVal === 0 && cylVal < 0)) {
        const match = findMatchInCategory(sph, cyl, axis, brandData.single_vision['Minus Comp']);
        if (match) return { category: 'single_vision', subcategory: 'Minus Comp', match };
      }
      
      // Try Plus Comp
      if (sphVal > 0 || (sphVal === 0 && cylVal > 0)) {
        const match = findMatchInCategory(sph, cyl, axis, brandData.single_vision['Plus Comp']);
        if (match) return { category: 'single_vision', subcategory: 'Plus Comp', match };
      }
    }
    
    // Priority 2: Try CYL_KT (cylinder with axis)
    if (cylVal !== 0 && axis !== 0 && brandData.CYL_KT) {
      const match = brandData.CYL_KT.find(item => matchesCylRange(sph, cyl, axis, item.range));
      if (match) return { category: 'CYL_KT', subcategory: 'CYL_KT', match };
    }
    
    // Priority 3: Try COMP_KT (compound)
    if (cylVal !== 0 && brandData.COMP_KT) {
      const match = brandData.COMP_KT.find(item => matchesCompRange(sph, cyl, axis, item.range));
      if (match) return { category: 'COMP_KT', subcategory: 'COMP_KT', match };
    }
  }
  
  return null;
};

/**
 * Find match within a specific category
 */
const findMatchInCategory = (sph, cyl, axis, categoryData) => {
  if (!categoryData) return null;
  return categoryData.find(item => matchesRange(sph, cyl, item.range));
};

/**
 * Match prescription data with enterprise data and return available options
 * @param {object} prescriptionData - The prescription data
 * @param {string} powerType - 'with-power', 'bifocal', or 'progressive'
 */
export const matchPrescriptionData = (prescriptionData, powerType = 'with-power') => {
  const results = {
    rightEye: null,
    leftEye: null,
    brand: enterpriseData.brand
  };
  
  const isBifocal = powerType === 'bifocal';
  const isProgressive = powerType === 'progressive';

  // Process each eye
  ['rightEye', 'leftEye'].forEach((eye) => {
    const eyeData = prescriptionData[eye];
    
    // For bifocal/progressive, use DV (Distance Vision) values
    let sph, cyl, axis;
    if (isBifocal || isProgressive) {
      sph = eyeData.dv?.sph === '' ? 0 : parseFloat(eyeData.dv?.sph || 0);
      cyl = eyeData.dv?.cyl === '' ? 0 : parseFloat(eyeData.dv?.cyl || 0);
      axis = eyeData.dv?.axis === '' ? 0 : parseInt(eyeData.dv?.axis || 0);
    } else {
      sph = eyeData.sph === '' ? 0 : parseFloat(eyeData.sph);
      cyl = eyeData.cyl === '' ? 0 : parseFloat(eyeData.cyl);
      axis = eyeData.axis === '' ? 0 : parseInt(eyeData.axis);
    }

    // Find best match across all categories
    const matchResult = findBestMatch(sph, cyl, axis, enterpriseData, isBifocal, isProgressive);
    
    if (matchResult) {
      results[eye] = {
        category: matchResult.category,
        subcategory: matchResult.subcategory,
        range: matchResult.match.range,
        prices: matchResult.match,
        prescription: {
          sph,
          cyl,
          axis
        }
      };
    } else {
      results[eye] = { 
        error: 'No matching range found for this prescription',
        prescription: { sph, cyl, axis }
      };
    }
  });

  return results;
};

/**
 * Get available lens coatings/types for a matched prescription
 */
export const getAvailableCoatings = (matchedData) => {
  if (!matchedData || matchedData.error) {
    return [];
  }

  const coatings = [];
  const prices = matchedData.prices;

  const coatingMap = {
    HC: 'Hard Coat',
    ARC: 'Anti-Reflective Coating',
    HC_PG: 'Hard Coat + Photogray',
    ARC_PG: 'ARC + Photogray',
    ARC_POLY: 'ARC Polycarbonate',
    BLUCUT: 'Blue Cut',
    BLUCUT_PC_POLY: 'Blue Cut PC Poly',
    ARC_1_67: 'ARC 1.67 Index',
    BLUCUT_1_67: 'Blue Cut 1.67 Index',
    NIGHT_DRIVE: 'Night Drive',
    PG_BC_GREEN: 'Photogray Blue Cut Green',
    PG_BC_BLUE: 'Photogray Blue Cut Blue',
    PG_BC_KT_GREEN: 'PG Blue Cut KT Green',
    PG_BC_KT_BLUE: 'PG Blue Cut KT Blue'
  };

  for (const [key, value] of Object.entries(prices)) {
    if (key !== 'range' && value && value !== '-') {
      coatings.push({
        code: key,
        name: coatingMap[key] || key,
        price: value
      });
    }
  }

  return coatings;
};
