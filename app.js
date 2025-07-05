const form = document.getElementById('workout-form');
const exerciseInput = document.getElementById('exercise');
const repsInput = document.getElementById('reps');
const weightInput = document.getElementById('weight');
const flexLogList = document.getElementById('logs');
const moveList = document.getElementById('exercise-list');
const nukeLogBtn = document.getElementById('clear-log');
const exportLogBtn = document.getElementById('export-log');
const importLogBtn = document.getElementById('import-log');
const onermDisplay = document.getElementById('onerm-display');
const onermValue = document.getElementById('onerm-value');

const STORAGE_KEY = 'setcheck_logs';

// Table for rep max percentages (1-30 reps)
const REP_PERCENTAGES = [
  1, 0.97, 0.94, 0.92, 0.89, 0.86, 0.83, 0.81, 0.78, 0.75,
  0.73, 0.71, 0.70, 0.68, 0.67, 0.65, 0.64, 0.63, 0.61, 0.60,
  0.59, 0.58, 0.57, 0.56, 0.55, 0.54, 0.53, 0.52, 0.51, 0.50
];

function getLogs() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function getUniqueMoves() {
  const logs = getLogs();
  const unique = Array.from(new Set(logs.map(log => log.exercise).filter(Boolean)));
  return unique;
}

function updateMoveList() {
  const exercises = getUniqueMoves();
  moveList.innerHTML = '';
  exercises.forEach(ex => {
    const option = document.createElement('option');
    option.value = ex;
    moveList.appendChild(option);
  });
}

function updateOneRMDisplay() {
  const reps = repsInput.value;
  const weight = weightInput.value;
  
  if (reps && weight && reps > 0 && weight > 0) {
    const oneRM = calculateOneRepMax(weight, reps);
    if (oneRM) {
      onermValue.textContent = oneRM;
      onermDisplay.style.display = 'block';
    } else {
      onermDisplay.style.display = 'none';
    }
  } else {
    onermDisplay.style.display = 'none';
  }
}

function calculateOneRepMax(weight, reps) {
  reps = parseInt(reps, 10);
  weight = parseFloat(weight);
  if (reps < 1 || reps > 30 || isNaN(weight)) return null;
  const percent = REP_PERCENTAGES[reps - 1];
  if (!percent) return null;
  return Math.floor(weight / percent); // round down to nearest integer
}

// Format a date string as a human-friendly relative time
function formatRelativeTime(dateString) {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  if (diffWeek === 1) return 'last week';
  if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
  if (diffMonth === 1) return 'last month';
  return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
}

async function shareWorkoutImage(log) {
  // Create a canvas
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#fffbe6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw logo.svg in the top left
  try {
    const response = await fetch('logo.svg');
    const svgText = await response.text();
    const img = new window.Image();
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    await new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 20, 20, 64, 64);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  } catch (e) {
    // If logo fails to load, skip it
  }

  // Fun emoji
  ctx.font = '48px sans-serif';
  ctx.fillText('💪', 100, 70);

  // Workout info
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#222';
  ctx.fillText(`${log.exercise}`, 30, 120);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#444';
  ctx.fillText(`New PR: ${log.reps} reps @ ${log.weight} (${calculateOneRepMax(log.weight, log.reps)} 1RM)`, 30, 170);

  // Fun message
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#a08a6a';
  ctx.fillText('Beast mode unlocked! #SetCheck', 30, 220);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob(blob => {
      resolve(blob);
    }, 'image/png');
  });
}

async function handleShare(log) {
  const message = `💪 New PR in ${log.exercise}: ${log.reps} reps @ ${log.weight} (1RM: ${calculateOneRepMax(log.weight, log.reps)})! Beast mode unlocked! #SetCheck`;
  if (navigator.canShare) {
    try {
      const imageBlob = await shareWorkoutImage(log);
      const file = new File([imageBlob], 'pr.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: message,
          title: 'My New PR!'
        });
        return;
      }
    } catch (e) {
      // fallback to text
    }
  }
  // Fallback: just share text
  if (navigator.share) {
    await navigator.share({
      text: message,
      title: 'My New PR!'
    });
  } else {
    showToast('Sharing is not supported on this browser.', 'warning');
  }
}

function renderLogs() {
  const logs = getLogs();
  flexLogList.innerHTML = '';
  // Sort logs by 1RM descending
  const sortedLogs = logs.slice().sort((a, b) => {
    const a1RM = (a.reps && a.weight) ? calculateOneRepMax(a.weight, a.reps) : 0;
    const b1RM = (b.reps && b.weight) ? calculateOneRepMax(b.weight, b.reps) : 0;
    return b1RM - a1RM;
  });
  // Find PRs: highest 1RM per exercise
  const prMap = {};
  sortedLogs.forEach(log => {
    const oneRM = (log.reps && log.weight) ? calculateOneRepMax(log.weight, log.reps) : 0;
    if (!prMap[log.exercise] || oneRM > prMap[log.exercise].oneRM) {
      prMap[log.exercise] = { log, oneRM };
    }
  });
  sortedLogs.forEach(log => {
    const li = document.createElement('li');
    const oneRepMaxDisplay = (log.reps && log.weight) ? Math.floor(calculateOneRepMax(log.weight, log.reps)) : '?';
    const timeDisplay = log.time ? formatRelativeTime(log.time) : '';
    li.innerHTML = `<span><strong>${log.exercise}</strong> — 1RM: <strong>${oneRepMaxDisplay}</strong></span><span style="font-size:0.9em;color:#a08a6a;">${timeDisplay}</span>`;
    // Add click event to prefill exercise name
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      exerciseInput.value = log.exercise;
      exerciseInput.focus();
      showToast(`Entered as ${log.reps} reps @ ${log.weight}`, 'info');
    });
    // Add Share button if this is the PR for this exercise (all platforms)
    const pr = prMap[log.exercise] && prMap[log.exercise].log === log;
    if (pr) {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'share-btn';
      shareBtn.style.marginLeft = '10px';
      shareBtn.style.display = 'inline-flex';
      shareBtn.style.alignItems = 'center';
      shareBtn.style.background = 'none';
      shareBtn.style.border = 'none';
      shareBtn.style.borderRadius = '0';
      shareBtn.style.padding = '0';
      shareBtn.style.cursor = 'pointer';
      shareBtn.style.fontSize = '1em';
      shareBtn.setAttribute('aria-label', 'Share this PR');
      shareBtn.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#a08a6a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49'/></svg>`;
      shareBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleShare(log);
      });
      li.appendChild(shareBtn);
    }
    flexLogList.appendChild(li);
  });
}

// Toast notification system
function showToast(message, type = 'info') {
  let toast = document.getElementById('toast-message');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-message';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const exercise = exerciseInput.value.trim();
  const reps = repsInput.value;
  const weight = weightInput.value;
  if (!exercise || !reps || !weight) return;

  const new1RM = calculateOneRepMax(weight, reps);
  if (!new1RM) return;

  // Get logs and check for existing exercise
  let logs = getLogs();
  const idx = logs.findIndex(log => log.exercise === exercise);
  if (idx !== -1) {
    const old1RM = calculateOneRepMax(logs[idx].weight, logs[idx].reps);
    if (new1RM > old1RM) {
      logs[idx] = {
        exercise,
        reps,
        weight,
        time: new Date().toLocaleString()
      };
      saveLogs(logs);
      updateMoveList();
      renderLogs();
      showToast('💪 New PR, beast mode unlocked!', 'success');
    } else {
      showToast('😬 No PR this time, keep grinding!', 'warning');
    }
  } else {
    // Save log (do NOT store 1RM)
    logs.push({
      exercise,
      reps,
      weight,
      time: new Date().toLocaleString()
    });
    saveLogs(logs);
    updateMoveList();
    renderLogs();
    showToast("🔥 Move logged, keep flexin'!", 'info');
  }
  form.reset();
  exerciseInput.focus();
});

if (nukeLogBtn) {
  nukeLogBtn.addEventListener('click', () => {
    saveLogs([]);
    renderLogs();
  });
}

if (exportLogBtn) {
  exportLogBtn.addEventListener('click', () => {
    const logs = getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'setcheck_logs.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Logs exported!', 'success');
  });
}

if (importLogBtn) {
  importLogBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const logs = JSON.parse(event.target.result);
          if (!Array.isArray(logs)) throw new Error('Invalid format');
          saveLogs(logs);
          updateMoveList();
          renderLogs();
          showToast('Logs imported!', 'success');
        } catch (err) {
          showToast('Import failed: Invalid file', 'warning');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
}

// Initial load
updateMoveList();
renderLogs();

// Add event listeners for real-time 1RM calculation
repsInput.addEventListener('input', updateOneRMDisplay);
weightInput.addEventListener('input', updateOneRMDisplay);