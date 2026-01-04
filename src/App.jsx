import React, { useState } from 'react';
import LensSelection from './components/LensSelection';
import PrescriptionForm from './components/PrescriptionForm';
import './App.css';

function App() {
  const [currentStep, setCurrentStep] = useState('power-type'); // 'power-type' | 'prescription' | 'lenses'
  const [selectedPowerType, setSelectedPowerType] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState(null);

  const handlePowerTypeSelect = (powerType) => {
    setSelectedPowerType(powerType);
    if (powerType === 'with-power' || powerType === 'progressive') {
      setCurrentStep('prescription');
    }
    // Handle other power types later
  };

  const handleBackToPowerType = () => {
    setCurrentStep('power-type');
  };

  const handlePrescriptionContinue = (data) => {
    setPrescriptionData(data);
    // Navigate to next step (lens selection)
    console.log('Prescription Data:', data);
  };

  return (
    <div className="App">
      {currentStep === 'power-type' && (
        <LensSelection onPowerTypeSelect={handlePowerTypeSelect} />
      )}
      {currentStep === 'prescription' && (
        <PrescriptionForm 
          powerType={selectedPowerType}
          onBack={handleBackToPowerType}
          onContinue={handlePrescriptionContinue}
        />
      )}
    </div>
  );
}

export default App;
