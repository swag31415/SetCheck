const form = document.getElementById('workout-form');
const exerciseInput = document.getElementById('exercise');
const repsInput = document.getElementById('reps');
const weightInput = document.getElementById('weight');
const flexLogList = document.getElementById('logs');
const moveList = document.getElementById('exercise-list');
const nukeLogBtn = document.getElementById('clear-log');

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

function renderLogs() {
  const logs = getLogs();
  flexLogList.innerHTML = '';
  // Sort logs by 1RM descending
  const sortedLogs = logs.slice().sort((a, b) => {
    const a1RM = (a.reps && a.weight) ? calculateOneRepMax(a.weight, a.reps) : 0;
    const b1RM = (b.reps && b.weight) ? calculateOneRepMax(b.weight, b.reps) : 0;
    return b1RM - a1RM;
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

// Initial load
updateMoveList();
renderLogs();