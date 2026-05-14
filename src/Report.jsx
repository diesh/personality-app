import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from './firebaseConfig';
import { doc, getDoc } from "firebase/firestore";

const Report = () => {
  const { id } = useParams();

  const [data, setData] = useState(() => {
    const cached = sessionStorage.getItem(`report_${id}`);
    return cached ? JSON.parse(cached) : null;
  });

  const [error, setError] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(!data);

  useEffect(() => {
      // 1. SECURITY: Prevent search engines from indexing this report
      const meta = document.createElement('meta');
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.getElementsByTagName('head')[0].appendChild(meta);

      // 2. DATA FETCHING: Your existing logic
      const fetchReport = async () => {
        if (!id) return;
        try {
          const docRef = doc(db, "results", id);
          const docSnap = await getDoc(docRef);

		  if (docSnap.exists()) {
		              const freshData = docSnap.data();
		              setData(freshData);
		              sessionStorage.setItem(`report_${id}`, JSON.stringify(freshData));
			
		              // 1. Prepare dynamic values
		              const userName = freshData.firstName || 'User';
		              const userStyle = freshData.style || 'Expert';
		              const imageUrl = `https://share-images-six.vercel.app/api/og?name=${userName}&style=${userStyle}`;

		              // 2. Update or Create og:image
		              let metaImg = document.querySelector('meta[property="og:image"]');
		              if (!metaImg) {
		                metaImg = document.createElement('meta');
		                metaImg.setAttribute('property', 'og:image');
		                document.getElementsByTagName('head')[0].appendChild(metaImg);
		              }
		              metaImg.content = imageUrl;

		              // 3. Update or Create twitter:card
		              let metaTwit = document.querySelector('meta[name="twitter:card"]');
		              if (!metaTwit) {
		                metaTwit = document.createElement('meta');
		                metaTwit.name = "twitter:card";
		                document.getElementsByTagName('head')[0].appendChild(metaTwit);
		              }
		              metaTwit.content = "summary_large_image";
            
		            } else {
            setError(true);
          }
        } catch (err) {
          if (!data) setError(true);
        } finally {
          setIsInitialLoading(false);
        }
      };

      fetchReport();

      // 3. CLEANUP: Remove the tag if the user navigates away
      return () => {
        if (document.getElementsByTagName('head')[0].contains(meta)) {
          document.getElementsByTagName('head')[0].removeChild(meta);
        }
      };
    }, [id, data]);
	
	const shareOnLinkedIn = () => {
	  // Adding a timestamp (?v=) forces LinkedIn to ignore old cached images
		const url = window.location.href;
	  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
	  window.open(linkedinUrl, '_blank');
	};
	
  if (error) return <div style={styles.utility}>Report not found.</div>;
  if (isInitialLoading && !data) return <div style={styles.utility}>Loading your report...</div>;

  const totals = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  if (data.rawScores) data.rawScores.forEach(item => { if (totals.hasOwnProperty(item.trait)) totals[item.trait] += item.points; });

  const classify = (val) => { if (val >= 3) return 'high'; if (val <= -3) return 'low'; return 'integrative'; };
  const classifyShort = (val) => { if (val >= 2) return 'high'; if (val <= -2) return 'low'; return 'integrative'; };

  const firstName = data.firstName || "Subject";
  const jobTitle = data.jobTitle || "Executive";
  const isProduct = jobTitle.toLowerCase().includes('product') || jobTitle.toLowerCase().includes('eng') || jobTitle.toLowerCase().includes('design');

  const getPersona = () => {
      const title = jobTitle.toLowerCase();

      const leaderKeywords = [
        'lead', 'head', 'vp', 'director', 'chief', 'manager', 'principal',
        'founder', 'president', 'supervisor'
      ];

      const icKeywords = [
        'staff', 'senior', 'sr', 'associate', 'junior', 'jr', 'designer',
        'engineer', 'analyst', 'developer', 'architect', 'specialist', 'consultant'
      ];

      const isLeaderRole = leaderKeywords.some(kw => title.includes(kw));
      const isICRole = icKeywords.some(kw => title.includes(kw));

      if (isLeaderRole) return {
        lookTo:   `People look to you to`,
        atLevel:  `At the ${jobTitle} level,`,
        leadWith: `You lead with`,
        team:     `your team`,
        context:  `leading your team`
      };

      if (isICRole) return {
        lookTo:   `The people you work with count on you to`,
        atLevel:  `In your work as a ${jobTitle},`,
        leadWith: `You contribute by`,
        team:     `your collaborators`,
        context:  `navigating your craft`
      };

      return {
        lookTo:   `The people around you expect you to`,
        atLevel:  `In your role as ${jobTitle},`,
        leadWith: `You show up by`,
        team:     `the people you work with`,
        context:  `doing your best work`
      };
    };

  const persona = getPersona();
  const getPos = (val, max) => ((val + max) / (max * 2)) * 100;

  const getCellHighlight = (current, target) => (current === target ? { backgroundColor: '#fff0f0', fontWeight: 'bold', color: '#ff0000' } : { color: '#999' });

  // Profile summary
  const oTend = classify(totals.O), cTend = classify(totals.C);
  const ocLine = {
    'high-high': "You're wired to find what's next and build the machine to own it.",
    'high-low': "You have a high appetite for the new and a low tolerance for what slows you down.",
    'high-integrative': "You think expansively and execute pragmatically.",
    'low-high': "You move when you're certain and build to last.",
    'low-low': "You trust fast, practical action over elaborate plans.",
    'low-integrative': "You're grounded and direct. You get things done without overcomplicating them.",
    'integrative-high': "You balance creative thinking with rigorous follow-through.",
    'integrative-low': "You're adaptable and move quickly once you've seen enough.",
    'integrative-integrative': "You hold vision and execution, speed and quality, without needing to pick a side.",
  }[`${oTend}-${cTend}`];

  const eanTop = [{ t:'E', v:totals.E }, { t:'A', v:totals.A }, { t:'N', v:totals.N }]
    .sort((a,b) => Math.abs(b.v) - Math.abs(a.v))[0];
  const eanLine = {
    E: { high: "You think best in motion, through conversation and debate.", low: "You think best in stillness, before the room.", integrative: "You shift between external and internal processing as the work demands." },
    A: { high: "You build trust before you build anything else.", low: "You lead with the truth, even when it's uncomfortable.", integrative: "You know when to push and when to hold back." },
    N: { high: "You take risk seriously and need to know the contingencies are covered.", low: "You hold steady when others are rattled.", integrative: "You stay focused and keep scanning when the ground shifts." },
  }[eanTop.t][classifyShort(eanTop.v)];

  // Development edge
  const edgeSource = [
    { t:'O', v:totals.O, max:8 }, { t:'C', v:totals.C, max:8 },
    { t:'E', v:totals.E, max:4 }, { t:'A', v:totals.A, max:4 }, { t:'N', v:totals.N, max:4 }
  ].sort((a,b) => Math.abs(b.v/b.max) - Math.abs(a.v/a.max))[0];
  const edge = {
    O: { high: { w:"You move fast between ideas. The risk is leaving execution behind.", g:"Pick one idea and take it to completion before opening the next." }, low: { w:"You protect what's proven. The risk is missing the window when a leap is called for.", g:"Back one unproven idea per quarter. Treat it as a learning investment, not a commitment." } },
    C: { high: { w:"Your standards can become a bottleneck. Fast-moving teams will feel the friction.", g:"Identify one area where good enough is genuinely good enough. Practice releasing it." }, low: { w:"Speed without structure creates debt. Someone always pays for it.", g:"Pick one recurring process and document it once. A gift to your team, not a bureaucratic exercise." } },
    E: { high: { w:"Thinking out loud can read as changing direction. Your team may be more confused than you realize.", g:"Create a signal for when you're brainstorming versus deciding. One word. Use it consistently." }, low: { w:"Processing privately means people rarely see your thinking. That can read as disengagement.", g:"Share one unfinished thought per week. You don't have to be certain. Just visible." } },
    A: { high: { w:"A preference for harmony can delay hard conversations until they become expensive.", g:"Say the uncomfortable thing early, in private, in one sentence. The longer you wait, the harder it gets." }, low: { w:"Directness without timing can land as aggression, even when the content is right.", g:"Before a hard conversation, spend 30 seconds on how the other person needs to hear it." } },
    N: { high: { w:"Risk-focus under pressure can slow decisions when speed matters most.", g:"Build a personal 'good enough to proceed' checklist. When you've cleared it, move." }, low: { w:"Calm under pressure can read as indifference. People may need more acknowledgment than you think.", g:"Name the difficulty out loud before solving it. One sentence. It matters more than you expect." } },
  }[edgeSource.t][edgeSource.v >= 0 ? 'high' : 'low'];

  // Ideal conditions
  const idealLine = {
    'high-high': "Ambitious problems with high stakes and high standards. You're built for the work others find too hard.",
    'high-low': "Fast-moving environments where you can experiment and ship without asking permission.",
    'high-integrative': "Problems with a real vision component and a real delivery component. You need both.",
    'low-high': "High-stakes work where accuracy and consistency are non-negotiable.",
    'low-low': "Execution-heavy environments where getting it out matters more than getting it perfect.",
    'low-integrative': "Clear success metrics with some flexibility in how you get there.",
    'integrative-high': "Complex work that needs both creative thinking and rigorous follow-through.",
    'integrative-low': "Fast-changing environments where adaptability matters more than perfect process.",
    'integrative-integrative': "Balanced environments that reward both strategic thinking and practical delivery.",
  }[`${oTend}-${cTend}`];

  return (
    <div style={styles.page}>

      <div style={styles.container}>

        {/* CALLOUT BAR — top of report */}
        <div style={{
          background: '#fff',
          borderLeft: '4px solid #ff0000',
          padding: '14px 20px',
          fontSize: '0.88rem',
          fontWeight: '500',
          marginBottom: '32px',
          color: '#111',
        }}>
          Want to understand how you show up to work?{' '}
          <a href="https://personality.diesh.ca/" target="_blank" rel="noreferrer" style={{ color: '#ff0000', fontWeight: '700', textDecoration: 'none' }}>
            Get your free assessment at personality.diesh.ca
          </a>
        </div>

        <header style={styles.header}>
	  
<div style={styles.shareContainer}>
          <button onClick={shareOnLinkedIn} style={styles.shareBtn}>
            Share Results on LinkedIn
          </button>
        </div>
          <div style={styles.headerTop}>
            <span style={styles.tag}>PERSONAL REPORT</span>
           {/*<span style={styles.tag}>REF: {id.toUpperCase()}</span>*/}

          </div>

	  
          <h1 style={styles.h1}>{data.clientName}</h1>
          <p style={styles.subhead}>{jobTitle.toUpperCase()}</p>
		   
        </header>

        {/* PROFILE SUMMARY */}
        <section style={{ marginBottom: '50px', padding: '28px 30px', background: '#000', color: '#fff' }}>
          <div style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '2px', color: '#666', marginBottom: '12px' }}>PROFILE SUMMARY</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#ff0000', letterSpacing: '1px', marginBottom: '14px' }}>
            Working Style: {data.style || 'Expert'}
          </div>
          <p style={{ fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.6', margin: '0 0 8px 0' }}>{ocLine}</p>
          <p style={{ fontSize: '0.88rem', fontWeight: '400', lineHeight: '1.6', margin: 0, color: 'rgba(255,255,255,0.6)' }}>{eanLine}</p>
        </section>

        {/* SECTION 01: STRATEGIC DISCOVERY */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.h2}>01. How You Think</h2>
            <div style={styles.traitLabel}>{classify(totals.O).toUpperCase()} OPENNESS</div>
          </div>

          <blockquote style={styles.pullquote}>
            {classify(totals.O) === 'high' ? "“I’m not here to iterate on what already exists. I want the thing that changes the game.”" :
             classify(totals.O) === 'low' ? "“The vision is great. Show me it holds up under pressure.”" :
             "“Innovation is only as good as its execution. I want the vision, but I want the roadmap too.”"}
          </blockquote>

          <div style={styles.contentGrid}>
            <div style={styles.column}>
              <h3 style={styles.h3}>Thinking Style</h3>
              <div style={styles.block}>
                <p style={styles.pLabel}>Information Bias: <strong>{classify(totals.O) === 'high' ? "Possibility over proof" : classify(totals.O) === 'low' ? "Evidence over theory" : "Both, depending on the stakes"}</strong></p>
                <p style={styles.pBody}>
                  {classify(totals.O) === 'high' && `You're drawn to what's possible, not just what's proven. You look for the story the data might tell. You often borrow ideas from unrelated fields and use them to reframe problems in your own.`}
                  {classify(totals.O) === 'low' && `You trust what's been tested. You filter out speculation and focus on what's actually worked. A strong instinct still needs evidence behind it before you'll back it.`}
                  {classify(totals.O) === 'integrative' && `You connect ideas that others tend to keep separate. You're willing to think big, but you'll want to ground it with something real before you commit.`}
                </p>
              </div>

              <div style={styles.block}>
                <p style={styles.pLabel}>Decision Driver: <strong>{classify(totals.O) === 'high' ? "Find the non-obvious angle" : classify(totals.O) === 'low' ? "Protect the downside" : "Calculated bet"}</strong></p>
                <p style={styles.pBody}>
                  {classify(totals.O) === 'high' && (isProduct ? `You push toward what changes the category, not what refines what already exists. ${persona.atLevel} that instinct keeps the work from becoming commodity.` : `You're looking for the angle nobody owns yet. ${persona.lookTo} find it before someone else does.`)}
                  {classify(totals.O) === 'low' && `You protect what's working. Every initiative you back needs a clear reason to exist and a clear path to paying off.`}
                  {classify(totals.O) === 'integrative' && `You weigh what's needed now against what's worth building toward. You'll take the bet, but you want guardrails around it.`}
                </p>
              </div>

              <div style={styles.block}>
                <p style={styles.pLabel}>Under Pressure: <strong>{classify(totals.O) === 'high' ? "Create your way out" : classify(totals.O) === 'low' ? "Don't move until you're sure" : "Adapt and redirect"}</strong></p>
                <p style={styles.pBody}>
                  {classify(totals.O) === 'high' && `In high-stakes moments, your instinct is to find the creative way out. The bigger risk, in your view, is playing it too safe.`}
                  {classify(totals.O) === 'low' && `In a crisis, you slow things down. You're the one asking the hard questions before anyone pulls the trigger.`}
                  {classify(totals.O) === 'integrative' && `When the stakes rise, you look for what the situation can teach. You want to use the disruption, not just survive it.`}
                </p>
              </div>
            </div>
            <div style={styles.rightColumn}>
              <div style={styles.sidePersonaQuote}>
                 <span style={styles.quoteMark}>"</span>
                 {classify(totals.O) === 'high' ? "I'm not looking for what worked last year. I want the non-obvious angle that changes things." :
                  classify(totals.O) === 'low' ? "The vision sounds great. Now show me it holds up when you stress-test it." :
                  "Give me the big idea. Then show me the smallest version we can actually test."}
              </div>

              <div style={styles.scaleWrapper}>
                <div style={styles.scaleLabels}><span>EMPIRICAL</span><span>SYNTHESIS</span></div>
                <div style={styles.scaleLine}><div style={{ ...styles.scaleDot, left: `${getPos(totals.O, 8)}%` }} /></div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 02: HOW YOU SHOW UP */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.h2}>02. How You Show Up</h2>
          </div>
          <div style={styles.contentGrid}>
            <div style={styles.column}>
              <p style={styles.pBody}>
                {classify(totals.O) === 'high'
                  ? `In a room, you're the one asking "what if." You help others look past what's familiar and push the conversation toward what's next.`
                  : classify(totals.O) === 'low'
                  ? `You're the reality check in planning conversations. When the energy in the room tips toward hype, you're the one asking whether it actually holds up.`
                  : `You translate between the visionaries and the operators. You make big ideas land without losing what made them interesting.`}
              </p>
              <p style={{...styles.pBody, marginTop: '15px'}}>
                {classify(totals.O) === 'high'
                  ? `Ambiguity doesn't slow you down. You'll back an idea before the path is fully clear, and you trust yourself to figure out the rest as it develops.`
                  : classify(totals.O) === 'low'
                  ? `Your instinct is to protect what's working. You'll make the case for patience when everyone else wants to move fast, and you're usually right.`
                  : `You look for the low-risk test before the full commitment. ${persona.lookTo} keep things aligned while the picture is still taking shape.`}
              </p>
            </div>
            <div style={styles.rightColumn}>
              <div style={{ width: '300px', boxSizing: 'border-box' }}>
                <div style={styles.visualBox}>
                  <div style={styles.visualLabel}>INFLUENCE STYLE</div>
                  <div style={styles.visualValue}>{classify(totals.O).toUpperCase()} OPENNESS</div>
                </div>
			<div style={styles.captionContainer}>
			  <div style={styles.captionAccent} />
			  <p style={styles.captionText}>
			    {classify(totals.O) === 'high'
			      ? "You challenge assumptions and push conversations toward what's possible."
			      : classify(totals.O) === 'low'
			      ? "You anchor conversations in evidence. You're the reality check in the room."
			      : "You bridge vision and execution. You make big ideas land."}
			  </p>
			</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 03: HOW YOU EXECUTE */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.h2}>03. How You Execute</h2>
            <div style={styles.traitLabel}>{classify(totals.C).toUpperCase()} CONSCIENTIOUSNESS</div>
          </div>
          <div style={styles.contentGrid}>
            <div style={styles.column}>
              <h3 style={styles.h3}>Execution Style</h3>
              <div style={styles.block}>
                <p style={styles.pLabel}>Workflow Bias: <strong>{classify(totals.C) === 'high' ? "Build the system" : classify(totals.C) === 'low' ? "Move fast, figure it out" : "Structure where it counts"}</strong></p>
                <p style={styles.pBody}>
                  {classify(totals.C) === 'high' && `You believe good work is repeatable. Documentation isn't overhead to you. It's how you protect the standard when you're not in the room.`}
                  {classify(totals.C) === 'low' && `You move fast and trust people to figure it out. Heavy process feels like friction, and you'll route around it.`}
                  {classify(totals.C) === 'integrative' && `You build just enough structure to keep things consistent, then get out of the way. You'll break the rules when the rules are getting in the way.`}
                </p>
              </div>
              <div style={styles.block}>
                <p style={styles.pLabel}>Scaling Instinct: <strong>{classify(totals.C) === 'high' ? "Make it repeatable" : classify(totals.C) === 'low' ? "Put the right people in the room" : "Rigid core, flexible edges"}</strong></p>
                <p style={styles.pBody}>
                  {classify(totals.C) === 'high' && `You scale by building something repeatable. A one-time win doesn't excite you as much as a system that holds up at volume.`}
                  {classify(totals.C) === 'low' && `You scale by putting the right people in the room and trusting them. Too much process just slows everything down.`}
                  {classify(totals.C) === 'integrative' && `You figure out what needs to be rigid and what can stay loose. You don't over-engineer it.`}
                </p>
              </div>
              <div style={styles.block}>
                <p style={styles.pLabel}>Team Value: <strong>{classify(totals.C) === 'high' ? "The standard" : classify(totals.C) === 'low' ? "The pace" : "The balance"}</strong></p>
                <p style={styles.pBody}>
                  {classify(totals.C) === 'high' && `Quality is non-negotiable. You'd rather push the date than ship something that misses the mark. ${persona.lookTo} protect the standard.`}
                  {classify(totals.C) === 'low' && `You'd rather get it out and learn. Real feedback beats another round of internal debate.`}
                  {classify(totals.C) === 'integrative' && `You hold both. You find the line where fast doesn't mean sloppy, and you hold it.`}
                </p>
              </div>
            </div>
            <div style={styles.rightColumn}>
              <div style={styles.sidePersonaQuote}>
                 <span style={styles.quoteMark}>"</span>
                 {classify(totals.C) === 'high' ? "If we can't repeat it, we don't really own it. I want systems that hold up when I'm not in the room." :
                  classify(totals.C) === 'low' ? "I'd rather hire people who can figure it out than write a manual for every situation." :
                  "Build the structure for what's predictable. Leave room for judgment on everything else."}
              </div>

              <div style={styles.scaleWrapper}>
                <div style={styles.scaleLabels}><span>ADAPTIVE</span><span>SYSTEMIC</span></div>
                <div style={styles.scaleLine}><div style={{ ...styles.scaleDot, left: `${getPos(totals.C, 8)}%` }} /></div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 04: WHERE YOU CREATE FRICTION */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.h2}>04. Where You Create Friction</h2>
          </div>
          <div style={styles.contentGrid}>
            <div style={styles.column}>
              <p style={styles.pBody}>
                {classify(totals.C) === 'high'
                  ? `People who move fast can find your standards frustrating. What feels like rigor to you reads as a bottleneck to them.`
                  : classify(totals.C) === 'low'
                  ? `The tension you create usually shows up downstream. The people who care about process often feel like they're cleaning up after you.`
                  : `Your friction shows up in both directions. You can frustrate the people who want certainty and the ones who want speed, often in the same meeting.`}
              </p>
              <p style={{...styles.pBody, marginTop: '15px'}}>
                {classify(totals.C) === 'high'
                  ? `Faster teams will sometimes label you the blocker. But you're the one building the thing that lets the work scale without falling apart.`
                  : classify(totals.C) === 'low'
                  ? `Teams that value polish will push back on you. You believe the market's feedback is worth more than a perfect first draft, and you're willing to prove it.`
                  : `You're the one raising the uncomfortable question. Is the delay worth it? Is the speed worth the debt? You make the team sit with that.`}
              </p>
            </div>
            <div style={styles.rightColumn}>
              <div style={{ width: '300px', boxSizing: 'border-box' }}>
                <div style={styles.visualBox}>
                  <div style={styles.visualLabel}>FRICTION SOURCE</div>
                  <div style={styles.visualValue}>{classify(totals.C) === 'high' ? "HIGH STANDARDS" : classify(totals.C) === 'low' ? "MOVING FAST" : "HOLDING BOTH"}</div>
                </div>
			<div style={styles.captionContainer}>
			  <div style={styles.captionAccent} />
			  <p style={styles.captionText}>
			    {classify(totals.C) === 'high'
			      ? "Your standards create resistance. Teams that move fast will feel it."
			      : classify(totals.C) === 'low'
			      ? "Your pace creates gaps. Detail-oriented teammates often fill them."
			      : "You sit between the 'move fast' crowd and the 'do it right' crowd. You likely frustrate both by insisting on speed when they want polish, and polish when they want speed."}
			  </p>
			</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 05: WORKING WITH FIRSTNAME */}
        <section style={styles.manualBlock}>
          <h2 style={styles.h2}>05. Working with {firstName}: A Quick Guide for Your Team</h2>

          {/* E / A / N insight cards */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', margin: '30px 0 40px 0' }}>
            {[
              { label: 'PROCESSING STYLE', v: totals.E, cl: classifyShort,
                desc: { high: "You think out loud. Debate is how you find what's worth keeping.", low: "You think before you speak. Your best work happens before the meeting.", integrative: "You shift modes. Sometimes you need the debate. Sometimes you need the quiet." }},
              { label: 'CONFLICT STYLE', v: totals.A, cl: classifyShort,
                desc: { high: "You protect the relationship first. Harmony is a precondition for good work, not a compromise.", low: "You go straight for the truth. Fixing it fast beats managing feelings around it.", integrative: "You pick your battles. You know when to push and when to let it land differently." }},
              { label: 'PRESSURE RESPONSE', v: totals.N, cl: classifyShort,
                desc: { high: "Pressure sharpens your risk awareness. You won't move until the contingencies are covered.", low: "Pressure doesn't move the needle for you. You steady the room when others can't.", integrative: "You stay focused and keep scanning. Neither panicking nor ignoring the warning signs." }},
            ].map((item, i) => {
              const s = item.cl(item.v);
              return (
                <div key={i} style={{ flex: '1 1 180px', borderTop: '2px solid #000', paddingTop: '15px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#999', letterSpacing: '1px', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#ff0000', marginBottom: '10px', letterSpacing: '1px' }}>{s.toUpperCase()}</div>
                  <p style={{ fontSize: '0.82rem', lineHeight: '1.55', color: '#333', margin: 0 }}>{item.desc[s]}</p>
                </div>
              );
            })}
          </div>

          <div style={styles.pillarGrid}>
            <div style={styles.pillar}>
              <h4 style={styles.h4}>01. How I Think Through Problems</h4>
              <p style={styles.smallBody}>
                {classifyShort(totals.E) === 'high' ? "I think out loud. Brainstorming with me looks like a back-and-forth. If you agree too fast, I'll wonder if you've really thought it through." :
                 classifyShort(totals.E) === 'low' ? "I think better when I have time to sit with it. Send me the context ahead of time. I'll show up with better answers." :
                 "I read the room and adjust. I can lead the debate or step back and help synthesize. Depends on what's needed."}
              </p>
              <ul style={{ ...styles.smallBody, paddingLeft: '18px', marginTop: '10px', listStyleType: 'none' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>How to work with me:</strong> {
                    classifyShort(totals.E) === 'high' ? "Push back in the room. I respect people who challenge the idea, not just agree with it." :
                    classifyShort(totals.E) === 'low' ? "Send me the brief beforehand. I'll be sharper if I've had time to think." :
                    "Tell me upfront what you need. Sounding board or strategic partner. I'll match my approach to yours."
                  }
                </li>
                <li>
                  <strong>Avoid:</strong> {
                    classifyShort(totals.E) === 'high' ? "Going quiet or just nodding along. I'll read it as disengagement." :
                    classifyShort(totals.E) === 'low' ? "Asking me to decide on the spot. I need time to think before I can give you a real answer." :
                    "Expecting me to show up the same way every time. My approach changes based on what the work needs."
                  }
                </li>
              </ul>
            </div>

            <div style={styles.pillar}>
              <h4 style={styles.h4}>02. Feedback and Conflict</h4>
              <p style={styles.smallBody}>
                {classifyShort(totals.A) === 'low' ? "Be direct. I don't take work personally. Tell me the hard truth early so we can fix it and move on." :
                 classifyShort(totals.A) === 'high' ? "I care about the team dynamic. A safe, trusting team does better work. That's not soft. That's strategy." :
                 "I'm direct when I need to be. But I pay attention to how things land. Both matter."}
              </p>
              <ul style={{ ...styles.smallBody, paddingLeft: '18px', marginTop: '10px', listStyleType: 'none' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>How to work with me:</strong> {
                    classifyShort(totals.A) === 'low' ? "Lead with the real problem. I'd rather know what's broken than be walked to it slowly." :
                    classifyShort(totals.A) === 'high' ? "Frame feedback as a shared goal. How does this help the team win? That framing lands better with me." :
                    "Read the room. How direct to be depends on how urgent the situation is."
                  }
                </li>
                <li>
                  <strong>Avoid:</strong> {
                    classifyShort(totals.A) === 'low' ? "Burying the lead. I can handle the truth. Softening it wastes both our time." :
                    classifyShort(totals.A) === 'high' ? "Calling someone out publicly. Feedback lands better in private." :
                    "Mistaking politeness for weakness. I have strong opinions. I'm just choosing how to land them."
                  }
                </li>
              </ul>
            </div>

            <div style={styles.pillar}>
              <h4 style={styles.h4}>03. Under Pressure</h4>
              <p style={styles.smallBody}>
                {classifyShort(totals.N) === 'high' ? "Under pressure, I focus on what could go wrong. Show me the contingency plan. I need to know we've thought it through." :
                 classifyShort(totals.N) === 'low' ? "Pressure doesn't change my pace. I cut through the noise and focus on what actually matters. Use me to steady the room." :
                 "I stay focused and keep scanning. When things shift fast, I want to check in often to make sure our plan still makes sense."}
              </p>
              <ul style={{ ...styles.smallBody, paddingLeft: '18px', marginTop: '10px', listStyleType: 'none' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>How to work with me:</strong> {
                    classifyShort(totals.N) === 'high' ? "Walk me through the contingencies before we're in the middle of it. That's when I'm most effective." :
                    classifyShort(totals.N) === 'low' ? "Stay solution-focused. I work best when we treat the problem as something to solve, not something to worry about." :
                    "Keep me in the loop as things change. Small updates often beat one big one late."
                  }
                </li>
                <li>
                  <strong>Avoid:</strong> {
                    classifyShort(totals.N) === 'high' ? "Telling me not to worry. I need the facts, not reassurance." :
                    classifyShort(totals.N) === 'low' ? "Manufacturing urgency. I do better when we stay methodical." :
                    "Holding back bad news. Tell me early. I'd rather help fix it than be surprised by it later."
                  }
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 06: WHERE TO FOCUS */}
        <section style={{ ...styles.section, borderTop: '1px solid #eee', paddingTop: '40px' }}>
          <h2 style={styles.h2}>06. Where to Focus</h2>
          <div style={styles.contentGrid}>
            <div style={styles.column}>
              <h3 style={styles.h3}>Development Edge</h3>
              <div style={{ padding: '18px 20px', background: '#fff8f8', borderLeft: '4px solid #ff0000', marginBottom: '16px' }}>
                <p style={{ ...styles.pBody, fontWeight: '700', marginBottom: '6px', fontSize: '0.85rem' }}>Watch for this:</p>
                <p style={{ ...styles.pBody, marginBottom: 0 }}>{edge.w}</p>
              </div>
              <div style={{ padding: '18px 20px', background: '#f9f9f9', borderLeft: '4px solid #000' }}>
                <p style={{ ...styles.pBody, fontWeight: '700', marginBottom: '6px', fontSize: '0.85rem' }}>One thing to try:</p>
                <p style={{ ...styles.pBody, marginBottom: 0 }}>{edge.g}</p>
              </div>
            </div>
            <div style={styles.rightColumn}>
              <div style={{ width: '300px', boxSizing: 'border-box' }}>
                <div style={styles.visualBox}>
                  <div style={styles.visualLabel}>IDEAL CONDITIONS</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '500', lineHeight: '1.55', marginTop: '8px', color: 'rgba(255,255,255,0.85)' }}>{idealLine}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 07: HOW TO READ YOUR SCORES */}
        <section style={{ ...styles.section, marginTop: '80px', borderTop: '2px solid #000', paddingTop: '40px' }}>
          <h2 style={styles.h2}>07. How to Read Your Scores</h2>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginTop: '30px' }}>
            <table style={{ minWidth: '600px', width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                  <th style={{ padding: '10px', fontWeight: '800' }}>TRAIT</th>
                  <th style={{ padding: '10px', fontWeight: '800' }}>HIGH</th>
                  <th style={{ padding: '10px', fontWeight: '800' }}>LOW</th>
                  <th style={{ padding: '10px', fontWeight: '800' }}>INTEGRATIVE</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px 10px', fontWeight: '700' }}>Openness</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classify(totals.O), 'high') }}>Possibility-focused</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classify(totals.O), 'low') }}>Evidence-driven</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classify(totals.O), 'integrative') }}>Context-dependent</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px 10px', fontWeight: '700' }}>Conscientiousness</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classify(totals.C), 'high') }}>Systems and standards</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classify(totals.C), 'low') }}>Speed and flexibility</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classify(totals.C), 'integrative') }}>Structure where it counts</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px 10px', fontWeight: '700' }}>Extraversion</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.E), 'high') }}>Thinks out loud</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.E), 'low') }}>Thinks privately</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.E), 'integrative') }}>Reads the room</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px 10px', fontWeight: '700' }}>Agreeableness</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.A), 'high') }}>Builds trust and consensus</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.A), 'low') }}>Direct, prefers hard truths</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.A), 'integrative') }}>Calibrates to situation</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px 10px', fontWeight: '700' }}>Resilience</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.N), 'high') }}>Careful under pressure</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.N), 'low') }}>Calm when things break</td>
                  <td style={{ padding: '15px 10px', ...getCellHighlight(classifyShort(totals.N), 'integrative') }}>Steady and scanning</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LEGEND */}
          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { label: 'OPENNESS', score: totals.O, desc: { high: "You focus on what's possible. You're drawn to new angles and future potential.", low: "You're grounded in evidence. Skeptical of speculation and protective of what works.", integrative: "You think big, but you want to see it work before fully committing." } },
              { label: 'CONSCIENTIOUSNESS', score: totals.C, desc: { high: "You build for quality and consistency. Repeatable output is your benchmark.", low: "You move fast and trust people. Speed matters more than perfect process.", integrative: "You put structure where it's needed and leave flexibility everywhere else." } },
              { label: 'EXTRAVERSION', score: totals.E, desc: { high: "You think out loud. Debate sharpens your ideas.", low: "You need quiet time to think. You come prepared.", integrative: "You read the room and adjust how you show up." } },
              { label: 'AGREEABLENESS', score: totals.A, desc: { high: "You care about team trust and psychological safety.", low: "You're direct. You prefer hard truths to soft ones.", integrative: "You calibrate your directness to what the situation needs." } },
              { label: 'RESILIENCE', score: totals.N, desc: { high: "You're careful under pressure. You need the contingency plan.", low: "You stay calm when things break. You steady the room.", integrative: "You stay focused and keep scanning for what's shifting." } }
            ].map((item, idx) => {
              const status = (item.label === 'OPENNESS' || item.label === 'CONSCIENTIOUSNESS') ? classify(item.score) : classifyShort(item.score);
              return (
                <div key={idx} style={{ padding: '15px', border: '1px solid #eee', background: '#fcfcfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '900', color: '#999' }}>{item.label}</span>
                    <span style={{ fontSize: '9px', fontWeight: '900', color: '#ff0000' }}>{status.toUpperCase()}</span>
                  </div>
                  <p style={{ ...styles.smallBody, margin: 0, fontSize: '0.8rem' }}>{item.desc[status]}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CTA BOX */}
        <div style={{
          margin: '60px 0 40px 0',
          padding: '28px 30px',
          background: '#000',
          borderLeft: '4px solid #ff0000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: '#666', marginBottom: '6px' }}>DIESH.CA</div>
            <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '1rem', lineHeight: '1.5' }}>
              Want to understand how you and your team work?
            </p>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
              Get Your Free Assessment
            </p>
          </div>
          <a
            href="https://personality.diesh.ca/"
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#ff0000',
              color: '#fff',
              padding: '12px 24px',
              fontWeight: '700',
              fontSize: '0.88rem',
              textDecoration: 'none',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            Get Your Free Assessment
          </a>
        </div>

        <footer style={styles.footer}>
          <div style={{ marginBottom: '10px', color: '#666', fontWeight: '700', letterSpacing: '1px' }}>
            DIESH // {new Date().getFullYear()}
          </div>
          <p style={{ margin: 0, lineHeight: '1.5' }}>
            This report is for coaching and development purposes only. It's personal to <strong>{data.clientName || "the intended recipient"}</strong> and shared with Gagan Diesh. It's not a clinical tool and shouldn't be used for medical or psychiatric assessment.
          </p>
          <div style={{ marginTop: '10px', opacity: 0.8 }}>
            Copyright © {new Date().getFullYear()} Gagan Diesh for DesignStamp.
          </div>
        </footer>
      </div>
    </div>
  );
};

const styles = {
  page: { backgroundColor: '#fcfcfc', color: '#111', minHeight: '100vh', fontFamily: '"Inter", sans-serif', padding: '20px 10px' },
  container: { maxWidth: '1000px', margin: '0 auto', backgroundColor: '#fff', border: '1px solid #eee', padding: '5% 7%', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' },
  utility: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  header: { borderBottom: '2px solid #000', paddingBottom: '30px', marginBottom: '40px' },
  headerTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
  shareContainer: { textAlign: 'right', marginBottom: '10px' },
    shareBtn: { 
      background: '#0077b5', 
      color: '#fff', 
      padding: '8px 16px', 
      border: 'none', 
      borderRadius: '4px', 
      cursor: 'pointer',
      fontWeight: 'bold'
    },
  tag: { fontSize: '10px', letterSpacing: '2px', fontWeight: 'bold', color: '#999' },
  h1: { fontSize: 'calc(1.8rem + 1.5vw)', margin: '0', fontWeight: '900', letterSpacing: '-1.5px' },
  subhead: { fontSize: '0.85rem', color: '#666', letterSpacing: '1.5px', marginTop: '10px', fontWeight: '600' },
  section: { marginBottom: '60px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' },
  h2: { fontSize: '1.3rem', fontWeight: '800', margin: '0' },
  traitLabel: { fontSize: '9px', fontWeight: '900', color: '#ff0000', letterSpacing: '1px' },
  pullquote: { margin: '0 0 30px 0', padding: '0 0 0 20px', fontSize: '1.1rem', fontWeight: '700', lineHeight: '1.5', color: '#000', fontStyle: 'italic', borderLeft: '4px solid #ff0000' },

  contentGrid: { display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'space-between' },
  column: { flex: '1 1 300px', textAlign: 'left' },
  rightColumn: {
    flex: '0 0 300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    textAlign: 'left'
  },
  
  captionContainer: {
    width: '300px',
    boxSizing: 'border-box',
    padding: '24px 0', 
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  
  captionAccent: {
    width: '2px',
    height: '42px',
    background: 'linear-gradient(to bottom, #ff0000, rgba(255,0,0,0.05))',
    flexShrink: 0,
    marginTop: '4px'
  },

  captionText: {
    fontSize: '0.88rem',
    color: '#111',
    lineHeight: '1.6',
    margin: 0,
    fontWeight: '500',
    letterSpacing: '-0.1px'
  },

  visualBox: { 
    background: '#000', 
    color: '#fff', 
    padding: '28px 20px', 
    borderRadius: '2px', 
    textAlign: 'center', 
    width: '300px', 
    boxSizing: 'border-box',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
  },

  block: { marginBottom: '25px' },
  pLabel: { fontSize: '1rem', marginBottom: '6px', fontWeight: '600' },
  pBody: { fontSize: '0.95rem', lineHeight: '1.6', color: '#333', marginBottom: '10px' },
  h3: { fontSize: '0.8rem', fontWeight: '800', marginBottom: '15px', textTransform: 'uppercase', color: '#999' },

  scaleWrapper: { background: '#fcfcfc', padding: '20px', border: '1px solid #f0f0f0', width: '300px', boxSizing: 'border-box' },
  sidePersonaQuote: {
    padding: '20px',
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: '4px',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#000',
    position: 'relative',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    width: '300px',
    boxSizing: 'border-box'
  },

  scaleLine: { height: '2px', background: '#e0e0e0', position: 'relative', marginTop: '12px' },
  scaleDot: { position: 'absolute', top: '-7px', width: '16px', height: '16px', background: '#ff0000', borderRadius: '50%', border: '3px solid #fff' },
  scaleLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: '900', color: '#999' },
  visualLabel: { fontSize: '9px', fontWeight: 'bold', color: '#666', marginBottom: '10px', letterSpacing: '1px' },
  visualValue: { fontSize: '0.85rem', fontWeight: '900' },
  visualCaption: { borderLeft: '4px solid #ff0000', background: '#f9f9f9', padding: '14px 14px 14px 18px' },
  visualCaptionText: { fontSize: '0.82rem', color: '#444', lineHeight: '1.55', margin: 0, fontStyle: 'italic' },
  manualBlock: { background: '#f9f9f9', padding: '30px 20px', borderLeft: '5px solid #000' },
  pillarGrid: { display: 'flex', flexWrap: 'wrap', gap: '30px', marginTop: '30px' },
  pillar: { flex: '1 1 200px', borderTop: '1px solid #ddd', paddingTop: '15px' },
  h4: { fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', color: '#ff0000' },
  smallBody: { fontSize: '0.8rem', lineHeight: '1.5', color: '#444' },
  footer: { marginTop: '60px', borderTop: '2px solid #111', paddingTop: '20px', fontSize: '9px', color: '#444', textAlign: 'left' },
  quoteMark: {
    position: 'absolute',
    top: '-10px',
    left: '10px',
    fontSize: '2.5rem',
    color: '#ff0000',
    fontFamily: 'serif',
    opacity: 0.15
  }
};

export default Report;