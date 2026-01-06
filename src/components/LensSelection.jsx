import React, { useState } from 'react';
import './LensSelection.css';

const LensSelection = ({ onPowerTypeSelect, onBack, frameSelection, configuringFrame }) => {
  const [selectedPowerType, setSelectedPowerType] = useState(null);

  const handleCardClick = (typeId) => {
    setSelectedPowerType(typeId);
    if (onPowerTypeSelect) {
      onPowerTypeSelect(typeId);
    }
  };

  const handleHelp = () => {
    alert('Call Nadeem\nPh No: 8861792967');
  };

  const powerTypes = [
    {
      id: 'with-power',
      title: 'Single Vision',
      //badge: 'Most common',
      description: 'Positive, Negative or Cylindrical',
      icon: '🔢'
    },
    {
      id: 'zero-power',
      title: 'Zero Power',
      badge: 'BLU Screen lenses',
      description: 'Blue light block for screen protection',
      icon: '🔵'
    },
    {
      id: 'reading-power',
      title: 'Reading Power',
      badge: null,
      description: 'With power for near vision only',
      icon: '➕'
    },
    {
      id: 'progressive',
      title: 'Progressive/Bifocal',
      badge: null,
      description: 'Two powers in one eye',
      icon: '👓'
    },
    {
      id: 'frame-only',
      title: 'Frame Only',
      badge: null,
      description: 'With no lenses',
      icon: '⬜'
    }
  ];

  return (
    <div className="lens-selection-container">
      {/* Header */}
      <header className="header">
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="header-title">
          Select Power Type
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
        <div className="step active">
          <div className="step-number">2</div>
          <div className="step-label">Power Type</div>
          <div className="step-indicator active"></div>
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
        <h2 className="section-title">Select your Power Type:</h2>
        
        {/* Display Selected Frame */}
        {configuringFrame === 'frame1' && frameSelection && frameSelection.frame1 && (
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
        
        {configuringFrame === 'frame2' && frameSelection && frameSelection.frame2 && (
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
        
        <div className="power-type-list">
          {powerTypes.map((type) => (
            <div 
              key={type.id}
              className={`power-type-card ${selectedPowerType === type.id ? 'selected' : ''}`}
              onClick={() => handleCardClick(type.id)}
            >
              <div className="card-icon">
                <div className="icon-placeholder">{type.icon}</div>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h3 className="card-title">{type.title}</h3>
                  {type.badge && (
                    <span className="badge">{type.badge}</span>
                  )}
                </div>
                <p className="card-description">{type.description}</p>
              </div>
              <div className="card-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LensSelection;
