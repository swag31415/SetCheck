const form = document.getElementById('workout-form');
const exerciseInput = document.getElementById('exercise');
const repsInput = document.getElementById('reps');
const weightInput = document.getElementById('weight');
const logsList = document.getElementById('logs');
const datalist = document.getElementById('exercise-list');

const STORAGE_KEY = 'setcheck_logs';
const EXERCISE_KEY = 'setcheck_exercises';

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

function getExercises() {
  return JSON.parse(localStorage.getItem(EXERCISE_KEY) || '[]');
}

function saveExercises(exercises) {
  localStorage.setItem(EXERCISE_KEY, JSON.stringify(exercises));
}

function updateDatalist() {
  const exercises = getExercises();
  datalist.innerHTML = '';
  exercises.forEach(ex => {
    const option = document.createElement('option');
    option.value = ex;
    datalist.appendChild(option);
  });
}

function calculateOneRepMax(weight, reps) {
  reps = parseInt(reps, 10);
  weight = parseFloat(weight);
  if (reps < 1 || reps > 30 || isNaN(weight)) return null;
  const percent = REP_PERCENTAGES[reps - 1];
  if (!percent) return null;
  return +(weight / percent).toFixed(1); // round to 1 decimal
}

function renderLogs() {
  const logs = getLogs();
  logsList.innerHTML = '';
  logs.slice().reverse().forEach(log => {
    const li = document.createElement('li');
    li.innerHTML = `<span><strong>${log.exercise}</strong> — 1RM: <strong>${log.oneRepMax ?? '?'}</strong></span><span style="font-size:0.9em;color:#a08a6a;">${log.time}</span>`;
    logsList.appendChild(li);
  });
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const exercise = exerciseInput.value.trim();
  const reps = repsInput.value;
  const weight = weightInput.value;
  if (!exercise || !reps || !weight) return;

  // Calculate 1RM
  const oneRepMax = calculateOneRepMax(weight, reps);
  if (!oneRepMax) return;

  // Save exercise for autocomplete
  let exercises = getExercises();
  if (!exercises.includes(exercise)) {
    exercises.push(exercise);
    saveExercises(exercises);
    updateDatalist();
  }

  // Save log (store 1RM instead of weight)
  const logs = getLogs();
  logs.push({
    exercise,
    reps,
    weight,
    oneRepMax,
    time: new Date().toLocaleString()
  });
  saveLogs(logs);
  renderLogs();
  form.reset();
  exerciseInput.focus();
});

// Initial load
updateDatalist();
renderLogs(); 