import React, { useState } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { questions } from './questions';

const Assessment = () => {
  const [step, setStep] = useState(0); 
  const [formData, setFormData] = useState({ firstName: '', lastName: '', jobTitle: '' });
  const [responses, setResponses] = useState({});
  const [status, setStatus] = useState('idle');
  const [submitError, setSubmitError] = useState(null);

  const options = [
    { label: 'Strongly Disagree', value: -2 },
    { label: 'Disagree', value: -1 },
    { label: 'Neutral', value: 0 },
    { label: 'Agree', value: 1 },
    { label: 'Strongly Agree', value: 2 }
  ];

  const handleSelect = (val) => {
    setResponses({ ...responses, [questions[step - 1].id]: val });
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const computeStyle = (rawScores) => {
    const totals = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    rawScores.forEach(item => {
      if (Object.prototype.hasOwnProperty.call(totals, item.trait)) totals[item.trait] += item.points;
    });

    const oHigh = totals.O >= 3;
    const oLow  = totals.O <= -3;
    const cHigh = totals.C >= 3;
    const cLow  = totals.C <= -3;

    if (oHigh && cHigh) return 'Visionary Architect';
    if (oHigh && cLow)  return 'Creative Pioneer';
    if (oLow  && cHigh) return 'Systematic Expert';
    if (oLow  && cLow)  return 'Pragmatic Driver';

    if (oHigh) return totals.C >= 0 ? 'Visionary Architect' : 'Creative Pioneer';
    if (oLow)  return totals.C >= 0 ? 'Systematic Expert' : 'Pragmatic Driver';
    if (cHigh) return totals.O >= 0 ? 'Visionary Architect' : 'Systematic Expert';
    if (cLow)  return totals.O >= 0 ? 'Creative Pioneer' : 'Pragmatic Driver';

    return 'Adaptive Strategist';
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => responses[q.id] === undefined);
    if (unanswered.length > 0) {
      setSubmitError(`${unanswered.length} question${unanswered.length > 1 ? 's' : ''} still need${unanswered.length === 1 ? 's' : ''} a response. Please go back and complete them.`);
      return;
    }
    setSubmitError(null);
    setStatus('submitting');
    try {
      const rawScores = questions.map(q => {
        const scoreValue = responses[q.id] ?? 0;
        const selectedOption = options.find(opt => opt.value === scoreValue);
        return {
          trait: q.trait,
          points: scoreValue * q.weight,
          questionText: q.text,
          answerText: selectedOption ? selectedOption.label : 'No response'
        };
      });

      const style = computeStyle(rawScores);

      await addDoc(collection(db, "results"), {
        clientName: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        jobTitle: formData.jobTitle,
        style,
        rawScores,
        timestamp: serverTimestamp()
      });
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('idle');
      setSubmitError("Something went wrong during submission. Please try again.");
    }
  };

  if (status === 'submitting') return <div style={styles.loader}>CALIBRATING DATA...</div>;

  if (status === 'success') return (
      <div style={styles.container}>
        <h2 style={styles.h2}>
        <span style={{ color: '#27ae60', marginRight: '10px' }}>✓</span>
        Responses Received
      </h2>
        <p style={styles.body}>
          Thank you, {formData.firstName}. I’ve received your responses and will review your answers to identify the key drivers of your professional style.
        </p>
        <p style={styles.body}>
          Once I've completed the analysis, I’ll reach out to arrange time for us to review the findings together. During that session, we’ll establish a plan to leverage your strengths and navigate any friction points.
        </p>
      
        {/* Decorated Website Link */}
        <div style={styles.footerLinkContainer}>
          <div style={styles.divider}></div>
          <a href="https://diesh.ca" style={styles.websiteLink}>
             diesh.ca
            <span style={styles.linkArrow}>→</span>
          </a>
        </div>
      </div>
    );

  // OPENING SCREEN
  if (step === 0) return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.progress}>PROFESSIONAL ANALYSIS</span>
        <h2 style={styles.h1}>Personality and Work Style Assessment</h2>
      </div>
      
      <div style={styles.instructionBox}>
        <p style={styles.body}>Understand your natural traits and professional work style.</p>
        <p style={styles.smallBody}>
          <strong>Instructions:</strong> Select the option that best describes you, then click Next to proceed.
        </p>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Your Details</label>
        <input style={styles.input} placeholder="First Name" onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
        <input style={styles.input} placeholder="Last Name" onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
        <div style={{ position: 'relative' }}>
          <input style={styles.input} placeholder="Current or Last Job Title" onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} />
          <p style={{ fontSize: '11px', color: '#888', marginTop: '-10px', marginBottom: '15px', fontStyle: 'italic' }}>
            Tip: If you are currently between roles, please use your most recent job title.
          </p>
        </div>
      </div>

      <button disabled={!formData.firstName || !formData.jobTitle} onClick={() => setStep(1)} style={styles.btn}>
        BEGIN ASSESSMENT
      </button>
    </div>
  );

  // COMPLETION SCREEN
  if (step > questions.length) return (
    <div style={styles.container}>
      <h2 style={styles.h2}>Finalize Assessment</h2>
      <p style={styles.body}>All questions answered. Please submit your data below.</p>
      {submitError && (
        <p style={{ color: '#cc0000', fontSize: '0.9rem', marginBottom: '20px', padding: '14px', background: '#fff5f5', border: '1px solid #fcc', borderRadius: '6px' }}>
          {submitError}
        </p>
      )}
      <button onClick={handleSubmit} style={styles.btn}>FINALIZE & SUBMIT</button>
      <div style={{textAlign: 'left'}}>
        <button onClick={() => setStep(questions.length)} style={styles.backLink}>Review last question</button>
      </div>
    </div>
  );

  const q = questions[step - 1];
  const currentSelection = responses[q.id];

  return (
    <div style={styles.container}>
      <div style={styles.questionHeader}>
        <span style={styles.progress}>QUESTION {step} OF {questions.length}</span>
      </div>
      
      <h3 style={styles.qText}>{q.text}</h3>
      <div style={styles.options}>
        {options.map(opt => {
          const isSelected = currentSelection === opt.value;
          return (
            <button 
              key={opt.value} 
              onClick={() => handleSelect(opt.value)} 
              style={{
                ...styles.optBtn,
                backgroundColor: isSelected ? '#f4f4f4' : '#fff',
                color: '#000',
                borderColor: isSelected ? '#000' : '#eee',
                borderWidth: isSelected ? '2px' : '1px',
                fontWeight: isSelected ? '700' : '400',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: '40px' }}>
        <button 
          disabled={currentSelection === undefined} 
          onClick={handleNext} 
          style={{
            ...styles.btn, 
            opacity: currentSelection === undefined ? 0.3 : 1,
            cursor: currentSelection === undefined ? 'not-allowed' : 'pointer'
          }}
        >
          NEXT
        </button>
        
        {step > 1 && (
          <div style={{ textAlign: 'left' }}>
            <button onClick={handleBack} style={styles.backLink}>
              ← Back to previous question
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '550px', margin: '80px auto', padding: '40px', fontFamily: '"Inter", sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  header: { marginBottom: '30px' },
  h1: { fontSize: '2.2rem', fontWeight: '900', margin: '10px 0 0 0', letterSpacing: '-1px', lineHeight: '1.1' },
  h2: { fontSize: '1.5rem', fontWeight: '900', marginBottom: '30px', textTransform: 'uppercase' },
  instructionBox: { marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #eee' },
  formGroup: { marginBottom: '30px' },
  label: { display: 'block', fontSize: '10px', fontWeight: '900', color: '#999', marginBottom: '15px', letterSpacing: '1px' },
  input: { display: 'block', width: '100%', padding: '16px', marginBottom: '15px', border: '1px solid #eee', borderRadius: '8px', fontSize: '1rem', backgroundColor: '#f9f9f9', boxSizing: 'border-box' },
  btn: { background: '#000', color: '#fff', padding: '18px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  backLink: { background: 'none', border: 'none', color: '#999', marginTop: '20px', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', padding: '0' },
  questionHeader: { marginBottom: '20px' },
  qText: { fontSize: '1.8rem', fontWeight: '700', marginBottom: '40px', lineHeight: '1.3' },
  optBtn: { display: 'block', width: '100%', padding: '18px', marginBottom: '12px', textAlign: 'left', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.1s ease' },
  progress: { fontSize: '10px', letterSpacing: '2px', color: '#999', fontWeight: '800' },
  body: { fontSize: '1.1rem', marginBottom: '15px', fontWeight: '500' },
  smallBody: { fontSize: '0.9rem', color: '#666' },
	footerLinkContainer: {
	    marginTop: '50px',
	    textAlign: 'center'
	  },
	  divider: {
	    height: '1px',
	    background: 'linear-gradient(to right, transparent, #eee, transparent)',
	    marginBottom: '25px'
	  },
	  websiteLink: {
	    color: '#000',
	    textDecoration: 'none',
	    fontSize: '14px',
	    fontWeight: '700',
	    letterSpacing: '1px',
	    textTransform: 'uppercase',
	    display: 'inline-flex',
	    alignItems: 'center',
	    transition: 'opacity 0.2s'
	  },
	  linkArrow: {
	    marginLeft: '8px',
	    fontSize: '18px',
	    transition: 'transform 0.2s'
	  }
};

export default Assessment;