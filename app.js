// Main Application Controller (Python-Flask Integrated Frontend)
import { MOCK_QUESTIONS, getQuestionsByRole, getRoleLabel } from './mockData.js';
import { speak, stopSpeaking, SpeechTranscriber } from './speech.js';

// Get API Key from localStorage (passed to python backend on demand)
function getApiKey() {
  return localStorage.getItem("interview_analyzer_gemini_key") || "";
}

function saveApiKey(key) {
  if (key) {
    localStorage.setItem("interview_analyzer_gemini_key", key.trim());
  } else {
    localStorage.removeItem("interview_analyzer_gemini_key");
  }
}

// Elements
const elLogoHome = document.getElementById('btn-logo-home');
const elNavNew = document.getElementById('btn-nav-new');
const elNavSettings = document.getElementById('btn-nav-settings');

// Screens
const screens = {
  dashboard: document.getElementById('screen-dashboard'),
  setup: document.getElementById('screen-setup'),
  room: document.getElementById('screen-interview-room'),
  report: document.getElementById('screen-report'),
  settings: document.getElementById('screen-settings')
};

// State
let appState = {
  currentScreen: 'dashboard',
  sessions: [],
  activeSession: null,
  transcriber: null,
  webcamStream: null,
  questionTimerInterval: null,
  questionTimeSeconds: 0
};

// Initial Load
window.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // Route Handlers
  elLogoHome.addEventListener('click', () => switchScreen('dashboard'));
  elNavNew.addEventListener('click', () => switchScreen('setup'));
  elNavSettings.addEventListener('click', () => switchScreen('settings'));

  // Dashboard buttons
  document.getElementById('btn-clear-history').addEventListener('click', clearHistory);

  // Setup form
  document.getElementById('setup-form').addEventListener('submit', handleSetupSubmit);
  document.getElementById('btn-setup-cancel').addEventListener('click', () => switchScreen('dashboard'));

  // Room buttons
  document.getElementById('btn-room-quit').addEventListener('click', quitInterview);
  document.getElementById('btn-room-mic').addEventListener('click', toggleMic);
  document.getElementById('btn-room-next').addEventListener('click', handleNextQuestion);

  // Report buttons
  document.getElementById('btn-report-home').addEventListener('click', () => switchScreen('dashboard'));

  // Settings form
  document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);
  document.getElementById('btn-settings-cancel').addEventListener('click', () => switchScreen('dashboard'));
  
  // Load API Key to inputs
  document.getElementById('settings-api-key').value = getApiKey();

  // Make room transcript editable (for correction)
  const roomTranscript = document.getElementById('room-transcript');
  roomTranscript.addEventListener('focus', () => {
    if (roomTranscript.classList.contains('placeholder-active')) {
      roomTranscript.innerHTML = '';
      roomTranscript.classList.remove('placeholder-active');
    }
  });

  // Setup Speech recognition callback
  appState.transcriber = new SpeechTranscriber(
    (text, isFinal) => {
      updateTranscriptDisplay(text);
    },
    (status, error) => {
      updateMicUI(status, error);
    }
  );

  // Load history from Python backend database and draw dashboard
  await loadHistory();
  renderDashboard();
  switchScreen('dashboard');
}

// ROUTER
async function switchScreen(screenName) {
  // Stop active states when leaving interview room
  if (appState.currentScreen === 'room' && screenName !== 'room') {
    cleanupInterviewRoom();
  }

  // Hide all screens
  Object.values(screens).forEach(screen => {
    screen.classList.remove('active');
  });

  // Show active screen
  screens[screenName].classList.add('active');
  appState.currentScreen = screenName;

  // Render operations specific to target screen
  if (screenName === 'dashboard') {
    await loadHistory();
    renderDashboard();
  } else if (screenName === 'settings') {
    document.getElementById('settings-api-key').value = getApiKey();
  }
}

// BACKEND API PERSISTENCE
async function loadHistory() {
  try {
    const response = await fetch('/api/history');
    if (!response.ok) throw new Error("Could not load history from Python server");
    appState.sessions = await response.json();
  } catch (e) {
    console.error("Failed to load history from Flask:", e);
    appState.sessions = [];
  }
}

async function saveSessionToHistory(session) {
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(session)
    });
    if (!response.ok) throw new Error("Could not save session on Python database");
  } catch (e) {
    console.error("Failed to sync session write with Flask:", e);
  }
}

async function clearHistory() {
  if (confirm("Are you sure you want to delete all practice session logs? This cannot be undone.")) {
    try {
      const response = await fetch('/api/clear_history', {
        method: 'POST'
      });
      if (response.ok) {
        appState.sessions = [];
        renderDashboard();
        showToast("History cleared successfully", "info");
      }
    } catch (e) {
      console.error("Failed to clear database logs:", e);
      showToast("Clear logs failed", "error");
    }
  }
}

// DASHBOARD RENDERING
function renderDashboard() {
  const total = appState.sessions.length;
  document.getElementById('stat-total-interviews').innerText = total;

  const btnClear = document.getElementById('btn-clear-history');
  if (total > 0) {
    btnClear.style.display = 'block';

    // Calculate Average Score
    const totalScore = appState.sessions.reduce((acc, curr) => acc + curr.score, 0);
    const avgScore = Math.round(totalScore / total);
    document.getElementById('stat-avg-score').innerText = `${avgScore}%`;

    // Rating Label
    let rating = "Needs Practice";
    if (avgScore >= 85) rating = "Excellent";
    else if (avgScore >= 70) rating = "Proficient";
    document.getElementById('stat-avg-rating').innerText = rating;

    // Last Active Date
    const lastSession = appState.sessions[0];
    const lastDate = new Date(lastSession.date);
    document.getElementById('stat-last-active').innerText = `Last active: ${lastDate.toLocaleDateString()}`;

    // Best Skill Category
    const categoryTotals = { technical: 0, clarity: 0, delivery: 0, confidence: 0 };
    const categoryCounts = { technical: 0, clarity: 0, delivery: 0, confidence: 0 };

    appState.sessions.forEach(s => {
      if (s.categories) {
        Object.keys(categoryTotals).forEach(cat => {
          if (s.categories[cat] > 0) {
            categoryTotals[cat] += s.categories[cat];
            categoryCounts[cat]++;
          }
        });
      }
    });

    let bestSkill = "None";
    let maxAvg = 0;
    
    Object.keys(categoryTotals).forEach(cat => {
      const avg = categoryCounts[cat] > 0 ? categoryTotals[cat] / categoryCounts[cat] : 0;
      if (avg > maxAvg) {
        maxAvg = avg;
        bestSkill = cat.charAt(0).toUpperCase() + cat.slice(1);
      }
    });

    document.getElementById('stat-best-skill').innerText = bestSkill;

  } else {
    btnClear.style.display = 'none';
    document.getElementById('stat-avg-score').innerText = "--%";
    document.getElementById('stat-avg-rating').innerText = "-";
    document.getElementById('stat-last-active').innerText = "No sessions yet";
    document.getElementById('stat-best-skill').innerText = "--";
  }

  // Render recent session lists
  const sessionListContainer = document.getElementById('dashboard-sessions-list');
  sessionListContainer.innerHTML = '';

  if (total === 0) {
    sessionListContainer.innerHTML = `
      <div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
        <p style="font-size: 16px;">No practice history found.</p>
        <p style="font-size: 13.5px; margin-top: 8px;">Click "New Practice" at the top right to start your first mock session!</p>
      </div>
    `;
    return;
  }

  appState.sessions.forEach(session => {
    const card = document.createElement('div');
    card.className = 'glass-panel session-card';
    card.style.cursor = 'pointer';
    
    const dateObj = new Date(session.date);
    const dateFormatted = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let scoreClass = 'score-low';
    if (session.score >= 85) scoreClass = 'score-high';
    else if (session.score >= 70) scoreClass = 'score-medium';

    card.innerHTML = `
      <div class="session-info">
        <div class="session-role">${session.roleLabel}</div>
        <div class="session-meta">
          <span>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ${dateFormatted}
          </span>
          <span>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            ${session.level} Level
          </span>
          <span>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
            </svg>
            ${session.type} Focus
          </span>
        </div>
      </div>
      <div class="score-badge ${scoreClass}">${session.score}</div>
    `;

    card.addEventListener('click', () => {
      renderReport(session);
      switchScreen('report');
    });

    sessionListContainer.appendChild(card);
  });
}

// SETUP SUBMIT
async function handleSetupSubmit(e) {
  e.preventDefault();
  
  const role = document.getElementById('setup-role').value;
  const level = document.getElementById('setup-level').value;
  const type = document.getElementById('setup-type').value;
  const count = parseInt(document.getElementById('setup-questions-count').value);

  // Pick questions
  const allRoleQuestions = getQuestionsByRole(role);
  // Shuffle questions randomly
  const shuffled = [...allRoleQuestions].sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, count);

  // Init Active Session state
  appState.activeSession = {
    date: new Date().toISOString(),
    role: role,
    roleLabel: getRoleLabel(role),
    level: level,
    type: type,
    questions: selectedQuestions,
    currentQuestionIndex: 0,
    answers: [],
    sessionDurationSeconds: 0
  };

  // Launch camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    appState.webcamStream = stream;
    const videoEl = document.getElementById('webcam-stream');
    videoEl.srcObject = stream;
    document.getElementById('webcam-placeholder').style.display = 'none';
  } catch (err) {
    console.warn("Webcam access denied or unavailable:", err);
    document.getElementById('webcam-placeholder').style.display = 'flex';
  }

  // Switch to room screen
  switchScreen('room');
  
  // Begin room loop
  loadQuestion(0);
}

// INTERVIEW ROOM
function loadQuestion(index) {
  if (!appState.activeSession) return;
  
  // Stop mic/speech
  appState.transcriber.stop();
  stopSpeaking();

  const session = appState.activeSession;
  session.currentQuestionIndex = index;

  // Update Question Counter UI
  document.getElementById('room-question-count').innerText = `QUESTION ${index + 1} OF ${session.questions.length}`;
  
  // Get Question Data
  const qData = session.questions[index];
  const qBox = document.getElementById('room-question-box');
  qBox.innerText = qData.question;

  // Clear transcription display
  const transArea = document.getElementById('room-transcript');
  transArea.innerHTML = '<span class="transcript-placeholder">Your transcript answers will stream here in real-time once you activate the microphone...</span>';
  transArea.classList.add('placeholder-active');
  transArea.contentEditable = "true";

  // Waveform reset
  const waveform = document.getElementById('room-waveform');
  waveform.classList.remove('speaking');

  // Next button label
  const btnNextText = document.querySelector('#btn-room-next span');
  if (index === session.questions.length - 1) {
    btnNextText.innerText = "Finish & Analyze";
  } else {
    btnNextText.innerText = "Next Question";
  }

  // Start synth TTS
  speak(
    qData.question,
    // Start Callback
    () => {
      waveform.classList.add('speaking');
    },
    // End Callback
    () => {
      waveform.classList.remove('speaking');
      // Automatically trigger Speech recognition once speaking completes!
      appState.transcriber.start();
    }
  );

  // Restart timer
  resetQuestionTimer();
}

function resetQuestionTimer() {
  clearInterval(appState.questionTimerInterval);
  appState.questionTimeSeconds = 0;
  
  const timerTag = document.getElementById('room-question-timer');
  timerTag.innerText = "00:00";

  appState.questionTimerInterval = setInterval(() => {
    appState.questionTimeSeconds++;
    const mins = Math.floor(appState.questionTimeSeconds / 60).toString().padStart(2, '0');
    const secs = (appState.questionTimeSeconds % 60).toString().padStart(2, '0');
    timerTag.innerText = `${mins}:${secs}`;
  }, 1000);
}

// SPEECH & MIC INTEGRATION
function toggleMic() {
  const isTranscribing = appState.transcriber.isListening;
  if (isTranscribing) {
    appState.transcriber.stop();
  } else {
    // Stop synthesis if it's talking
    stopSpeaking();
    document.getElementById('room-waveform').classList.remove('speaking');
    appState.transcriber.start();
  }
}

function updateMicUI(status, error) {
  const tag = document.getElementById('speaking-status-tag');
  const label = document.getElementById('speaking-status-label');
  const pulse = document.getElementById('speaking-pulse');
  const btn = document.getElementById('btn-room-mic');
  const btnText = document.getElementById('btn-room-mic-text');

  if (status === 'listening') {
    tag.className = 'listening-indicator';
    label.innerText = 'Listening';
    pulse.style.display = 'block';
    btn.className = 'btn btn-secondary btn-danger';
    btnText.innerText = 'Pause Mic';
  } else if (status === 'idle') {
    tag.className = 'listening-indicator idle';
    label.innerText = 'Mic Idle';
    pulse.style.display = 'none';
    btn.className = 'btn btn-success';
    btnText.innerText = 'Start Mic';
  } else if (status === 'error') {
    tag.className = 'listening-indicator idle';
    label.innerText = `Error: ${error || 'mic error'}`;
    pulse.style.display = 'none';
    btn.className = 'btn btn-success';
    btnText.innerText = 'Retry Mic';
  }
}

function updateTranscriptDisplay(text) {
  const transArea = document.getElementById('room-transcript');
  
  if (text.trim() === '') {
    if (!transArea.classList.contains('placeholder-active')) {
      transArea.innerHTML = '<span class="transcript-placeholder">Your transcript answers will stream here in real-time once you activate the microphone...</span>';
      transArea.classList.add('placeholder-active');
    }
  } else {
    transArea.classList.remove('placeholder-active');
    transArea.innerText = text;
  }
}

// NEXT QUESTION OR COMPLETE
async function handleNextQuestion() {
  if (!appState.activeSession) return;
  
  const session = appState.activeSession;
  const currentIdx = session.currentQuestionIndex;
  
  // Get text response
  const transArea = document.getElementById('room-transcript');
  let answerText = "";
  if (!transArea.classList.contains('placeholder-active')) {
    answerText = transArea.innerText.trim();
  }

  // Double check if empty
  if (answerText === "" || answerText.length < 5) {
    if (!confirm("Your response transcript seems extremely short or empty. Do you want to submit this answer? (You can type directly into the box to adjust it).")) {
      return;
    }
  }

  // Stop listening/timers
  appState.transcriber.stop();
  clearInterval(appState.questionTimerInterval);
  session.sessionDurationSeconds += appState.questionTimeSeconds;

  // Push answer
  session.answers.push({
    question: session.questions[currentIdx].question,
    transcript: answerText,
    keywords: session.questions[currentIdx].keywords
  });

  if (currentIdx < session.questions.length - 1) {
    // Load next
    loadQuestion(currentIdx + 1);
  } else {
    // Finish
    await processFinalEvaluation();
  }
}

// Python API analysis call wrapper
async function requestAIAnalysis(roleLabel, question, transcript, expectedKeywords) {
  const apiKey = getApiKey();
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      roleLabel,
      question,
      transcript,
      expectedKeywords,
      apiKey // Send user's key if present, otherwise flask uses system ENV
    })
  });
  
  if (!response.ok) {
    throw new Error(`Server returned evaluation error: ${response.status}`);
  }
  return await response.json();
}

// Aggregate report scores
function generateSessionSummary(answers, roleLabel) {
  const totalScore = Math.round(answers.reduce((acc, curr) => acc + curr.analysis.score, 0) / answers.length);
  
  const cats = { technical: 0, clarity: 0, delivery: 0, confidence: 0 };
  let validTechnicalCount = 0;
  
  answers.forEach(ans => {
    const ac = ans.analysis.categories;
    if (ac.technical > 0) {
      cats.technical += ac.technical;
      validTechnicalCount++;
    }
    cats.clarity += ac.clarity;
    cats.delivery += ac.delivery;
    cats.confidence += ac.confidence;
  });

  const count = answers.length;
  const categories = {
    technical: validTechnicalCount > 0 ? Math.round(cats.technical / validTechnicalCount) : 0,
    clarity: Math.round(cats.clarity / count),
    delivery: Math.round(cats.delivery / count),
    confidence: Math.round(cats.confidence / count)
  };

  let recommendation = "";
  if (totalScore >= 85) {
    recommendation = `Outstanding performance! Your responses for the ${roleLabel} role show strong technical maturity, clear architectural structures, and high delivery confidence. You are well-prepared. Keep practicing to maintain this level of fluency.`;
  } else if (totalScore >= 70) {
    recommendation = `Good job. You demonstrate solid knowledge in several key areas. However, your delivery can be enhanced by eliminating filler words and including more specific terms (like architectural keywords). Focus on structuring your answers using the STAR format.`;
  } else {
    recommendation = `Needs development. You have the foundational ideas, but you need to expand your explanations significantly and review the core terms. Practice talking out loud, record yourself, and focus on replacing filler phrases with brief pauses to sound more authoritative.`;
  }

  return {
    score: totalScore,
    categories,
    recommendation
  };
}

// EVALUATE INTERVIEW
async function processFinalEvaluation() {
  const overlay = document.getElementById('loading-overlay');
  const overlayText = document.getElementById('loading-text');
  
  overlayText.innerText = "Transmitting to Python AI server...";
  overlay.style.display = 'flex';

  const session = appState.activeSession;

  try {
    // Run evaluations in parallel on python server
    const analysisPromises = session.answers.map(ans => 
      requestAIAnalysis(session.roleLabel, ans.question, ans.transcript, ans.keywords)
    );

    const results = await Promise.all(analysisPromises);
    
    // Bind evaluations back to answers list
    results.forEach((result, idx) => {
      session.answers[idx].analysis = result;
    });

    // Generate session totals
    const finalSummary = generateSessionSummary(session.answers, session.roleLabel);
    
    // Construct final session object
    const completedSession = {
      id: 'session_' + Date.now(),
      date: session.date,
      role: session.role,
      roleLabel: session.roleLabel,
      level: session.level,
      type: session.type,
      score: finalSummary.score,
      categories: finalSummary.categories,
      duration: session.sessionDurationSeconds,
      answers: session.answers
    };

    // Save to history database (Python database write)
    await saveSessionToHistory(completedSession);

    // Render report
    renderReport(completedSession);

    // Success toast
    showToast("Interview evaluated successfully!", "success");

    // Hide loader & route
    overlay.style.display = 'none';
    await switchScreen('report');

  } catch (error) {
    overlay.style.display = 'none';
    showToast("Analysis Error: " + error.message, "error");
    console.error("Critical analysis exception:", error);
  }
}

function quitInterview() {
  if (confirm("Are you sure you want to quit this interview? Your current progress will be lost.")) {
    switchScreen('dashboard');
  }
}

function cleanupInterviewRoom() {
  // Turn off mic
  if (appState.transcriber) {
    appState.transcriber.stop();
  }
  // Turn off speaker
  stopSpeaking();
  // Clear timers
  clearInterval(appState.questionTimerInterval);
  // Turn off webcam tracks
  if (appState.webcamStream) {
    appState.webcamStream.getTracks().forEach(track => track.stop());
    appState.webcamStream = null;
  }
}

// REPORT RENDERING
function renderReport(session) {
  // Title & Metadata
  document.getElementById('report-title-label').innerText = `Evaluation: ${session.roleLabel}`;
  
  const dateObj = new Date(session.date);
  const dateFormatted = dateObj.toLocaleDateString() + ' @ ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const mins = Math.floor(session.duration / 60);
  const secs = session.duration % 60;
  
  document.getElementById('report-meta-label').innerText = 
    `${session.level} Level | ${session.type} Focus | Time: ${mins}m ${secs}s | Conducted: ${dateFormatted}`;

  // Radial score progress
  const scoreVal = document.getElementById('report-score-value');
  scoreVal.innerText = session.score;

  // Set colors based on score
  const wrapper = document.querySelector('.radial-progress-wrapper');
  wrapper.className = 'radial-progress-wrapper';
  if (session.score >= 85) wrapper.classList.add('score-high');
  else if (session.score >= 70) wrapper.classList.add('score-medium');
  else wrapper.classList.add('score-low');

  // Animate SVG Radial circle
  const circleFill = document.getElementById('report-radial-fill');
  const strokeOffset = 440 - (440 * session.score) / 100;
  
  // Set inline styles (timeout guarantees trigger post rendering)
  setTimeout(() => {
    circleFill.style.strokeDashoffset = strokeOffset;
  }, 100);

  // Recommendations text
  let summaryText = "";
  if (session.score >= 85) {
    summaryText = `Outstanding performance! Your responses for the ${session.roleLabel} track show solid technical understanding, highly logical communication, and confident phrasing. Recommended path: proceed to real live panel calls.`;
  } else if (session.score >= 70) {
    summaryText = `Good foundational skills. You answered most questions appropriately, but there are opportunities to expand details, reduce verbal filler words (such as 'like' or 'basically'), and include specific technical keywords.`;
  } else {
    summaryText = `Needs refinement. Answers were brief or missing critical key technical terms. Focus on structuring responses using the STAR method, and practice speaking slowly while replacing filler words with slight silent pauses.`;
  }
  document.getElementById('report-recommendation-box').innerText = session.recommendation || summaryText;

  // Categories progress bars
  const categoriesList = [
    { key: 'technical', bar: 'cat-fill-technical', rating: 'cat-rating-technical', score: 'cat-score-technical' },
    { key: 'clarity', bar: 'cat-fill-clarity', rating: 'cat-rating-clarity', score: 'cat-score-clarity' },
    { key: 'delivery', bar: 'cat-fill-delivery', rating: 'cat-rating-delivery', score: 'cat-score-delivery' },
    { key: 'confidence', bar: 'cat-fill-confidence', rating: 'cat-rating-confidence', score: 'cat-score-confidence' }
  ];

  categoriesList.forEach(cat => {
    const val = session.categories?.[cat.key] || 0;
    
    // Bar fill
    const fillEl = document.getElementById(cat.bar);
    setTimeout(() => {
      fillEl.style.width = `${val}%`;
    }, 200);

    // Labels
    document.getElementById(cat.score).innerText = `${val}/100`;
    
    let rate = 'Low';
    if (val >= 85) rate = 'Excellent';
    else if (val >= 70) rate = 'Good';
    else if (val >= 50) rate = 'Average';
    
    if (cat.key === 'technical' && session.categories?.technical === 0) {
      document.getElementById(cat.score).innerText = 'N/A';
      rate = 'N/A';
      fillEl.style.width = '0%';
    }

    document.getElementById(cat.rating).innerText = rate;
  });

  // Questions detailed breakdown
  const detailsList = document.getElementById('report-details-list');
  detailsList.innerHTML = '';

  session.answers.forEach((ans, idx) => {
    const qCard = document.createElement('div');
    qCard.className = 'glass-panel report-item';

    // Keywords badges
    const expected = ans.keywords || [];
    const matched = ans.analysis?.keywordsMatched || [];
    
    let keywordsHtml = '';
    if (expected.length > 0) {
      keywordsHtml = `
        <div class="keyword-badges">
          <span class="keyword-badges-label">Keywords Checked:</span>
          ${expected.map(kw => {
            const hasMatched = matched.some(m => m.toLowerCase() === kw.toLowerCase());
            const badgeStyle = hasMatched 
              ? 'background: rgba(16, 185, 129, 0.15); color: var(--color-success); border-color: rgba(16, 185, 129, 0.3);'
              : 'background: rgba(255, 255, 255, 0.03); color: var(--text-muted); border-color: var(--glass-border);';
            return `<span class="keyword-badge" style="${badgeStyle}">${kw}</span>`;
          }).join('')}
        </div>
      `;
    }

    let scoreClass = 'score-low';
    if (ans.analysis?.score >= 85) scoreClass = 'score-high';
    else if (ans.analysis?.score >= 70) scoreClass = 'score-medium';

    qCard.innerHTML = `
      <div class="report-item-header">
        <div class="report-question">Q${idx + 1}: ${ans.question}</div>
        <div class="score-badge ${scoreClass}">${ans.analysis?.score || 0}</div>
      </div>
      
      <div class="report-transcript">
        <span>Your Transcript Response:</span>
        "${ans.transcript || 'No response recorded.'}"
      </div>
      
      <div class="report-analysis">
        <span>AI Evaluator Feedback:</span>
        ${ans.analysis?.feedback || 'No evaluation feedback generated.'}
      </div>

      ${keywordsHtml}
    `;

    detailsList.appendChild(qCard);
  });
}

// SETTINGS ACTIONS
function handleSettingsSubmit(e) {
  e.preventDefault();
  const key = document.getElementById('settings-api-key').value;
  
  saveApiKey(key);
  showToast("AI Model configuration updated!", "success");
  
  setTimeout(() => {
    switchScreen('dashboard');
  }, 500);
}

// TOAST NOTIFICATIONS
function showToast(text, type = "info") {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  toast.className = 'toast'; // reset
  toast.classList.add(`toast-${type}`);
  toastText.innerText = text;

  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
