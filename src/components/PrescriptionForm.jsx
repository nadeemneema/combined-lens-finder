import React, { useState } from 'react';
import './PrescriptionForm.css';
import { matchPrescriptionData, getAvailableCoatings } from '../utils/prescriptionMatcher';

const PrescriptionForm = ({ powerType, onBack, onContinue }) => {
  const requiresAdd = powerType === 'progressive';
  const isProgressive = powerType === 'progressive';
  
  // State for toggling between bifocal and progressive after checking prices
  const [selectedLensType, setSelectedLensType] = useState('progressive'); // 'progressive' or 'bifocal'
  
  const [prescriptionData, setPrescriptionData] = useState({
    rightEye: requiresAdd ? {
      dv: { sph: '', cyl: '', axis: '' },
      nv: { sph: '', cyl: '', axis: '' },
      add: ''
    } : {
      sph: '',
      cyl: '',
      axis: ''
    },
    leftEye: requiresAdd ? {
      dv: { sph: '', cyl: '', axis: '' },
      nv: { sph: '', cyl: '', axis: '' },
      add: ''
    } : {
      sph: '',
      cyl: '',
      axis: ''
    }
  });

  const [matchedResults, setMatchedResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Generate SPH options from -20.00 to +20.00 in 0.25 steps
  const generateSphOptions = () => {
    const options = [{ value: '', label: 'Select SPH' }];
    for (let i = -20; i <= 20; i += 0.25) {
      const value = i.toFixed(2);
      const label = i >= 0 ? `+${value}` : value;
      options.push({ value, label });
    }
    return options;
  };

  // Generate CYL options from -6.00 to +6.00 in 0.25 steps
  const generateCylOptions = () => {
    const options = [{ value: '', label: 'Select CYL' }];
    for (let i = -6; i <= 6; i += 0.25) {
      const value = i.toFixed(2);
      const label = i >= 0 ? `+${value}` : value;
      options.push({ value, label });
    }
    return options;
  };

  // Generate AXIS options from 0 to 180 in 1-degree steps
  const generateAxisOptions = () => {
    const options = [{ value: '', label: 'Select AXIS' }];
    for (let i = 0; i <= 180; i++) {
      options.push({ value: i.toString(), label: `${i}°` });
    }
    return options;
  };

  // Generate ADD power options from +1.00 to +3.00 in 0.25 steps
  const generateAddOptions = () => {
    const options = [{ value: '', label: 'Select ADD' }];
    for (let i = 1; i <= 3; i += 0.25) {
      const value = i.toFixed(2);
      options.push({ value, label: `+${value}` });
    }
    return options;
  };

  // Calculate transposed prescription
  const transposeValues = (sph, cyl, axis) => {
    const sphNum = parseFloat(sph) || 0;
    const cylNum = parseFloat(cyl) || 0;
    const axisNum = parseInt(axis) || 0;
    
    if (cylNum === 0) return null; // No transposition needed if CYL is 0
    
    const newSph = sphNum + cylNum;
    const newCyl = -cylNum;
    let newAxis = axisNum + 90;
    if (newAxis > 180) newAxis -= 180;
    
    return { sph: newSph.toFixed(2), cyl: newCyl.toFixed(2), axis: newAxis };
  };

  // Calculate averaged coating prices when both eyes have results
  const getAveragedCoatings = (rightEyeData, leftEyeData) => {
    const rightCoatings = getAvailableCoatings(rightEyeData);
    const leftCoatings = getAvailableCoatings(leftEyeData);
    
    // Create a map of coating codes to calculate averages
    const coatingMap = {};
    
    // Add right eye coatings
    rightCoatings.forEach(coating => {
      coatingMap[coating.code] = {
        name: coating.name,
        code: coating.code,
        rightPrice: coating.price,
        leftPrice: null,
        count: 1
      };
    });
    
    // Add/update with left eye coatings
    leftCoatings.forEach(coating => {
      if (coatingMap[coating.code]) {
        coatingMap[coating.code].leftPrice = coating.price;
        coatingMap[coating.code].count = 2;
      } else {
        coatingMap[coating.code] = {
          name: coating.name,
          code: coating.code,
          rightPrice: null,
          leftPrice: coating.price,
          count: 1
        };
      }
    });
    
    // Calculate averages and format result
    return Object.values(coatingMap)
      .filter(coating => coating.count === 2) // Only include coatings present in both eyes
      .map(coating => ({
        name: coating.name,
        code: coating.code,
        price: Math.round((coating.rightPrice + coating.leftPrice) / 2)
      }));
  };

  const handleInputChange = (eye, field, value, subField = null) => {
    if (isProgressive && subField) {
      // For progressive: eye.subField.field (e.g., rightEye.dv.sph)
      setPrescriptionData(prev => {
        const updated = {
          ...prev,
          [eye]: {
            ...prev[eye],
            [subField]: {
              ...prev[eye][subField],
              [field]: value
            }
          }
        };

        // Auto-copy NV CYL and AXIS from DV
        if (subField === 'dv' && field === 'cyl') {
          // NV CYL is same as DV CYL
          updated[eye].nv.cyl = value;
        }
        if (subField === 'dv' && field === 'axis') {
          // NV AXIS is same as DV AXIS
          updated[eye].nv.axis = value;
        }

        // When NV SPH changes, calculate ADD automatically
        if (subField === 'nv' && field === 'sph') {
          const dvSph = parseFloat(updated[eye].dv.sph) || 0;
          const nvSph = parseFloat(value) || 0;
          if (updated[eye].dv.sph && value) {
            const calculatedAdd = nvSph - dvSph;
            updated[eye].add = calculatedAdd.toFixed(2);
          }
        }

        return updated;
      });
    } else if (requiresAdd && field === 'add') {
      // For progressive/bifocal ADD field
      setPrescriptionData(prev => {
        const updated = {
          ...prev,
          [eye]: {
            ...prev[eye],
            add: value
          }
        };

        // When ADD changes, calculate NV SPH automatically
        const dvSph = parseFloat(updated[eye].dv.sph) || 0;
        const addValue = parseFloat(value) || 0;
        if (updated[eye].dv.sph && value) {
          const calculatedNvSph = dvSph + addValue;
          updated[eye].nv.sph = calculatedNvSph.toFixed(2);
        }

        return updated;
      });
    } else {
      // For single vision
      setPrescriptionData(prev => ({
        ...prev,
        [eye]: {
          ...prev[eye],
          [field]: value
        }
      }));
    }
  };

  const handleCheckPrices = () => {
    // For progressive/bifocal, match against both types
    if (requiresAdd) {
      console.log('=== PROGRESSIVE/BIFOCAL MATCHING ===');
      console.log('Prescription Data:', prescriptionData);
      
      const bifocalResults = matchPrescriptionData(prescriptionData, 'bifocal');
      const progressiveResults = matchPrescriptionData(prescriptionData, 'progressive');
      
      console.log('Bifocal Results:', bifocalResults);
      console.log('Progressive Results:', progressiveResults);
      console.log('Bifocal Right Eye:', bifocalResults.rightEye);
      console.log('Progressive Right Eye:', progressiveResults.rightEye);
      
      setMatchedResults({
        bifocal: bifocalResults,
        progressive: progressiveResults
      });
    } else {
      // For single vision
      console.log('=== SINGLE VISION MATCHING ===');
      console.log('Prescription Data:', prescriptionData);
      const results = matchPrescriptionData(prescriptionData, powerType);
      console.log('Matched Results:', results);
      setMatchedResults(results);
    }
    setShowResults(true);
  };

  const handleClearAll = () => {
    setPrescriptionData({
      rightEye: requiresAdd ? {
        dv: { sph: '', cyl: '', axis: '' },
        nv: { sph: '', cyl: '', axis: '' },
        add: ''
      } : {
        sph: '',
        cyl: '',
        axis: ''
      },
      leftEye: requiresAdd ? {
        dv: { sph: '', cyl: '', axis: '' },
        nv: { sph: '', cyl: '', axis: '' },
        add: ''
      } : {
        sph: '',
        cyl: '',
        axis: ''
      }
    });
    setMatchedResults(null);
    setShowResults(false);
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue({ prescriptionData, matchedResults });
    }
  };

  const handleHelp = () => {
    alert('Call Nadeem\nPh No: 8861792967');
  };

  const isFormValid = () => {
    if (requiresAdd) {
      // For progressive: check if at least DV fields are filled and ADD is present
      const rightEyeHasData = (prescriptionData.rightEye.dv.sph !== '' || prescriptionData.rightEye.dv.cyl !== '') && prescriptionData.rightEye.add !== '';
      const leftEyeHasData = (prescriptionData.leftEye.dv.sph !== '' || prescriptionData.leftEye.dv.cyl !== '') && prescriptionData.leftEye.add !== '';
      return rightEyeHasData && leftEyeHasData;
    } else {
      // At least one eye should have either SPH or CYL value
      // Empty SPH is treated as 0
      const rightEyeHasData = prescriptionData.rightEye.sph !== '' || prescriptionData.rightEye.cyl !== '';
      const leftEyeHasData = prescriptionData.leftEye.sph !== '' || prescriptionData.leftEye.cyl !== '';
      return rightEyeHasData && leftEyeHasData;
    }
  };

  return (
    <div className="prescription-container">
      {/* Header */}
      <header className="header">
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="header-title">Add Lens Details</h1>
        <button className="help-button" onClick={handleHelp}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 19H11V17H13V19ZM15.07 11.25L14.17 12.17C13.45 12.9 13 13.5 13 15H11V14.5C11 13.4 11.45 12.4 12.17 11.67L13.41 10.41C13.78 10.05 14 9.55 14 9C14 7.9 13.1 7 12 7C10.9 7 10 7.9 10 9H8C8 6.79 9.79 5 12 5C14.21 5 16 6.79 16 9C16 9.88 15.64 10.68 15.07 11.25Z"/>
          </svg>
          <span>Help</span>
        </button>
      </header>

      {/* Stepper */}
      <div className="stepper">
        <div className="step completed">
          <div className="step-number">✓</div>
          <div className="step-label">Power Type</div>
          <div className="step-indicator active"></div>
        </div>
        <div className="step active">
          <div className="step-number">2</div>
          <div className="step-label">Add power & Get Price</div>
          <div className="step-indicator active"></div>
        </div>
        {/*
        <div className="step">
          <div className="step-number">3</div>
          <div className="step-label">Add Power</div>
        </div>
        */}
      </div>

      {/* Main Content */}
      <main className="prescription-content">
        <h2 className="section-title">
          {isProgressive ? 'Enter Progressive/Bifocal Details:' : 'Enter Prescription Details:'}
        </h2>
        
        {!requiresAdd ? (
          <>
            {/* Single Vision - Right Eye Section */}
            <div className="eye-section">
              <div className="eye-header">
                <h3 className="eye-title">Right Eye (OD)</h3>
              </div>
              
              <div className="input-grid">
                <div className="input-group">
                  <label htmlFor="right-sph" className="input-label">
                    SPH (Sphere)
                    <span className="input-hint">-20.00 to +20.00</span>
                  </label>
                  <select
                    id="right-sph"
                    className="input-field select-field"
                    value={prescriptionData.rightEye.sph}
                    onChange={(e) => handleInputChange('rightEye', 'sph', e.target.value)}
                  >
                    {generateSphOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="right-cyl" className="input-label">
                    CYL (Cylinder)
                    <span className="input-hint">-6.00 to +6.00</span>
                  </label>
                  <select
                    id="right-cyl"
                    className="input-field select-field"
                    value={prescriptionData.rightEye.cyl}
                    onChange={(e) => handleInputChange('rightEye', 'cyl', e.target.value)}
                  >
                    {generateCylOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="right-axis" className="input-label">
                    AXIS
                    <span className="input-hint">0° to 180°</span>
                  </label>
                  <select
                    id="right-axis"
                    className="input-field select-field"
                    value={prescriptionData.rightEye.axis}
                    onChange={(e) => handleInputChange('rightEye', 'axis', e.target.value)}
                  >
                    {generateAxisOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Single Vision - Left Eye Section */}
            <div className="eye-section">
              <div className="eye-header">
                <h3 className="eye-title">Left Eye (OS)</h3>
              </div>
              
              <div className="input-grid">
                <div className="input-group">
                  <label htmlFor="left-sph" className="input-label">
                    SPH (Sphere)
                    <span className="input-hint">-20.00 to +20.00</span>
                  </label>
                  <select
                    id="left-sph"
                    className="input-field select-field"
                    value={prescriptionData.leftEye.sph}
                    onChange={(e) => handleInputChange('leftEye', 'sph', e.target.value)}
                  >
                    {generateSphOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="left-cyl" className="input-label">
                    CYL (Cylinder)
                    <span className="input-hint">-6.00 to +6.00</span>
                  </label>
                  <select
                    id="left-cyl"
                    className="input-field select-field"
                    value={prescriptionData.leftEye.cyl}
                    onChange={(e) => handleInputChange('leftEye', 'cyl', e.target.value)}
                  >
                    {generateCylOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="left-axis" className="input-label">
                    AXIS
                    <span className="input-hint">0° to 180°</span>
                  </label>
                  <select
                    id="left-axis"
                    className="input-field select-field"
                    value={prescriptionData.leftEye.axis}
                    onChange={(e) => handleInputChange('leftEye', 'axis', e.target.value)}
                  >
                    {generateAxisOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Progressive - Right Eye Section */}
            <div className="eye-section">
              <div className="eye-header">
                <h3 className="eye-title">Right Eye (OD)</h3>
              </div>
              
              {/* DV Section */}
              <div className="vision-subsection">
                <h4 className="subsection-title">Distance Vision (DV)</h4>
                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="right-dv-sph" className="input-label">
                      SPH (Sphere)
                      <span className="input-hint">-20.00 to +20.00</span>
                    </label>
                    <select
                      id="right-dv-sph"
                      className="input-field select-field"
                      value={prescriptionData.rightEye.dv.sph}
                      onChange={(e) => handleInputChange('rightEye', 'sph', e.target.value, 'dv')}
                    >
                      {generateSphOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="right-dv-cyl" className="input-label">
                      CYL (Cylinder)
                      <span className="input-hint">-6.00 to +6.00</span>
                    </label>
                    <select
                      id="right-dv-cyl"
                      className="input-field select-field"
                      value={prescriptionData.rightEye.dv.cyl}
                      onChange={(e) => handleInputChange('rightEye', 'cyl', e.target.value, 'dv')}
                    >
                      {generateCylOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="right-dv-axis" className="input-label">
                      AXIS
                      <span className="input-hint">0° to 180°</span>
                    </label>
                    <select
                      id="right-dv-axis"
                      className="input-field select-field"
                      value={prescriptionData.rightEye.dv.axis}
                      onChange={(e) => handleInputChange('rightEye', 'axis', e.target.value, 'dv')}
                    >
                      {generateAxisOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* NV Section */}
              <div className="vision-subsection">
                <h4 className="subsection-title">Near Vision (NV)</h4>
                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="right-nv-sph" className="input-label">
                      SPH (Sphere)
                      <span className="input-hint">Auto: DV + ADD</span>
                    </label>
                    <select
                      id="right-nv-sph"
                      className="input-field select-field"
                      value={prescriptionData.rightEye.nv.sph}
                      onChange={(e) => handleInputChange('rightEye', 'sph', e.target.value, 'nv')}
                    >
                      {generateSphOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="right-nv-cyl" className="input-label">
                      CYL (Cylinder)
                      <span className="input-hint">Auto: Same as DV</span>
                    </label>
                    <select
                      id="right-nv-cyl"
                      className="input-field select-field"
                      value={prescriptionData.rightEye.nv.cyl}
                      disabled
                    >
                      {generateCylOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="right-nv-axis" className="input-label">
                      AXIS
                      <span className="input-hint">Auto: Same as DV</span>
                    </label>
                    <select
                      id="right-nv-axis"
                      className="input-field select-field"
                      value={prescriptionData.rightEye.nv.axis}
                      disabled
                    >
                      {generateAxisOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ADD Section */}
              <div className="vision-subsection">
                <h4 className="subsection-title">Addition Power (ADD)</h4>
                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="right-add" className="input-label">
                      ADD Power
                      <span className="input-hint">Auto: NV - DV</span>
                    </label>
                    <select
                      id="right-add"
                      className="input-field select-field"
                      value={prescriptionData.rightEye.add}
                      onChange={(e) => handleInputChange('rightEye', 'add', e.target.value)}
                    >
                      {generateAddOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Progressive - Left Eye Section */}
            <div className="eye-section">
              <div className="eye-header">
                <h3 className="eye-title">Left Eye (OS)</h3>
              </div>
              
              {/* DV Section */}
              <div className="vision-subsection">
                <h4 className="subsection-title">Distance Vision (DV)</h4>
                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="left-dv-sph" className="input-label">
                      SPH (Sphere)
                      <span className="input-hint">-20.00 to +20.00</span>
                    </label>
                    <select
                      id="left-dv-sph"
                      className="input-field select-field"
                      value={prescriptionData.leftEye.dv.sph}
                      onChange={(e) => handleInputChange('leftEye', 'sph', e.target.value, 'dv')}
                    >
                      {generateSphOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="left-dv-cyl" className="input-label">
                      CYL (Cylinder)
                      <span className="input-hint">-6.00 to +6.00</span>
                    </label>
                    <select
                      id="left-dv-cyl"
                      className="input-field select-field"
                      value={prescriptionData.leftEye.dv.cyl}
                      onChange={(e) => handleInputChange('leftEye', 'cyl', e.target.value, 'dv')}
                    >
                      {generateCylOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="left-dv-axis" className="input-label">
                      AXIS
                      <span className="input-hint">0° to 180°</span>
                    </label>
                    <select
                      id="left-dv-axis"
                      className="input-field select-field"
                      value={prescriptionData.leftEye.dv.axis}
                      onChange={(e) => handleInputChange('leftEye', 'axis', e.target.value, 'dv')}
                    >
                      {generateAxisOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* NV Section */}
              <div className="vision-subsection">
                <h4 className="subsection-title">Near Vision (NV)</h4>
                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="left-nv-sph" className="input-label">
                      SPH (Sphere)
                      <span className="input-hint">Auto: DV + ADD</span>
                    </label>
                    <select
                      id="left-nv-sph"
                      className="input-field select-field"
                      value={prescriptionData.leftEye.nv.sph}
                      onChange={(e) => handleInputChange('leftEye', 'sph', e.target.value, 'nv')}
                    >
                      {generateSphOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="left-nv-cyl" className="input-label">
                      CYL (Cylinder)
                      <span className="input-hint">Auto: Same as DV</span>
                    </label>
                    <select
                      id="left-nv-cyl"
                      className="input-field select-field"
                      value={prescriptionData.leftEye.nv.cyl}
                      disabled
                    >
                      {generateCylOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="left-nv-axis" className="input-label">
                      AXIS
                      <span className="input-hint">Auto: Same as DV</span>
                    </label>
                    <select
                      id="left-nv-axis"
                      className="input-field select-field"
                      value={prescriptionData.leftEye.nv.axis}
                      disabled
                    >
                      {generateAxisOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ADD Section */}
              <div className="vision-subsection">
                <h4 className="subsection-title">Addition Power (ADD)</h4>
                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="left-add" className="input-label">
                      ADD Power
                      <span className="input-hint">Auto: NV - DV</span>
                    </label>
                    <select
                      id="left-add"
                      className="input-field select-field"
                      value={prescriptionData.leftEye.add}
                      onChange={(e) => handleInputChange('leftEye', 'add', e.target.value)}
                    >
                      {generateAddOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info Box */}
        <div className="info-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="info-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <div className="info-text">
            <strong>Note:</strong> You can find these values on your prescription. SPH indicates nearsightedness (-) or farsightedness (+). CYL and AXIS correct astigmatism.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="check-button" 
            onClick={handleCheckPrices}
            disabled={!isFormValid()}
          >
            Check Available Options & Prices
          </button>
          
          <button 
            className="clear-button" 
            onClick={handleClearAll}
            disabled={!isFormValid() && !showResults}
          >
            Clear All
          </button>
        </div>

        {/* Lens Type Toggle - Show only for progressive/bifocal after checking prices */}
        {showResults && matchedResults && requiresAdd && (
          <div className="lens-type-toggle">
            <button
              className={`toggle-button ${selectedLensType === 'progressive' ? 'active' : ''}`}
              onClick={() => setSelectedLensType('progressive')}
            >
              Progressive
            </button>
            <button
              className={`toggle-button ${selectedLensType === 'bifocal' ? 'active' : ''}`}
              onClick={() => setSelectedLensType('bifocal')}
            >
              Bifocal
            </button>
          </div>
        )}

        {/* Results Section */}
        {showResults && matchedResults && (
          <div className="results-section">
            <h3 className="results-title">
              {requiresAdd ? `Available ${selectedLensType === 'progressive' ? 'Progressive' : 'Bifocal'} Lens Options` : 'Available Lens Options'}
            </h3>
            
            {/* For progressive/bifocal: Show combined results if both eyes have data */}
            {requiresAdd && matchedResults[selectedLensType]?.rightEye && matchedResults[selectedLensType]?.leftEye && 
             !matchedResults[selectedLensType].rightEye.error && !matchedResults[selectedLensType].leftEye.error &&
             matchedResults[selectedLensType].rightEye.range && matchedResults[selectedLensType].leftEye.range ? (
              <div className="eye-results">
                <h4 className="eye-results-title">Both Eyes - Combined Pricing</h4>
                <div className="results-content">
                  <div className="prescription-summary">
                    <span className="summary-label">Right Eye (OD):</span>
                    <span className="summary-value">
                      SPH: {matchedResults[selectedLensType].rightEye.prescription.sph} | 
                      CYL: {matchedResults[selectedLensType].rightEye.prescription.cyl} | 
                      AXIS: {matchedResults[selectedLensType].rightEye.prescription.axis}° | 
                      Range: {matchedResults[selectedLensType].rightEye.range}
                    </span>
                  </div>
                  <div className="prescription-summary">
                    <span className="summary-label">Left Eye (OS):</span>
                    <span className="summary-value">
                      SPH: {matchedResults[selectedLensType].leftEye.prescription.sph} | 
                      CYL: {matchedResults[selectedLensType].leftEye.prescription.cyl} | 
                      AXIS: {matchedResults[selectedLensType].leftEye.prescription.axis}° | 
                      Range: {matchedResults[selectedLensType].leftEye.range}
                    </span>
                  </div>
                  {getAveragedCoatings(matchedResults[selectedLensType].rightEye, matchedResults[selectedLensType].leftEye).length === 0 ? (
                    <div className="no-lens-warning">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="warning-icon">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      NO COMMON COATINGS AVAILABLE FOR BOTH EYES
                    </div>
                  ) : (
                    <div className="coatings-grid">
                      {getAveragedCoatings(matchedResults[selectedLensType].rightEye, matchedResults[selectedLensType].leftEye).map((coating) => (
                        <div key={coating.code} className="coating-card">
                          <div className="coating-name">{coating.name}</div>
                          <div className="coating-price">₹{coating.price}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : 
            /* For single vision: Show combined results if both eyes have data */
            !requiresAdd && matchedResults.rightEye && matchedResults.leftEye && 
             !matchedResults.rightEye.error && !matchedResults.leftEye.error &&
             matchedResults.rightEye.range && matchedResults.leftEye.range ? (
              <div className="eye-results">
                <h4 className="eye-results-title">Both Eyes - Combined Pricing</h4>
                <div className="results-content">
                  <div className="prescription-summary">
                    <span className="summary-label">Right Eye (OD):</span>
                    <span className="summary-value">
                      SPH: {matchedResults.rightEye.prescription.sph} | 
                      CYL: {matchedResults.rightEye.prescription.cyl} | 
                      AXIS: {matchedResults.rightEye.prescription.axis}° | 
                      Range: {matchedResults.rightEye.range}
                    </span>
                  </div>
                  <div className="prescription-summary">
                    <span className="summary-label">Left Eye (OS):</span>
                    <span className="summary-value">
                      SPH: {matchedResults.leftEye.prescription.sph} | 
                      CYL: {matchedResults.leftEye.prescription.cyl} | 
                      AXIS: {matchedResults.leftEye.prescription.axis}° | 
                      Range: {matchedResults.leftEye.range}
                    </span>
                  </div>
                  {getAveragedCoatings(matchedResults.rightEye, matchedResults.leftEye).length === 0 ? (
                    <div className="no-lens-warning">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="warning-icon">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      NO COMMON COATINGS AVAILABLE FOR BOTH EYES
                    </div>
                  ) : (
                    <div className="coatings-grid">
                      {getAveragedCoatings(matchedResults.rightEye, matchedResults.leftEye).map((coating) => (
                        <div key={coating.code} className="coating-card">
                          <div className="coating-name">{coating.name}</div>
                          <div className="coating-price">₹{coating.price}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
            {/* Right Eye Results */}
            {(requiresAdd ? matchedResults[selectedLensType]?.rightEye : matchedResults.rightEye) && (
              <div className="eye-results">
                <h4 className="eye-results-title">Right Eye (OD)</h4>
                <div className="results-content">
                  <div className="prescription-summary">
                    <span className="summary-label">Prescription:</span>
                    <span className="summary-value">
                      SPH: {(requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.sph} | 
                      CYL: {(requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.cyl} | 
                      AXIS: {(requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.axis}°
                    </span>
                  </div>
                  {transposeValues(
                    (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.sph,
                    (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.cyl,
                    (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.axis
                  ) && (
                    <div className="prescription-summary transposed">
                      <span className="summary-label">Transposed:</span>
                      <span className="summary-value">
                        SPH: {transposeValues(
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.sph,
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.cyl,
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.axis
                        ).sph} | 
                        CYL: {transposeValues(
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.sph,
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.cyl,
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.axis
                        ).cyl} | 
                        AXIS: {transposeValues(
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.sph,
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.cyl,
                          (requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).prescription.axis
                        ).axis}°
                      </span>
                    </div>
                  )}
                  {((requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).error || !(requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).range) ? (
                    <div className="no-lens-warning">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="warning-icon">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      NO LENS FOUND FOR THIS POWER
                    </div>
                  ) : (
                    <>
                      <div className="range-match">
                        <span className="match-label">Matched Range:</span>
                        <span className="match-value">{(requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).range}</span>
                      </div>
                      {getAvailableCoatings(requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).length === 0 ? (
                        <div className="no-lens-warning">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="warning-icon">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                          </svg>
                          NO LENS FOUND FOR THIS POWER
                        </div>
                      ) : (
                        <div className="coatings-grid">
                          {getAvailableCoatings(requiresAdd ? matchedResults[selectedLensType].rightEye : matchedResults.rightEye).map((coating) => (
                            <div key={coating.code} className="coating-card">
                              <div className="coating-name">{coating.name}</div>
                              <div className="coating-price">₹{coating.price}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Left Eye Results */}
            {(requiresAdd ? matchedResults[selectedLensType]?.leftEye : matchedResults.leftEye) && (
              <div className="eye-results">
                <h4 className="eye-results-title">Left Eye (OS)</h4>
                <div className="results-content">
                  <div className="prescription-summary">
                    <span className="summary-label">Prescription:</span>
                    <span className="summary-value">
                      SPH: {(requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.sph} | 
                      CYL: {(requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.cyl} | 
                      AXIS: {(requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.axis}°
                    </span>
                  </div>
                  {transposeValues(
                    (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.sph,
                    (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.cyl,
                    (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.axis
                  ) && (
                    <div className="prescription-summary transposed">
                      <span className="summary-label">Transposed:</span>
                      <span className="summary-value">
                        SPH: {transposeValues(
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.sph,
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.cyl,
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.axis
                        ).sph} | 
                        CYL: {transposeValues(
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.sph,
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.cyl,
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.axis
                        ).cyl} | 
                        AXIS: {transposeValues(
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.sph,
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.cyl,
                          (requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).prescription.axis
                        ).axis}°
                      </span>
                    </div>
                  )}
                  {((requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).error || !(requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).range) ? (
                    <div className="no-lens-warning">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="warning-icon">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      NO LENS FOUND FOR THIS POWER
                    </div>
                  ) : (
                    <>
                      <div className="range-match">
                        <span className="match-label">Matched Range:</span>
                        <span className="match-value">{(requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).range}</span>
                      </div>
                      {getAvailableCoatings(requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).length === 0 ? (
                        <div className="no-lens-warning">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="warning-icon">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                          </svg>
                          NO LENS FOUND FOR THIS POWER
                        </div>
                      ) : (
                        <div className="coatings-grid">
                          {getAvailableCoatings(requiresAdd ? matchedResults[selectedLensType].leftEye : matchedResults.leftEye).map((coating) => (
                            <div key={coating.code} className="coating-card">
                              <div className="coating-name">{coating.name}</div>
                              <div className="coating-price">₹{coating.price}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            </>
            )}

            {/* Continue Button (after results) */}
            {/*}
            <button className="continue-button" onClick={handleContinue}>
              Continue
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            */}
          </div>
        )}
      </main>
    </div>
  );
};

export default PrescriptionForm;
