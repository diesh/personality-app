import React, { useState } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { questions } from './questions';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE  = 'service_5ofud2s';
const EMAILJS_PUB_KEY  = 'rFif4nClH_xt6N8ho';
const TEMPLATE_ADMIN   = 'template_ph23kty';
const TEMPLATE_USER    = 'template_4mibdo8';

const classify = (val) => val >= 3 ? 'high' : val <= -3 ? 'low' : 'integrative';
const classifyShort = (val) => val >= 2 ? 'high' : val <= -2 ? 'low' : 'integrative';

const OC_LINES = {
  'high-high':             "Wired to find what's next and build the machine to own it.",
  'high-low':              "High appetite for the new, low tolerance for what slows things down.",
  'high-integrative':      "Thinks expansively and executes pragmatically.",
  'low-high':              "Moves when certain. Builds to last.",
  'low-low':               "Trusts fast, practical action over elaborate plans.",
  'low-integrative':       "Grounded and direct. Gets things done without overcomplicating them.",
  'integrative-high':      "Balances creative thinking with rigorous follow-through.",
  'integrative-low':       "Adapts fast and moves quickly once there's enough signal.",
  'integrative-integrative': "Holds vision and execution, speed and quality, without needing to pick a side.",
};

const EAN_LINES = {
  E: {
    high:        "Thinks best in motion, through conversation and debate.",
    low:         "Thinks best in stillness, before the room.",
    integrative: "Shifts between external and internal processing as the work demands.",
  },
  A: {
    high:        "Builds trust before building anything else.",
    low:         "Leads with the truth, even when it's uncomfortable.",
    integrative: "Knows when to push and when to hold back.",
  },
  N: {
    high:        "Takes risk seriously. Needs to know the contingencies are covered.",
    low:         "Holds steady when others are rattled.",
    integrative: "Stays focused and keeps scanning when the ground shifts.",
  },
};

const Assessment = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', jobTitle: '', email: '' });
  const [responses, setResponses] = useState({});
  const [status, setStatus] = useState('idle');
  const [submitError, setSubmitError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

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

      const totals = { O: 0, C: 0, E: 0, A: 0, N: 0 };
      rawScores.forEach(item => {
        if (Object.prototype.hasOwnProperty.call(totals, item.trait)) totals[item.trait] += item.points;
      });
      const oTend = classify(totals.O);
      const cTend = classify(totals.C);
      const ocLine = OC_LINES[`${oTend}-${cTend}`] || '';
      const eanTop = [{ t: 'E', v: totals.E }, { t: 'A', v: totals.A }, { t: 'N', v: totals.N }]
        .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
      const eanLine = EAN_LINES[eanTop.t]?.[classifyShort(eanTop.v)] || '';

      const docRef = await addDoc(collection(db, "results"), {
        clientName: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        jobTitle: formData.jobTitle,
        email: formData.email,
        style,
        rawScores,
        timestamp: serverTimestamp()
      });

      const reportUrl = `https://personality.diesh.ca/report/${docRef.id}`;

      // Notify admin
      emailjs.send(EMAILJS_SERVICE, TEMPLATE_ADMIN, {
        clientName: `${formData.firstName} ${formData.lastName}`,
        jobTitle:   formData.jobTitle,
        userEmail:  formData.email,
        style,
        reportUrl,
      }, EMAILJS_PUB_KEY).catch(err => console.error('Admin email failed:', err));

      // Email the user
      emailjs.send(EMAILJS_SERVICE, TEMPLATE_USER, {
        firstName: formData.firstName,
        style,
        ocLine,
      }, EMAILJS_PUB_KEY).catch(err => console.error('User email failed:', err));

      setSubmissionResult({ style, ocLine, eanLine, firstName: formData.firstName });
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('idle');
      setSubmitError("Something went wrong during submission. Please try again.");
    }
  };

  if (status === 'submitting') return <div style={styles.loader}>CALIBRATING DATA...</div>;

  if (status === 'success' && submissionResult) return (
    <div style={{ backgroundColor: '#fcfcfc', minHeight: '100vh', fontFamily: '"Inter", sans-serif', padding: '20px 10px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#fff', border: '1px solid #eee', padding: '5% 7%', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '24px', marginBottom: '32px' }}>
          <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '2px', color: '#999', marginBottom: '12px' }}>PERSONAL REPORT</div>
          <h1 style={{ fontSize: 'calc(1.6rem + 1vw)', fontWeight: '900', letterSpacing: '-1px', margin: '0 0 6px 0' }}>{formData.firstName} {formData.lastName}</h1>
          <p style={{ fontSize: '0.85rem', color: '#666', letterSpacing: '1.5px', margin: 0, fontWeight: '600' }}>{formData.jobTitle.toUpperCase()}</p>
        </div>

        {/* Profile Summary — visible */}
        <div style={{ marginBottom: '32px', padding: '28px 30px', background: '#000', color: '#fff' }}>
          <div style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '2px', color: '#666', marginBottom: '12px' }}>PROFILE SUMMARY</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#ff0000', letterSpacing: '1px', marginBottom: '14px' }}>
            Working Style: {submissionResult.style}
          </div>
          <p style={{ fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.6', margin: '0 0 8px 0' }}>{submissionResult.ocLine}</p>
          <p style={{ fontSize: '0.88rem', fontWeight: '400', lineHeight: '1.6', margin: 0, color: 'rgba(255,255,255,0.6)' }}>{submissionResult.eanLine}</p>
        </div>

        {/* CTA */}
        <div style={{ border: '2px solid #000', padding: '28px 30px', marginBottom: '32px' }}>
          <div style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '2px', color: '#999', marginBottom: '12px' }}>YOUR FULL REPORT IS READY</div>
          <p style={{ fontSize: '1.1rem', fontWeight: '700', lineHeight: '1.5', margin: '0 0 8px 0' }}>
            Book a 45-minute debrief with Gagan to walk through it together.
          </p>
          <p style={{ fontSize: '0.88rem', color: '#555', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            Your report covers how you think, how you execute, where you create friction, and what conditions bring out your best work. We'll unpack it together and build a plan around it.
          </p>
          <a
            href="https://calendar.app.google/zVv8SaHjWnpTgbN18"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-block', background: '#000', color: '#fff', padding: '14px 28px', fontWeight: '700', fontSize: '0.9rem', textDecoration: 'none', letterSpacing: '0.5px' }}
          >
            Book Your Report Debrief
          </a>
        </div>

        {/* Blurred report preview */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '2px' }}>
          <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.6 }}>
            {/* Fake section previews */}
            {['01. How You Think', '02. How You Show Up', '03. How You Execute', '04. Where You Create Friction', '05. Working With You'].map((title, i) => (
              <div key={i} style={{ marginBottom: '40px', borderTop: '1px solid #eee', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{title}</div>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#ff0000' }}>UNLOCKED IN DEBRIEF</div>
                </div>
                <div style={{ height: '12px', background: '#eee', borderRadius: '2px', marginBottom: '10px', width: '90%' }} />
                <div style={{ height: '12px', background: '#eee', borderRadius: '2px', marginBottom: '10px', width: '75%' }} />
                <div style={{ height: '12px', background: '#eee', borderRadius: '2px', marginBottom: '10px', width: '85%' }} />
                <div style={{ height: '12px', background: '#eee', borderRadius: '2px', width: '60%' }} />
              </div>
            ))}
          </div>
          {/* Gradient fade overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 100%)', pointerEvents: 'none' }} />
        </div>

      </div>
    </div>
  );

  // OPENING SCREEN
  if (step === 0) return (
    <div style={styles.container}>

      {/* Branding */}
      <a href="https://diesh.ca/" target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', color: '#000', marginBottom: '36px', paddingBottom: '24px', borderBottom: '2px solid #000' }}>
        <strong style={{ display: 'block', fontSize: '1.15rem', fontWeight: '900', letterSpacing: '3px', lineHeight: 1 }}>GAGAN DIESH</strong>
        <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '2.5px', color: '#666', marginTop: '5px' }}>CAREER &amp; LEADERSHIP COACHING</span>
      </a>

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
        <input
          style={styles.input}
          type="email"
          placeholder="Email Address"
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
        <p style={{ fontSize: '11px', color: '#888', marginTop: '-10px', marginBottom: '15px', fontStyle: 'italic' }}>
          I will review your report with you and suggest some actionable steps to help you optimise how you show up to work.
        </p>
      </div>

      <button disabled={!formData.firstName || !formData.jobTitle || !formData.email} onClick={() => setStep(1)} style={styles.btn}>
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