# Prescription Matching Algorithm Documentation

## Overview
This document details the prescription matching algorithm extracted from the Neema internal application. It explains how prescriptions are matched against enterprise lens data across different lens categories.

---

## 1. Lens Categories

The system handles multiple lens categories with specific matching logic:

### Single Vision Categories:
- **Minus Comp** (Priority 1)
- **Plus Comp** (Priority 2)
- **SV Cross Comp** (Priority 3)

### Progressive/Bifocal Categories:
- **Bifocal KT**
- **Progressive**
- **PROGRESSIVE_SPH**

### Cylindrical Categories:
- **CYL_KT** (Cylinder KT)
- **PROGRESSIVE__CYL** (Progressive Cylinder)
- **COMP_KT** (Compound KT)
- **PROGRESSIVE_COMP** (Progressive Compound)

---

## 2. Core Matching Functions

### 2.1 Quarter Interval Validation

```javascript
validateQuarterInterval(value)
```

**Purpose**: Ensures all prescription values are in 0.25 increments

**Logic**:
- Checks if value is a multiple of 0.25
- Formula: `(value * 4) % 1 === 0`
- Valid examples: -0.25, -0.50, -0.75, -1.00, +2.25
- Invalid examples: -0.33, +1.15

---

## 3. Range Matching Algorithm

### 3.1 Main Range Matching Function

```javascript
matchesRange(rangeStr, sphere, cylinder)
```

This is the **core matching function** that determines if a prescription fits within a data range.

#### **Format Types Handled:**

##### A. Single Sphere Values (SPH only)
**Format**: `"-25.0 sph"` or `"+18.0 sph"`

**Logic**:
```javascript
// Extract target sphere from range
const targetSph = parseFloat(match[1]); // e.g., -25.0

// Matching conditions:
// 1. Sphere must be within ±1.0 of target
// 2. Cylinder must be ≤ 1.0 in absolute value

return Math.abs(sph - targetSph) <= 1.0 && Math.abs(cyl) <= 1.0;
```

**Example**:
- Range: `"-6.0 sph"`
- Matches: sphere = -6.5 to -5.5, cylinder = -1.0 to +1.0

---

##### B. "To" Ranges (SPH and CYL ranges)
**Format**: `"-6.0 to -2.0"`, `"+3.0 to +2.0"`, `"+1.75 to -2.0"`

**Structure**: `"[sphereLimit] to [cylinderLimit]"`

**Logic**:
```javascript
const sphereLimit = parseFloat(val1Match[1]);    // First value
const cylinderLimit = parseFloat(val2Match[1]);  // Second value

// Sphere Range Check:
if (sphereLimit < 0) {
    // Negative range: sphere from sphereLimit to 0
    // Example: -6.0 means sphere can be -6.0 to 0
    sphInRange = (sph <= 0) && (sph >= sphereLimit);
} else {
    // Positive range: sphere from 0 to sphereLimit
    // Example: +3.0 means sphere can be 0 to +3.0
    sphInRange = (sph >= 0) && (sph <= sphereLimit);
}

// Cylinder Range Check (same logic):
if (cylinderLimit < 0) {
    cylInRange = (cyl <= 0) && (cyl >= cylinderLimit);
} else {
    cylInRange = (cyl >= 0) && (cyl <= cylinderLimit);
}

return sphInRange && cylInRange;
```

**Examples**:
1. Range: `"-6.0 to -2.0"`
   - Sphere: -6.0 to 0
   - Cylinder: -2.0 to 0
   
2. Range: `"+3.0 to +2.0"`
   - Sphere: 0 to +3.0
   - Cylinder: 0 to +2.0

---

##### C. ADD Ranges (Bifocal/Progressive)
**Format**: `"+3/+ ADD"`, `"-3/+ ADD"`, `"+4/+ ADD"`

**Structure**: `"[baseValue]/+ ADD"`

**Logic - Positive Ranges**:
```javascript
if (baseValue > 0) {
    // Cylinder must be 0 for ADD ranges
    if (cyl !== 0) return false;
    
    let lowerLimit = 0;
    
    // Special sequential logic for ranges above +3
    if (baseValue > 3) {
        lowerLimit = baseValue - 1 + 0.25;
    }
    
    const upperLimit = baseValue;
    return (sph >= lowerLimit) && (sph <= upperLimit);
}
```

**Positive ADD Range Table**:
| Range | Sphere Matches |
|-------|----------------|
| `"+3/+ ADD"` | 0 to +3.0 |
| `"+4/+ ADD"` | +3.25 to +4.0 |
| `"+5/+ ADD"` | +4.25 to +5.0 |
| `"+6/+ ADD"` | +5.25 to +6.0 |

**Logic - Negative Ranges**:
```javascript
else if (baseValue < 0) {
    if (cyl !== 0) return false;
    
    let upperLimit = 0;
    
    if (baseValue < -2) {
        upperLimit = baseValue + 1 - 0.25;
    }
    
    const lowerLimit = baseValue;
    return (sph >= lowerLimit) && (sph <= upperLimit);
}
```

**Negative ADD Range Table**:
| Range | Sphere Matches |
|-------|----------------|
| `"-2/+ ADD"` | 0 to -2.0 |
| `"-3/+ ADD"` | -2.25 to -3.0 |
| `"-4/+ ADD"` | -3.25 to -4.0 |
| `"-5/+ ADD"` | -4.25 to -5.0 |
| `"-6/+ ADD"` | -5.25 to -6.0 |

---

## 4. Prescription Transposition

### 4.1 Standard Transposition

```javascript
transposePrescription(sphere, cylinder, axis)
```

**Formula**:
```
New Sphere = Old Sphere + Old Cylinder
New Cylinder = -(Old Cylinder)
New Axis = Old Axis ± 90° (keep within 0-180°)
```

**Example**:
```
Original: Sph -2.00, Cyl -1.50, Axis 90°
Transposed: Sph -3.50, Cyl +1.50, Axis 180°
```

**Code**:
```javascript
const newSphere = sph + cyl;
const newCylinder = -cyl;
let newAxis = ax >= 90 ? ax - 90 : ax + 90;
```

---

## 5. Single Vision Matching Priority System

### 5.1 Priority Order

The system tries matching in strict priority order:

**Priority 1: Minus Comp**
1. Try original values in Minus Comp
2. If no match, try transposed values in Minus Comp

**Priority 2: Plus Comp** (only if Priority 1 fails)
1. Try original values in Plus Comp
2. If no match, try transposed values in Plus Comp

**Priority 3: SV Cross Comp** (only if Priority 1 & 2 fail)
1. Try original values in SV Cross Comp
2. If no match, try transposed values in SV Cross Comp

### 5.2 Implementation

```javascript
export const findLensOptions = (brandData, sphere, cylinder, axis, hasAddPower = false) => {
    // Validate quarter intervals
    if (!validateQuarterInterval(sphere) || !validateQuarterInterval(cylinder)) {
        return { error: 'Values must be in 0.25 intervals' };
    }

    const sph = parseFloat(sphere) || 0;
    const cyl = parseFloat(cylinder) || 0;
    const transposed = transposePrescription(sphere, cylinder, axis);

    // Priority 1: Minus Comp
    if (brandData.single_vision["Minus Comp"]) {
        // Try original values
        const originalMatches = brandData.single_vision["Minus Comp"]
            .filter(item => matchesRange(item.range, sph, cyl));
        
        if (originalMatches.length > 0) {
            return {
                matches: originalMatches,
                bestMatch: originalMatches[0],
                searchStrategy: 'Priority 1: Minus Comp (Original values)',
                categoryInfo: { category: 'Minus Comp', priority: 1 }
            };
        }

        // Try transposed values
        const transposedMatches = brandData.single_vision["Minus Comp"]
            .filter(item => matchesRange(item.range, transposed.sphere, transposed.cylinder));
        
        if (transposedMatches.length > 0) {
            return {
                matches: transposedMatches,
                bestMatch: transposedMatches[0],
                searchStrategy: 'Priority 1: Minus Comp (Transposed values)',
                categoryInfo: { category: 'Minus Comp', priority: 1 }
            };
        }
    }

    // Priority 2: Plus Comp (same structure)
    // Priority 3: SV Cross Comp (same structure)
    
    // No matches found
    return { searchStrategy: 'No matches found in any category' };
};
```

---

## 6. Axis Mapping for Cylindrical Lenses

### 6.1 Axis Mapping Function

```javascript
mapAxisForCylKT(axis)
```

**Purpose**: Maps any axis value to standard CYL_KT axes (45°, 90°, 135°, 180°)

**Mapping Rules**:
| Input Range | Mapped To |
|-------------|-----------|
| 21° - 69° | 45° |
| 70° - 110° | 90° |
| 111° - 155° | 135° |
| 156° - 180° or 0° - 20° | 180° |

**Code**:
```javascript
export const mapAxisForCylKT = (axis) => {
    const ax = parseFloat(axis) || 0;
    
    if (ax >= 21 && ax <= 69) return 45;
    if (ax >= 70 && ax <= 110) return 90;
    if (ax >= 111 && ax <= 155) return 135;
    return 180; // Default for 156-180 and 0-20
};
```

---

## 7. CYL_KT Range Matching

### 7.1 CYL_KT Range Format

**Format**: `"+2, 180"`, `"-4, 90"`, `"+3, 45"`

**Structure**: `"[cylinder], [axis]"`

### 7.2 CYL_KT Cylinder Range Logic

**Sequential Range System**:

**Positive Cylinders**:
| Range Value | Cylinder Matches |
|-------------|------------------|
| `+2` | +0.25 to +2.0 |
| `+3` | +2.25 to +3.0 |
| `+4` | +3.25 to +4.0 |

**Negative Cylinders**:
| Range Value | Cylinder Matches |
|-------------|------------------|
| `-2` | -0.25 to -2.0 |
| `-3` | -2.25 to -3.0 |
| `-4` | -3.25 to -4.0 |

### 7.3 Implementation

```javascript
export const matchesCylKTRange = (rangeStr, cylinder, axis) => {
    if (!rangeStr) return false;

    const cyl = parseFloat(cylinder) || 0;
    const ax = parseFloat(axis) || 0;

    // Parse range: "+2, 180"
    const parts = rangeStr.split(',').map(p => p.trim());
    if (parts.length !== 2) return false;

    const rangeCyl = parseFloat(parts[0]);
    const rangeAxis = parseFloat(parts[1]);

    // Map input axis to standard axis
    const mappedAxis = mapAxisForCylKT(ax);
    if (mappedAxis !== rangeAxis) return false;

    // Define limits based on rangeCyl value
    let lowerLimit, upperLimit;

    if (rangeCyl > 0) {
        // Positive cylinder
        if (rangeCyl === 2) {
            lowerLimit = 0.25;
            upperLimit = 2.0;
        } else if (rangeCyl === 3) {
            lowerLimit = 2.25;
            upperLimit = 3.0;
        } else if (rangeCyl === 4) {
            lowerLimit = 3.25;
            upperLimit = 4.0;
        }
        return (cyl > 0) && (cyl >= lowerLimit) && (cyl <= upperLimit);
    } 
    else if (rangeCyl < 0) {
        // Negative cylinder (note: for negatives, lowerLimit is the more negative value)
        if (rangeCyl === -2) {
            lowerLimit = -0.25;
            upperLimit = -2.0;
        } else if (rangeCyl === -3) {
            lowerLimit = -2.25;
            upperLimit = -3.0;
        } else if (rangeCyl === -4) {
            lowerLimit = -3.25;
            upperLimit = -4.0;
        }
        // For negative: cyl should be between upperLimit and lowerLimit
        return (cyl < 0) && (cyl >= upperLimit) && (cyl <= lowerLimit);
    }

    return false;
};
```

---

## 8. COMP_KT (Compound) Matching

### 8.1 COMP_KT Range Format

**Format**: `"+2/+1 180°"`, `"-2/-1 90°"`, `"+1/-2 180°"`

**Structure**: `"[sphere]/[cylinder] [axis]°"`

### 8.2 Sphere and Cylinder Categories

**Sphere Categories**:
| Category | Sphere Range |
|----------|--------------|
| 2 | 0.25 to 2.0 |
| 3 | 2.25 to 3.0 |
| 4 | 3.25 to 4.0 |
| 5 | 4.25 to 5.0 |
| 6 | 5.25 to 6.0 |

**Cylinder Categories**:
| Category | Cylinder Range |
|----------|----------------|
| 1 | 0.25 to 1.0 |
| 2 | 1.25 to 2.0 |
| 3 | 2.25 to 3.0 |
| 4 | 3.25 to 4.0 |

### 8.3 COMP_KT Matching Logic

```javascript
export const matchesCompKTRange = (rangeStr, sphere, cylinder, axis) => {
    if (!rangeStr) return false;

    const sph = parseFloat(sphere) || 0;
    const cyl = parseFloat(cylinder) || 0;
    const ax = parseFloat(axis) || 0;

    // Parse: "+2/+1 180°"
    const match = rangeStr.match(/([-+]?\d+)\/([-+]?\d+)\s+(\d+)°/);
    if (!match) return false;

    const rangeSph = parseInt(match[1]);
    const rangeCyl = parseInt(match[2]);
    const rangeAxis = parseInt(match[3]);

    // Check axis
    const mappedAxis = mapAxisForCompKT(ax);
    if (mappedAxis !== rangeAxis) return false;

    // Get categories
    const sphCategory = getCompKTSphereRange(sph);
    const cylCategory = getCompKTCylinderRange(cyl);
    const rangeSphCategory = getCompKTSphereRange(rangeSph);
    const rangeCylCategory = getCompKTCylinderRange(rangeCyl);

    // Check signs
    const sphSign = sph >= 0 ? 1 : -1;
    const cylSign = cyl >= 0 ? 1 : -1;
    const rangeSphSign = rangeSph >= 0 ? 1 : -1;
    const rangeCylSign = rangeCyl >= 0 ? 1 : -1;

    // Match: category and sign must match for both sphere and cylinder
    return (sphCategory === rangeSphCategory && sphSign === rangeSphSign &&
            cylCategory === rangeCylCategory && cylSign === rangeCylSign);
};
```

### 8.4 COMP_KT Priority System

**Priority Order** (lower is better):
1. **Both Positive** (+/+): Priority 1
2. **Both Negative** (-/-): Priority 2
3. **Mixed Signs** (+/- or -/+): Priority 3

```javascript
export const getCompKTPriority = (rangeStr) => {
    const match = rangeStr.match(/([-+]?\d+)\/([-+]?\d+)/);
    if (!match) return 999;

    const sphSign = match[1].startsWith('-') ? -1 : 1;
    const cylSign = match[2].startsWith('-') ? -1 : 1;

    if (sphSign > 0 && cylSign > 0) return 1;  // +/+
    if (sphSign < 0 && cylSign < 0) return 2;  // -/-
    return 3;  // Mixed
};
```

### 8.5 COMP_KT Matching Strategy

```javascript
export const findCompKTOptions = (brandData, dvSphere, dvCylinder, dvAxis, nvSphere, addPower) => {
    // Try original prescription
    const originalMatches = brandData["COMP_KT"]
        .filter(item => matchesCompKTRange(item.range, dvSphere, dvCylinder, dvAxis));

    // Try transposed prescription
    const transposed = transposeCompKTPrescription(dvSphere, dvCylinder, dvAxis);
    const transposedMatches = brandData["COMP_KT"]
        .filter(item => matchesCompKTRange(item.range, transposed.sphere, transposed.cylinder, transposed.axis));

    let allMatches = [];
    
    if (originalMatches.length > 0 && transposedMatches.length === 0) {
        allMatches = originalMatches.map(m => ({ ...m, isTransposed: false }));
    } 
    else if (originalMatches.length === 0 && transposedMatches.length > 0) {
        allMatches = transposedMatches.map(m => ({ ...m, isTransposed: true }));
    } 
    else if (originalMatches.length > 0 && transposedMatches.length > 0) {
        // Combine both and sort by priority
        allMatches = [
            ...originalMatches.map(m => ({ ...m, isTransposed: false })),
            ...transposedMatches.map(m => ({ ...m, isTransposed: true }))
        ];
    }

    // Sort by priority
    if (allMatches.length > 0) {
        allMatches.sort((a, b) => {
            const priorityA = getCompKTPriority(a.range);
            const priorityB = getCompKTPriority(b.range);
            return priorityA - priorityB;
        });
    }

    return {
        matches: allMatches,
        bestMatch: allMatches.length > 0 ? allMatches[0] : null
    };
};
```

---

## 9. Progressive COMP Matching

### 9.1 Format Difference

**COMP_KT Format**: `"+2/+1 180°"` (space before axis)
**Progressive COMP Format**: `"+2/-2, 180°"` (comma before axis)

### 9.2 Implementation

Uses the same logic as COMP_KT but with different parsing:

```javascript
export const matchesProgressiveCompRange = (rangeStr, sphere, cylinder, axis) => {
    // Parse with comma: "+2/-2, 180°"
    const match = rangeStr.match(/([-+]?\d+)\/([-+]?\d+),\s*(\d+)°/);
    
    // Rest of logic is identical to COMP_KT
    // ... same category matching, sign checking, axis mapping
};
```

---

## 10. ADD Power Calculations

### 10.1 ADD Power Relationship

**Formulas**:
```
ADD = NV - DV
NV = DV + ADD
```

Where:
- **DV** = Distance Vision (sphere)
- **NV** = Near Vision (sphere)
- **ADD** = Addition Power

### 10.2 ADD Power Validation

```javascript
// ADD must be between 1.0 and 3.0
if (calculatedAdd < 1.0 || calculatedAdd > 3.0) {
    return { error: 'ADD Power must be between 1.0 and 3.0' };
}

// Cylinder must be 0 for bifocal/progressive with ADD
if (cyl !== 0 && hasAddPower) {
    return { error: 'Cylinder must be 0 for ADD power calculations' };
}
```

---

## 11. Complete Matching Flow

### 11.1 Decision Tree

```
START
│
├─ Has ADD Power?
│  ├─ YES → Search in Bifocal KT and Progressive
│  │         - Check if cylinder = 0
│  │         - Match sphere against ADD ranges
│  │         - Return matches
│  │
│  └─ NO → Single Vision Flow
│           │
│           ├─ Validate 0.25 intervals
│           │
│           ├─ Calculate transposition
│           │
│           ├─ Try Priority 1: Minus Comp
│           │  ├─ Try original values
│           │  └─ Try transposed values
│           │
│           ├─ Try Priority 2: Plus Comp
│           │  ├─ Try original values
│           │  └─ Try transposed values
│           │
│           └─ Try Priority 3: SV Cross Comp
│              ├─ Try original values
│              └─ Try transposed values
│
END
```

### 11.2 CYL_KT/COMP_KT Flow

```
START (Cylinder ≠ 0)
│
├─ Is this COMP_KT or CYL_KT?
│  │
│  ├─ CYL_KT (Sphere = 0)
│  │  ├─ Map axis to standard (45, 90, 135, 180)
│  │  ├─ Determine cylinder category (2, 3, 4)
│  │  └─ Match against CYL_KT data
│  │
│  └─ COMP_KT (Sphere ≠ 0)
│     ├─ Map axis to standard
│     ├─ Determine sphere category (2, 3, 4, 5, 6)
│     ├─ Determine cylinder category (1, 2, 3, 4)
│     ├─ Try original prescription
│     ├─ Try transposed prescription
│     ├─ Combine matches
│     └─ Sort by priority (+/+, -/-, mixed)
│
END
```

---

## 12. Key Algorithm Principles

### 12.1 Design Principles

1. **Quarter Interval Rule**: All values must be multiples of 0.25
2. **Priority-Based Matching**: Higher priority categories checked first
3. **Original vs Transposed**: Always try original first, then transposed
4. **Category Specificity**: Each category has unique range matching logic
5. **Axis Mapping**: Standardizes axis to 4 values for cylindrical lenses
6. **Sequential Ranges**: Ranges are continuous and non-overlapping
7. **Sign Preservation**: Positive and negative ranges handled separately

### 12.2 Validation Rules

```javascript
// General Rules
- Values in 0.25 intervals: ✓
- Axis between 0-180°: ✓
- ADD power 1.0-3.0: ✓

// Single Vision Rules
- Axis not considered: ✓
- Can have sphere only: ✓
- Can have sphere + cylinder: ✓

// Bifocal/Progressive Rules
- Cylinder must be 0: ✓
- Axis required if cylinder ≠ 0: ✓

// CYL_KT Rules
- Cylinder must be ≠ 0: ✓
- Axis required: ✓

// COMP_KT Rules
- Both sphere and cylinder ≠ 0: ✓
- Axis required: ✓
```

---

## 13. Example Matching Scenarios

### Scenario 1: Simple Minus Prescription

**Input**: Sphere -2.00, Cylinder -0.50, Axis 90°

**Process**:
1. Validate 0.25 intervals: ✓
2. Calculate transposed: Sph -2.50, Cyl +0.50, Axis 180°
3. Try Minus Comp with original values
4. Check if matches range like "-6.0 to -2.0"
5. Match found in Minus Comp (original)

### Scenario 2: Progressive with ADD

**Input**: DV Sphere +1.50, Cylinder 0, ADD +2.00

**Process**:
1. hasAddPower = true
2. Calculate NV: +1.50 + 2.00 = +3.50
3. Validate cylinder = 0: ✓
4. Search in Bifocal KT and Progressive
5. Match against range "+3/+ ADD"
6. Sphere +1.50 is between 0 and +3.0: ✓

### Scenario 3: COMP_KT with Transposition

**Input**: DV Sphere +2.75, Cylinder -1.50, Axis 45°

**Process**:
1. Map axis 45° → 45°
2. Sphere category: 2.75 → category 3 (2.25-3.0)
3. Cylinder category: 1.50 → category 2 (1.25-2.0)
4. Try original: "+3/-2 45°" - no match (cylinder sign wrong)
5. Transpose: Sph +1.25, Cyl +1.50, Axis 135°
6. Sphere category: 1.25 → category 2
7. Cylinder category: 1.50 → category 2
8. Try transposed: "+2/+2 135°" - match! ✓
9. Priority: +/+ = Priority 1

---

## 14. Edge Cases and Special Handling

### 14.1 Zero Values

```javascript
// Cylinder = 0
- Single Vision: Allowed (sphere only)
- ADD/Progressive: Required
- CYL_KT/COMP_KT: Not allowed

// Sphere = 0
- Single Vision: Allowed
- CYL_KT: Allowed (pure cylinder)
- COMP_KT: Not typically used
```

### 14.2 Cross-Cylinder Prescriptions

When original and transposed both match:
- Combine all matches
- Sort by priority
- Return best match (highest priority)

### 14.3 Boundary Values

```javascript
// Range: "+3/+ ADD" means 0 to 3.0
- Sphere +0.00: ✓ Matches
- Sphere +3.00: ✓ Matches
- Sphere +3.25: ✗ Moves to "+4/+ ADD" range

// Range: "-2, 90" for CYL_KT
- Cylinder -0.25: ✓ Matches
- Cylinder -2.00: ✓ Matches
- Cylinder -2.25: ✗ Moves to "-3, 90" range
```

---

## 15. Implementation Checklist

When implementing this algorithm in another project:

- [ ] Implement `validateQuarterInterval()` function
- [ ] Implement `matchesRange()` with all format types
  - [ ] Single SPH format
  - [ ] "To" range format
  - [ ] ADD range format
- [ ] Implement `transposePrescription()` function
- [ ] Implement priority-based matching for single vision
- [ ] Implement `mapAxisForCylKT()` for axis standardization
- [ ] Implement `matchesCylKTRange()` for cylindrical matching
- [ ] Implement category determination functions
  - [ ] `getCompKTSphereRange()`
  - [ ] `getCompKTCylinderRange()`
- [ ] Implement `matchesCompKTRange()` for compound matching
- [ ] Implement priority sorting for COMP_KT
- [ ] Implement ADD power calculations
- [ ] Add comprehensive validation
- [ ] Test all edge cases

---

## Summary

This algorithm provides a comprehensive prescription matching system that:

1. **Validates** all input values are in 0.25 increments
2. **Categorizes** lenses into single vision, progressive, cylindrical, and compound types
3. **Matches** prescriptions against data ranges using specific logic per category
4. **Transposes** prescriptions when needed to find alternative matches
5. **Prioritizes** matches based on lens category and sign combinations
6. **Maps** axis values to standard angles for cylindrical lenses
7. **Calculates** ADD power relationships for progressive lenses
8. **Handles** edge cases and special prescription formats

The system ensures accurate lens selection by following optical principles and providing fallback options through transposition and priority-based searching.
