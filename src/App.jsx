import React, { useState } from 'react';
import LensSelection from './components/LensSelection';
import PrescriptionForm from './components/PrescriptionForm';
import './App.css';

function App() {
  const [currentStep, setCurrentStep] = useState('frames'); // 'frames' | 'power-type' | 'prescription' | 'lenses'
  const [selectedPowerType, setSelectedPowerType] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [frameSelection, setFrameSelection] = useState({ frame1: '', frame2: '' });
  const [configuringFrame, setConfiguringFrame] = useState('frame1'); // Track which frame is being configured
  
  // Separate data for each frame
  const [frame1Data, setFrame1Data] = useState({
    powerType: null,
    prescription: null,
    lens: null
  });
  const [frame2Data, setFrame2Data] = useState({
    powerType: null,
    prescription: null,
    lens: null
  });

  const handlePowerTypeSelect = (powerType) => {
    setSelectedPowerType(powerType);
    
    // Store power type for the frame being configured
    if (configuringFrame === 'frame1') {
      setFrame1Data(prev => ({ ...prev, powerType }));
    } else {
      setFrame2Data(prev => ({ ...prev, powerType }));
    }
    
    if (powerType === 'with-power' || powerType === 'progressive') {
      setCurrentStep('prescription');
    }
    // Handle other power types later
  };

  const handleBackToPowerType = () => {
    setCurrentStep('power-type');
  };

  const handleBackToFrames = () => {
    setCurrentStep('frames');
  };

  const handleFramesContinue = () => {
    setCurrentStep('power-type');
  };

  const handleFrameSelectionChange = (frames) => {
    setFrameSelection(frames);
  };

  const handlePrescriptionContinue = (data) => {
    setPrescriptionData(data);
    
    // Store prescription for the frame being configured
    if (configuringFrame === 'frame1') {
      setFrame1Data(prev => ({ ...prev, prescription: data }));
    } else {
      setFrame2Data(prev => ({ ...prev, prescription: data }));
    }
    
    // Navigate to next step (lens selection)
    console.log('Prescription Data:', data);
  };

  const handleNavigateToFrames = () => {
    // When adding second frame, set configuring to frame2
    if (frameSelection.frame1) {
      setConfiguringFrame('frame2');
    }
    setCurrentStep('frames');
  };

  return (
    <div className="App">
      {currentStep === 'frames' && (
        <PrescriptionForm 
          powerType={configuringFrame === 'frame1' ? frame1Data.powerType : frame2Data.powerType}
          onBack={handleBackToFrames}
          onContinue={handleFramesContinue}
          initialView="frames"
          frameSelection={frameSelection}
          onFrameSelectionChange={handleFrameSelectionChange}
          onNavigateToFrames={handleNavigateToFrames}
          configuringFrame={configuringFrame}
          frame1Data={frame1Data}
          frame2Data={frame2Data}
          onFrame1DataChange={setFrame1Data}
          onFrame2DataChange={setFrame2Data}
        />
      )}
      {currentStep === 'power-type' && (
        <LensSelection 
          onPowerTypeSelect={handlePowerTypeSelect}
          onBack={handleBackToFrames}
          frameSelection={frameSelection}
          configuringFrame={configuringFrame}
        />
      )}
      {currentStep === 'prescription' && (
        <PrescriptionForm 
          powerType={configuringFrame === 'frame1' ? frame1Data.powerType : frame2Data.powerType}
          onBack={handleBackToPowerType}
          onContinue={handlePrescriptionContinue}
          initialView="prescription"
          frameSelection={frameSelection}
          onFrameSelectionChange={handleFrameSelectionChange}
          onNavigateToFrames={handleNavigateToFrames}
          configuringFrame={configuringFrame}
          frame1Data={frame1Data}
          frame2Data={frame2Data}
          onFrame1DataChange={setFrame1Data}
          onFrame2DataChange={setFrame2Data}
        />
      )}
    </div>
  );
}

export default App;
