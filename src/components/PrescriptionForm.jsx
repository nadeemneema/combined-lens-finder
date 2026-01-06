import React, { useState } from 'react';
import './PrescriptionForm.css';
import { matchPrescriptionData, getAvailableCoatings } from '../utils/prescriptionMatcher';
import framesData from '../data/frames.json';

const PrescriptionForm = ({ 
  powerType, 
  onBack, 
  onContinue, 
  initialView = 'frames', 
  frameSelection: externalFrameSelection, 
  onFrameSelectionChange, 
  onNavigateToFrames,
  configuringFrame: externalConfiguringFrame,
  frame1Data,
  frame2Data,
  onFrame1DataChange,
  onFrame2DataChange
}) => {
  const requiresAdd = powerType === 'progressive';
  const isProgressive = powerType === 'progressive';
  
  // State for toggling between bifocal and progressive after checking prices
  const [selectedLensType, setSelectedLensType] = useState('progressive'); // 'progressive' or 'bifocal'
  const [configuringFrame, setConfiguringFrame] = useState(externalConfiguringFrame || 'frame1'); // Track which frame is being configured
  
  // Get the current frame's prescription data if it exists
  const currentFrameData = configuringFrame === 'frame1' ? frame1Data : frame2Data;
  const existingPrescription = currentFrameData?.prescription;
  
  const [prescriptionData, setPrescriptionData] = useState(existingPrescription || {
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
  const [showFrameSelection, setShowFrameSelection] = useState(initialView === 'frames');
  const [showLensSelection, setShowLensSelection] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [frameSelection, setFrameSelection] = useState(externalFrameSelection || {
    frame1: '',
    frame2: ''
  });
  const [lensFilter, setLensFilter] = useState('all'); // 'all', 'bestsellers', 'work-friendly', 'high-power'
  const [selectedLens, setSelectedLens] = useState(frame1Data?.lens || null);
  const [selectedLensFrame2, setSelectedLensFrame2] = useState(frame2Data?.lens || null);
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [singleFrameChoice, setSingleFrameChoice] = useState(''); // 'frame1' or 'frame2'
  const [lensType, setLensType] = useState('progressive'); // 'progressive' or 'bifocal'

  // Frame hierarchy: red > brown > green > orange > pink
  const frameHierarchy = {
    'Red': 5,
    'Brown': 4,
    'Green': 3,
    'Orange': 2,
    'Pink': 1
  };

  // Function to get the higher priority frame
  const getHigherPriorityFrame = () => {
    const frame1Priority = frameHierarchy[frameSelection.frame1] || 0;
    const frame2Priority = frameHierarchy[frameSelection.frame2] || 0;
    
    if (frame1Priority >= frame2Priority) {
      return frameSelection.frame1;
    } else {
      return frameSelection.frame2;
    }
  };

  // Function to get the lower priority frame (for FREE display in BOGO)
  const getLowerPriorityFrame = () => {
    const frame1Priority = frameHierarchy[frameSelection.frame1] || 0;
    const frame2Priority = frameHierarchy[frameSelection.frame2] || 0;
    
    if (frame1Priority < frame2Priority) {
      return { color: frameSelection.frame1, label: 'Frame 1' };
    } else {
      return { color: frameSelection.frame2, label: 'Frame 2' };
    }
  };

  // Function to get the higher priority frame details
  const getHigherPriorityFrameDetails = () => {
    const frame1Priority = frameHierarchy[frameSelection.frame1] || 0;
    const frame2Priority = frameHierarchy[frameSelection.frame2] || 0;
    
    if (frame1Priority >= frame2Priority) {
      return { color: frameSelection.frame1, label: 'Frame 1' };
    } else {
      return { color: frameSelection.frame2, label: 'Frame 2' };
    }
  };

  // Get selected frame data based on priority
  const getSelectedFrameData = () => {
    const selectedColor = getHigherPriorityFrame();
    return framesData.frames.find(frame => frame.color === selectedColor);
  };

  // Check if high power is needed (SPH more than -4, i.e., -5, -6, etc.)
  const isHighPowerNeeded = () => {
    // Only check for single vision (with-power or single)
    if (powerType === 'progressive' || powerType === 'bifocal') return false;
    
    const rightSph = parseFloat(prescriptionData.rightEye.sph) || 0;
    const leftSph = parseFloat(prescriptionData.leftEye.sph) || 0;
    
    console.log('Checking high power:', { powerType, rightSph, leftSph, prescriptionData });
    
    // Check if SPH is more negative than -4 (i.e., -5, -6, -7, etc.)
    const isNeeded = rightSph < -4 || leftSph < -4;
    console.log('High power needed:', isNeeded);
    
    return isNeeded;
  };

  // Get lens options with high power variants if needed
  const getLensOptions = () => {
    const frameData = getSelectedFrameData();
    if (!frameData) return [];
    
    // Use progressive, bifocal, or regular lenses based on powerType and lensType
    let baseLensOptions;
    let useBifocal = false;
    
    if (powerType === 'progressive') {
      if (lensType === 'bifocal') {
        baseLensOptions = frameData.bifocalLensOptions || [];
        useBifocal = true;
      } else {
        // lensType === 'progressive' (default)
        baseLensOptions = frameData.progressiveLensOptions || [];
      }
    } else {
      // Single vision or other power types
      baseLensOptions = frameData.lensOptions || [];
    }
    
    let allOptions = [...baseLensOptions];
    
    // For bifocal lenses, don't create high power variants (bifocal already accounts for this)
    if (!useBifocal) {
      // Always create high power variants for filtering (progressive lenses only)
      const highPowerOptions = baseLensOptions.map(option => ({
        ...option,
        originalType: option.type,
        type: option.type,
        price: {
          ...option.price,
          current: option.price.current + 500,
          original: option.price.original + 500
        },
        isHighPower: true
      }));
      
      if (isHighPowerNeeded()) {
        // Add high power options to regular options
        allOptions = [...baseLensOptions, ...highPowerOptions];
      }
      
      // Filter based on selected filter
      if (lensFilter === 'high-power') {
        // Always show high power lenses with +500 prices when filter is clicked
        return highPowerOptions;
      } else if (lensFilter === 'work-friendly') {
        return allOptions.filter(option => 
          (option.type.includes('BLU-CUT') || option.type.includes('BLU-GREEN')) && !option.isHighPower
        );
      } else if (lensFilter === 'bestsellers') {
        return allOptions.filter(option => !option.isHighPower); // Show only non-high-power lenses for bestsellers
      }
    }
    
    return allOptions;
  };

  // Define functions before conditional render
  const handleHelp = () => {
    alert('Call Nadeem\nPh No: 8861792967');
  };

  const handleFrameChange = (frameNumber, value) => {
    const newSelection = {
      ...frameSelection,
      [frameNumber]: value
    };
    setFrameSelection(newSelection);
    // Sync with parent component if handler is provided
    if (onFrameSelectionChange) {
      onFrameSelectionChange(newSelection);
    }
  };

  const handleAddSecondFrame = () => {
    // Set that we're configuring frame 2
    setConfiguringFrame('frame2');
    // Reset cart and lens selection views
    setShowCart(false);
    setShowLensSelection(false);
    // Navigate back to frames step in App
    if (onNavigateToFrames) {
      onNavigateToFrames();
    }
  };

  const handleDeleteFrame = (frameNumber) => {
    const frameName = frameNumber === 'frame1' ? 'Frame 1' : 'Frame 2';
    const frameColor = frameNumber === 'frame1' ? frameSelection.frame1 : frameSelection.frame2;
    
    if (window.confirm(`Are you sure you want to delete ${frameName} (${frameColor}) from your cart?`)) {
      const newSelection = { ...frameSelection };
      newSelection[frameNumber] = '';
      setFrameSelection(newSelection);
      
      // Sync with parent
      if (onFrameSelectionChange) {
        onFrameSelectionChange(newSelection);
      }
      
      // Clear lens selection for the deleted frame
      if (frameNumber === 'frame1') {
        setSelectedLens(null);
        if (onFrame1DataChange) {
          onFrame1DataChange({ powerType: null, prescription: null, lens: null });
        }
      } else {
        setSelectedLensFrame2(null);
        if (onFrame2DataChange) {
          onFrame2DataChange({ powerType: null, prescription: null, lens: null });
        }
      }
      
      // If both frames are deleted, go back to frame selection
      if (!newSelection.frame1 && !newSelection.frame2) {
        setShowCart(false);
        setShowLensSelection(false);
        if (onNavigateToFrames) {
          setConfiguringFrame('frame1');
          onNavigateToFrames();
        }
      }
    }
  };

  const handleContinueToLensSelection = () => {
    // When on frame selection (step 1), navigate to power type (step 2)
    if (showFrameSelection) {
      onContinue();
      return;
    }
    
    // Don't auto-select frame 2 - just work with what's selected
    const frame1Selected = frameSelection.frame1;
    const frame2Selected = frameSelection.frame2;
    
    // Only frame 1 is selected - use single frame mode
    if (frame1Selected && !frame2Selected) {
      setSelectedCoupon('SINGLE');
      setSingleFrameChoice('frame1');
    } 
    // Only frame 2 is selected - use single frame mode
    else if (!frame1Selected && frame2Selected) {
      setSelectedCoupon('SINGLE');
      setSingleFrameChoice('frame2');
    } 
    // Both frames selected - use BOGO mode
    else if (frame1Selected && frame2Selected) {
      setSelectedCoupon('');
      setSingleFrameChoice('');
    }
    // No frames selected - default frame 1 to Pink
    else {
      setFrameSelection({
        frame1: 'Pink',
        frame2: ''
      });
      setSelectedCoupon('SINGLE');
      setSingleFrameChoice('frame1');
    }
    
    // Set default filter based on SPH power
    const rightSph = parseFloat(prescriptionData.rightEye.sph) || 0;
    const leftSph = parseFloat(prescriptionData.leftEye.sph) || 0;
    const needsHighPower = rightSph < -4 || leftSph < -4;
    
    if (needsHighPower) {
      setLensFilter('high-power');
    } else {
      setLensFilter('bestsellers');
    }
    
    setShowLensSelection(true);
  };

  const handleLensSelection = (lensOption) => {
    // Store lens selection for the frame being configured
    if (configuringFrame === 'frame1') {
      setSelectedLens(lensOption);
      if (onFrame1DataChange) {
        onFrame1DataChange(prev => ({ ...prev, lens: lensOption }));
      }
    } else {
      setSelectedLensFrame2(lensOption);
      if (onFrame2DataChange) {
        onFrame2DataChange(prev => ({ ...prev, lens: lensOption }));
      }
    }
    console.log(`Selected lens for ${configuringFrame}:`, lensOption);
    
    // Navigate to cart page
    setShowCart(true);
  };

  const handleCouponChange = (e) => {
    const coupon = e.target.value;
    setSelectedCoupon(coupon);
    
    if (coupon === 'SINGLE') {
      // Automatically detect which frame exists
      if (frameSelection.frame1 && !frameSelection.frame2) {
        setSingleFrameChoice('frame1');
      } else if (!frameSelection.frame1 && frameSelection.frame2) {
        setSingleFrameChoice('frame2');
      }
    } else {
      // Reset to BOGO mode
      setSingleFrameChoice('');
    }
  };

  const handleSingleFrameSelection = (frameChoice) => {
    setSingleFrameChoice(frameChoice);
    setShowFrameModal(false);
  };

  // If showing cart page, render that instead
  if (showCart) {
    const isSingleMode = selectedCoupon === 'SINGLE' && singleFrameChoice;
    
    // Calculate Frame 1 price
    let frame1Price = 0;
    let frame1Data_cart = null;
    if (frameSelection.frame1 && selectedLens) {
      const frame1FrameData = framesData.frames.find(frame => frame.color === frameSelection.frame1);
      // Check lensOptions, bifocalLensOptions, and progressiveLensOptions
      let frame1LensOption = frame1FrameData?.lensOptions.find(option => option.type === selectedLens?.type);
      if (!frame1LensOption) {
        frame1LensOption = frame1FrameData?.bifocalLensOptions?.find(option => option.type === selectedLens?.type);
      }
      if (!frame1LensOption) {
        frame1LensOption = frame1FrameData?.progressiveLensOptions?.find(option => option.type === selectedLens?.type);
      }
      if (frame1LensOption) {
        frame1Price = selectedLens?.isHighPower ? frame1LensOption.price.current + 500 : frame1LensOption.price.current;
      }
      frame1Data_cart = frame1FrameData;
    }
    
    // Calculate Frame 2 price
    let frame2Price = 0;
    let frame2Data_cart = null;
    if (frameSelection.frame2 && selectedLensFrame2) {
      const frame2FrameData = framesData.frames.find(frame => frame.color === frameSelection.frame2);
      // Check lensOptions, bifocalLensOptions, and progressiveLensOptions
      let frame2LensOption = frame2FrameData?.lensOptions.find(option => option.type === selectedLensFrame2?.type);
      if (!frame2LensOption) {
        frame2LensOption = frame2FrameData?.bifocalLensOptions?.find(option => option.type === selectedLensFrame2?.type);
      }
      if (!frame2LensOption) {
        frame2LensOption = frame2FrameData?.progressiveLensOptions?.find(option => option.type === selectedLensFrame2?.type);
      }
      if (frame2LensOption) {
        frame2Price = selectedLensFrame2?.isHighPower ? frame2LensOption.price.current + 500 : frame2LensOption.price.current;
      }
      frame2Data_cart = frame2FrameData;
    }
    
    // Get the correct frame data based on mode
    let selectedFrameData;
    
    if (isSingleMode) {
      // In single mode, get data for the specifically selected frame
      selectedFrameData = singleFrameChoice === 'frame1' ? frame1Data_cart : frame2Data_cart;
    } else {
      // In BOGO mode, use higher priced frame for membership charges
      selectedFrameData = frame1Price >= frame2Price ? frame1Data_cart : frame2Data_cart;
    }
    
    // Calculate prices based on mode
    let higherPrice, membershipCharges, totalItemPrice, totalDiscount, totalPayable;
    
    if (isSingleMode) {
      // Single frame mode - with tiered discount
      const originalPrice = singleFrameChoice === 'frame1' ? frame1Price : frame2Price;
      
      // Tiered discount based on original price
      let discountAmount = 0;
      if (originalPrice < 3000) {
        discountAmount = 500;
      } else if (originalPrice < 5000) {
        discountAmount = 1000;
      } else {
        discountAmount = 2000;
      }
      
      higherPrice = originalPrice - discountAmount;
      membershipCharges = selectedCoupon === 'FREEMEMBERSHIP' ? 0 : (selectedFrameData?.membershipCharges || 200);
      totalItemPrice = originalPrice;
      totalDiscount = discountAmount;
      totalPayable = higherPrice + membershipCharges;
    } else {
      // BOGO mode - charge for higher priced frame, lower is FREE
      higherPrice = Math.max(frame1Price, frame2Price);
      const lowerPrice = Math.min(frame1Price, frame2Price);
      membershipCharges = selectedCoupon === 'FREEMEMBERSHIP' ? 0 : (selectedFrameData?.membershipCharges || 200);
      totalItemPrice = frame1Price + frame2Price;
      totalDiscount = lowerPrice; // The lower priced frame is the discount
      totalPayable = higherPrice + membershipCharges;
    }

    return (
      <div className="prescription-form">
        {/* Header */}
        <header className="header">
          <button className="back-button" onClick={() => setShowCart(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="header-title">Cart Details</h1>
          <button className="help-button" onClick={handleHelp}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 19H11V17H13V19ZM15.07 11.25L14.17 12.17C13.45 12.9 13 13.5 13 15H11V14.5C11 13.4 11.45 12.4 12.17 11.67L13.41 10.41C13.78 10.05 14 9.55 14 9C14 7.9 13.1 7 12 7C10.9 7 10 7.9 10 9H8C8 6.79 9.79 5 12 5C14.21 5 16 6.79 16 9C16 9.88 15.64 10.68 15.07 11.25Z"/>
            </svg>
            <span>Help</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="main-content cart-page">
          {/* In single mode or when only frame1 is selected without coupon, show frame 1 */}
          {((isSingleMode && singleFrameChoice === 'frame1') || (!isSingleMode && frameSelection.frame1 && !frameSelection.frame2)) && (
            <div className="cart-item">
              <button 
                className="delete-frame-btn" 
                onClick={() => handleDeleteFrame('frame1')}
                title="Delete Frame 1"
              >
                ×
              </button>
              <div className="cart-item-image">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="#1e293b">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </div>
              <div className="cart-item-details">
                <h3 className="cart-item-title">Frame 1 - {frameSelection.frame1}</h3>
                <p className="cart-item-size"></p>
                <div className="cart-item-lens">
                  <span className="lens-type-label">{selectedLens?.type}</span>
                  <p className="lens-description"></p>
                </div>
                <div className="cart-item-power"></div>
                <div className="cart-item-footer">
                  <span className="bestseller-badge">BestSeller ⚡</span>
                  <div className="cart-item-price">
                    <span className="price-label">Frame + Lens</span>
                    <span className="price-value">₹{isSingleMode ? higherPrice : frame1Price}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add second frame button - show only when Frame 1 is selected and Frame 2 is not */}
          {((isSingleMode && singleFrameChoice === 'frame1') || (!isSingleMode && frameSelection.frame1 && !frameSelection.frame2)) && (
            <button className="add-second-frame-btn" onClick={handleAddSecondFrame}>
              ✨ Add second FREE Frame
            </button>
          )}

          {/* In single mode, show frame2 if selected */}
          {((isSingleMode && singleFrameChoice === 'frame2') || (!isSingleMode && !frameSelection.frame1 && frameSelection.frame2)) && (
            <div className="cart-item">
              <button 
                className="delete-frame-btn" 
                onClick={() => handleDeleteFrame('frame2')}
                title="Delete Frame 2"
              >
                ×
              </button>
              <div className="cart-item-image">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="#1e293b">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </div>
              <div className="cart-item-details">
                <h3 className="cart-item-title">Frame 2 - {frameSelection.frame2}</h3>
                <p className="cart-item-size"></p>
                <div className="cart-item-lens">
                  <span className="lens-type-label">{(selectedLensFrame2 || selectedLens)?.type}</span>
                  <p className="lens-description"></p>
                </div>
                <div className="cart-item-power"></div>
                <div className="cart-item-footer">
                  <span className="bestseller-badge">BestSeller ⚡</span>
                  <div className="cart-item-price">
                    <span className="price-label">Frame + Lens</span>
                    <span className="price-value">₹{isSingleMode ? higherPrice : frame2Price}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* In BOGO mode, show both frames - higher priced one charged, lower priced one FREE */}
          {!isSingleMode && frameSelection.frame1 && frameSelection.frame2 && (
            <>
              {/* Frame 1 */}
              <div className="cart-item">
                <button 
                  className="delete-frame-btn" 
                  onClick={() => handleDeleteFrame('frame1')}
                  title="Delete Frame 1"
                >
                  ×
                </button>
                <div className="cart-item-image">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="#1e293b">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                </div>
                <div className="cart-item-details">
                  <h3 className="cart-item-title">Frame 1 - {frameSelection.frame1}</h3>
                  <p className="cart-item-size"></p>
                  <div className="cart-item-lens">
                    <span className="lens-type-label">{selectedLens?.type}</span>
                    <p className="lens-description"></p>
                  </div>
                  <div className="cart-item-power"></div>
                  <div className="cart-item-footer">
                    <span className="bestseller-badge">BestSeller ⚡</span>
                    <div className="cart-item-price">
                      <span className="price-label">Frame + Lens</span>
                      {frame1Price >= frame2Price ? (
                        <span className="price-value">₹{frame1Price}</span>
                      ) : (
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span className="price-original-small">₹{frame1Price}</span>
                          <span className="price-free">FREE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Frame 2 */}
              <div className="cart-item">
                <button 
                  className="delete-frame-btn" 
                  onClick={() => handleDeleteFrame('frame2')}
                  title="Delete Frame 2"
                >
                  ×
                </button>
                <div className="cart-item-image">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="#1e293b">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                </div>
                <div className="cart-item-details">
                  <h3 className="cart-item-title">Frame 2 - {frameSelection.frame2}</h3>
                  <p className="cart-item-size"></p>
                  <div className="cart-item-lens">
                    <span className="lens-type-label">{selectedLensFrame2?.type}</span>
                    <p className="lens-description"></p>
                  </div>
                  <div className="cart-item-power"></div>
                  <div className="cart-item-footer">
                    <span className="bestseller-badge">BestSeller ⚡</span>
                    <div className="cart-item-price">
                      <span className="price-label">Frame + Lens</span>
                      {frame2Price > frame1Price ? (
                        <span className="price-value">₹{frame2Price}</span>
                      ) : (
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span className="price-original-small">₹{frame2Price}</span>
                          <span className="price-free">FREE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Neema Prime Membership Charges */}
          <div className="cart-item membership-item">
            <div className="cart-item-image">
              <div style={{background: '#1e293b', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <span style={{color: '#fbbf24', fontSize: '24px', fontWeight: 'bold'}}>N</span>
              </div>
            </div>
            <div className="cart-item-details">
              <h3 className="cart-item-title" style={{color: '#b8860b'}}>Neema Prime Membership Charges</h3>
              <a href="#" className="view-benefits-link">View benefits</a>
              <div className="cart-item-footer" style={{marginTop: '1rem', paddingTop: '12px', borderTop: '1px solid #e2e8f0'}}>
                <div></div>
                <div className="cart-item-price">
                  {selectedCoupon === 'FREEMEMBERSHIP' ? (
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span style={{textDecoration: 'line-through', color: '#94a3b8', fontSize: '14px'}}>₹{selectedFrameData?.membershipCharges || 200}</span>
                      <span className="price-value" style={{color: '#10b981'}}>FREE</span>
                    </div>
                  ) : (
                    <span className="price-value">₹{membershipCharges}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coupon Code Section */}
          <div className="coupon-section">
            <label htmlFor="coupon-code" className="coupon-label">Apply Coupon Code</label>
            <select 
              id="coupon-code" 
              className="coupon-dropdown"
              value={selectedCoupon}
              onChange={handleCouponChange}
            >
              <option value="">Select Coupon</option>
              {/* Only show SINGLE coupon if there's exactly one frame */}
              {((frameSelection.frame1 && !frameSelection.frame2) || (!frameSelection.frame1 && frameSelection.frame2)) && (
                <option value="SINGLE">For SINGLE Frame</option>
              )}
              <option value="FREEMEMBERSHIP">FREE Membership</option>
            </select>
            {selectedCoupon && (
              <button 
                className="remove-coupon-btn"
                onClick={() => {
                  // Store current coupon type before removing
                  const wasSingleCoupon = selectedCoupon === 'SINGLE';
                  
                  // Remove the coupon
                  setSelectedCoupon('');
                  
                  // If it was a SINGLE coupon, keep the frame selection as is (single frame mode)
                  // Don't change singleFrameChoice - just remove discount
                  if (!wasSingleCoupon) {
                    // For other coupons like FREEMEMBERSHIP, can reset single frame choice
                    const frame1Exists = frameSelection.frame1;
                    const frame2Exists = frameSelection.frame2;
                    
                    if (frame1Exists && !frame2Exists) {
                      setSingleFrameChoice('frame1');
                    } else if (!frame1Exists && frame2Exists) {
                      setSingleFrameChoice('frame2');
                    } else {
                      setSingleFrameChoice('');
                    }
                  }
                  // If it was SINGLE coupon, singleFrameChoice stays as is
                }}
              >
                Remove Coupon Code
              </button>
            )}
          </div>

          {/* Frame Selection Modal */}


          {/* Bill Details */}
          <div className="bill-details">
            <h2 className="bill-details-title">Bill Details</h2>
            <div className="bill-row">
              <span>Total item price</span>
              <span>₹{totalItemPrice}</span>
            </div>
            <div className="bill-row">
              <span>Total discount</span>
              <span style={{color: '#3b82f6'}}>-₹{totalDiscount}</span>
            </div>
            <div className="bill-row total-row">
              <span style={{fontWeight: 'bold', fontSize: '18px'}}>Total payable</span>
              <span style={{fontWeight: 'bold', fontSize: '20px'}}>₹{totalPayable}</span>
            </div>
          </div>

          {/* Proceed Button */}
          <button className="proceed-button">
            Login to proceed
          </button>
        </main>
      </div>
    );
  }

  // If showing lens selection page, render that instead
  if (showLensSelection) {
    return (
      <div className="prescription-form">
        {/* Header */}
        <header className="header">
          <button className="back-button" onClick={() => setShowLensSelection(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="header-title">
            Available Lenses with Prices
            {frameSelection.frame1 && frameSelection.frame2 && (
              <span style={{fontSize: '14px', fontWeight: 'normal', marginLeft: '8px', color: '#64748b'}}>
                (Configuring {configuringFrame === 'frame1' ? 'Frame 1' : 'Frame 2'})
              </span>
            )}
          </h1>
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
            <div className="step-label">Select Frames</div>
            <div className="step-indicator active"></div>
          </div>
          <div className="step completed">
            <div className="step-number">✓</div>
            <div className="step-label">Power Type</div>
            <div className="step-indicator active"></div>
          </div>
          <div className="step completed">
            <div className="step-number">✓</div>
            <div className="step-label">Add Prescription</div>
            <div className="step-indicator active"></div>
          </div>
          <div className="step active">
            <div className="step-number">4</div>
            <div className="step-label">Lenses</div>
          </div>
        </div>

        {/* Main Content */}
        <main className="main-content lens-selection-page">
          <h2 className="lens-page-title">Choose your Lens:</h2>
          
          {/* Display Selected Frame */}
          {configuringFrame === 'frame1' && frameSelection.frame1 && (
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{fontSize: '20px'}}>
                {frameSelection.frame1 === 'Pink' ? '🩷' :
                 frameSelection.frame1 === 'Red' ? '🔴' :
                 frameSelection.frame1 === 'Orange' ? '🟠' :
                 frameSelection.frame1 === 'Green' ? '🟢' :
                 frameSelection.frame1 === 'Brown' ? '🟤' : '🔵'}
              </span>
              <span style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>
                Frame 1 - {frameSelection.frame1}
              </span>
            </div>
          )}
          
          {configuringFrame === 'frame2' && frameSelection.frame2 && (
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{fontSize: '20px'}}>
                {frameSelection.frame2 === 'Pink' ? '🩷' :
                 frameSelection.frame2 === 'Red' ? '🔴' :
                 frameSelection.frame2 === 'Orange' ? '🟠' :
                 frameSelection.frame2 === 'Green' ? '🟢' :
                 frameSelection.frame2 === 'Brown' ? '🟤' : '🔵'}
              </span>
              <span style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>
                Frame 2 - {frameSelection.frame2}
              </span>
            </div>
          )}
          
          {/* Debug info - temporary */}
          <div style={{background: '#f0f0f0', padding: '10px', margin: '10px 0', fontSize: '12px'}}>
            <strong>Debug Info:</strong><br/>
            PowerType: {powerType}<br/>
            Right SPH: {prescriptionData.rightEye.sph}<br/>
            Left SPH: {prescriptionData.leftEye.sph}<br/>
            Is High Power Needed: {isHighPowerNeeded() ? 'YES' : 'NO'}
          </div>
          
          {/* Lens Type Toggle - Only show for Progressive/Bifocal power type */}
          {(powerType === 'progressive') && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
              gap: '0'
            }}>
              <button
                onClick={() => setLensType('progressive')}
                style={{
                  padding: '12px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: lensType === 'progressive' ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                  background: lensType === 'progressive' ? '#3b82f6' : '#ffffff',
                  color: lensType === 'progressive' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRadius: '8px 0 0 8px',
                  borderRight: 'none'
                }}
              >
                Progressive
              </button>
              <button
                onClick={() => setLensType('bifocal')}
                style={{
                  padding: '12px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: lensType === 'bifocal' ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                  background: lensType === 'bifocal' ? '#3b82f6' : '#ffffff',
                  color: lensType === 'bifocal' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRadius: '0 8px 8px 0',
                  borderLeft: 'none'
                }}
              >
                Bifocal
              </button>
            </div>
          )}
          
          {/* Filter Buttons */}
          <div className="lens-filters">
            <button 
              className={`filter-btn ${lensFilter === 'bestsellers' ? 'active' : ''}`}
              onClick={() => setLensFilter('bestsellers')}
            >
              <span className="filter-icon">⭐</span>
              Bestsellers
            </button>
            <button 
              className={`filter-btn ${lensFilter === 'work-friendly' ? 'active' : ''}`}
              onClick={() => setLensFilter('work-friendly')}
            >
              <span className="filter-icon">💻</span>
              Work Friendly
            </button>
            {isHighPowerNeeded() && (
              <button 
                className={`filter-btn ${lensFilter === 'high-power' ? 'active' : ''}`}
                onClick={() => setLensFilter('high-power')}
              >
                <span className="filter-icon">👓</span>
                High Power
              </button>
            )}
          </div>

          {/* Lens Cards - Dynamically render based on selected frame */}
          <div className="lens-cards">
            {getLensOptions().map((lensOption, index) => {
              const isPremium = lensOption.type.toLowerCase().includes('premium') || lensOption.type.toLowerCase().includes('wide corridor');
              return (
              <div 
                key={index} 
                className={`lens-card ${selectedLens?.type === lensOption.type && selectedLens?.isHighPower === lensOption.isHighPower ? 'selected' : ''} ${isPremium ? 'premium-card' : ''}`}
                onClick={() => handleLensSelection(lensOption)}
                style={{
                  cursor: 'pointer',
                  ...(isPremium && {
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
                    position: 'relative'
                  })
                }}
              >
                {isPremium && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{fontSize: '14px'}}>👑</span>
                    PREMIUM
                  </div>
                )}
                <div className="lens-card-header">
                  <div>
                    {lensOption.type === 'BLU-CUT/BLU-GREEN' && !lensOption.isHighPower && (
                      <span className="lens-badge">Screen Friendly</span>
                    )}
                    {lensOption.type === 'BLU-CUT PREMIUM/NVG' && !lensOption.isHighPower && (
                      <span className="lens-badge premium">Designed in Italy</span>
                    )}
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                      <h3 className="lens-card-title" style={isPremium ? {color: '#92400e', fontWeight: '700'} : {}}>{lensOption.type}</h3>
                      {lensOption.isHighPower && (
                        <>
                          <span className="lens-badge high-power">HIGH POWER</span>
                          <span style={{fontSize: '14px', color: '#64748b', fontWeight: '500'}}>Ultra Thin lens</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button className="lens-detail-arrow" style={isPremium ? {color: '#f59e0b'} : {}}>›</button>
                </div>
                <div className="lens-card-content">
                  <div className="lens-features">
                    {lensOption.features.map((feature, idx) => (
                      <div key={idx} className="lens-feature">
                        <span className="feature-icon">
                          {feature.includes('thickness') ? '⚡' :
                           feature.includes('Blue-Block') ? '💻' :
                           feature.includes('anti-glare') || feature.includes('UV') ? '🛡️' :
                           feature.includes('Smudge') ? '✨' :
                           feature.includes('Water') ? '💧' :
                           feature.includes('UV protection') ? '☀️' : '⚡'}
                        </span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lens-card-footer">
                  <div className="warranty-info">
                    <span className="warranty-icon">🛡️</span>
                    <span>{lensOption.warranty}</span>
                  </div>
                  <div className="price-info">
                    <span className="price-label" style={isPremium ? {color: '#92400e'} : {}}>Frame + Lens</span>
                    <div className="price-container">
                      <span className="price-current" style={isPremium ? {color: '#b45309', fontWeight: '700', fontSize: '22px'} : {}}>₹{lensOption.price.current}</span>
                      <span className="price-original" style={isPremium ? {color: '#78716c'} : {}}>₹{lensOption.price.original}</span>
                    </div>
                    <span className="price-note" style={isPremium ? {color: '#92400e'} : {}}>For {lensOption.price.pairs} pairs</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {/* Power Range Info */}
          <div className="power-range-info">
            <p>For Power Range: Sph {getSelectedFrameData()?.powerRange.sph.min}/+{getSelectedFrameData()?.powerRange.sph.max} & Cyl {getSelectedFrameData()?.powerRange.cyl.min}/+{getSelectedFrameData()?.powerRange.cyl.max}</p>
            <p className="membership-charges">Membership Charges: ₹{getSelectedFrameData()?.membershipCharges}</p>
          </div>
        </main>
      </div>
    );
  }

  // If showing frame selection page, render that instead
  if (showFrameSelection) {
    return (
      <div className="prescription-form">
        {/* Header */}
        <header className="header">
          <button className="back-button" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="header-title">
            Select Frames
            {configuringFrame === 'frame2' && (
              <span style={{fontSize: '14px', fontWeight: 'normal', marginLeft: '8px', color: '#64748b'}}>
                (Configuring Frame 2)
              </span>
            )}
          </h1>
          <button className="help-button" onClick={handleHelp}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 19H11V17H13V19ZM15.07 11.25L14.17 12.17C13.45 12.9 13 13.5 13 15H11V14.5C11 13.4 11.45 12.4 12.17 11.67L13.41 10.41C13.78 10.05 14 9.55 14 9C14 7.9 13.1 7 12 7C10.9 7 10 7.9 10 9H8C8 6.79 9.79 5 12 5C14.21 5 16 6.79 16 9C16 9.88 15.64 10.68 15.07 11.25Z"/>
            </svg>
            <span>Help</span>
          </button>
        </header>

        {/* Stepper */}
        <div className="stepper">
          <div className="step active">
            <div className="step-number">1</div>
            <div className="step-label">Select Frames</div>
            <div className="step-indicator active"></div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-label">Power Type</div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-label">Add Prescription</div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-label">Lenses</div>
          </div>
        </div>

        {/* Main Content */}
        <main className="main-content">
          <div className="frame-selection-section">
            <h3 className="frame-selection-title">Select Frames</h3>
            
            <div className="frame-inputs">
              {/* Show Frame 1 only if configuring Frame 1 OR if Frame 2 is being configured but Frame 1 doesn't exist yet */}
              {(configuringFrame === 'frame1' || !frameSelection.frame1) && (
                <div className="frame-input-group">
                  <label htmlFor="frame1" className="input-label">Frame 1</label>
                  <select
                    id="frame1"
                    className="input-field select-field"
                    value={frameSelection.frame1}
                    onChange={(e) => handleFrameChange('frame1', e.target.value)}
                  >
                    <option value="">Select Color</option>
                    <option value="Pink">Pink</option>
                    <option value="Orange">Orange</option>
                    <option value="Green">Green</option>
                    <option value="Brown">Brown</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
              )}
              
              {/* Show Frame 2 only when configuring Frame 2 (after clicking "Add second FREE Frame") */}
              {configuringFrame === 'frame2' && frameSelection.frame1 && (
                <div className="frame-input-group">
                  <label htmlFor="frame2" className="input-label">Frame 2 (Optional - FREE with BOGO)</label>
                  <select
                    id="frame2"
                    className="input-field select-field"
                    value={frameSelection.frame2}
                    onChange={(e) => handleFrameChange('frame2', e.target.value)}
                  >
                    <option value="">Select Color</option>
                    <option value="Pink">Pink</option>
                    <option value="Orange">Orange</option>
                    <option value="Green">Green</option>
                    <option value="Brown">Brown</option>
                    <option value="Red">Red</option>
                    <option value="Blue">Blue</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="action-buttons">
              <button 
                className="check-button" 
                onClick={handleContinueToLensSelection}
                disabled={!frameSelection.frame1}
              >
                {frameSelection.frame1 && !frameSelection.frame2 ? 'Continue' : frameSelection.frame2 ? 'Continue with Both Frames' : 'Select Frame 1 to Continue'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }


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
    setShowFrameSelection(false);
    setFrameSelection({ frame1: '', frame2: '' });
  };

  const handleContinueToFrames = () => {
    handleContinueToLensSelection();
  };

  const handleSkip = () => {
    // Set all prescription values to zero/empty
    const emptyPrescription = requiresAdd ? {
      rightEye: {
        dv: { sph: '0.00', cyl: '0.00', axis: '0' },
        nv: { sph: '0.00', cyl: '0.00', axis: '0' },
        add: '0.00'
      },
      leftEye: {
        dv: { sph: '0.00', cyl: '0.00', axis: '0' },
        nv: { sph: '0.00', cyl: '0.00', axis: '0' },
        add: '0.00'
      }
    } : {
      rightEye: { sph: '0.00', cyl: '0.00', axis: '0' },
      leftEye: { sph: '0.00', cyl: '0.00', axis: '0' }
    };
    
    setPrescriptionData(emptyPrescription);
    
    // Bypass prescription logic entirely - force standard lens options
    setLensFilter('bestsellers');
    setShowLensSelection(true);
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue({ prescriptionData, matchedResults });
    }
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
        <h1 className="header-title">
          Add Prescription Details
          {configuringFrame === 'frame2' && (
            <span style={{fontSize: '14px', fontWeight: 'normal', marginLeft: '8px', color: '#64748b'}}>
              (Configuring Frame 2)
            </span>
          )}
        </h1>
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
          <div className="step-label">Select Frames</div>
          <div className="step-indicator active"></div>
        </div>
        <div className="step completed">
          <div className="step-number">✓</div>
          <div className="step-label">Power Type</div>
          <div className="step-indicator active"></div>
        </div>
        <div className="step active">
          <div className="step-number">3</div>
          <div className="step-label">Add Prescription</div>
          <div className="step-indicator active"></div>
        </div>
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-label">Lenses</div>
        </div>
      </div>

      {/* Main Content */}
      <main className="prescription-content">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px'}}>
          <h2 className="section-title" style={{margin: 0}}>
            {isProgressive ? 'Enter Progressive/Bifocal Details:' : 'Enter Prescription Details:'}
          </h2>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); handleSkip(); }}
            style={{color: '#000000', textDecoration: 'underline', fontSize: '14px', fontWeight: '500'}}
          >
            Skip - Continue Without Power
          </a>
        </div>
        
        {/* Display Selected Frame */}
        {configuringFrame === 'frame1' && frameSelection.frame1 && (
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{fontSize: '20px'}}>
              {frameSelection.frame1 === 'Pink' ? '🩷' :
               frameSelection.frame1 === 'Red' ? '🔴' :
               frameSelection.frame1 === 'Orange' ? '🟠' :
               frameSelection.frame1 === 'Green' ? '🟢' :
               frameSelection.frame1 === 'Brown' ? '🟤' : '🔵'}
            </span>
            <span style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>
              Frame 1 - {frameSelection.frame1}
            </span>
          </div>
        )}
        
        {configuringFrame === 'frame2' && frameSelection.frame2 && (
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{fontSize: '20px'}}>
              {frameSelection.frame2 === 'Pink' ? '🩷' :
               frameSelection.frame2 === 'Red' ? '🔴' :
               frameSelection.frame2 === 'Orange' ? '🟠' :
               frameSelection.frame2 === 'Green' ? '🟢' :
               frameSelection.frame2 === 'Brown' ? '🟤' : '🔵'}
            </span>
            <span style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>
              Frame 2 - {frameSelection.frame2}
            </span>
          </div>
        )}
        
        {!requiresAdd ? (
          <>
            {/* Single Vision - Right Eye Section */}
            <div className="eye-section right-eye">
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
            <div className="eye-section left-eye">
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
            <div className="eye-section right-eye">
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
                <h4 className="subsection-title">Near Vision (NV) - RE</h4>
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
              <div className="vision-subsection right-eye">
                <h4 className="subsection-title">Addition Power (ADD) - RE</h4>
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
            <div className="eye-section left-eye">
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
                <h4 className="subsection-title">Near Vision (NV) - LE</h4>
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
              <div className="vision-subsection left-eye">
                <h4 className="subsection-title">Addition Power (ADD) - LE</h4>
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
            className="check-button continue-button" 
            onClick={handleContinueToFrames}
            disabled={!isFormValid()}
          >
            Continue
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
              <div className="eye-results right-eye">
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
              <div className="eye-results left-eye">
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
