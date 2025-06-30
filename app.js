const form = document.getElementById('workout-form');
const exerciseInput = document.getElementById('exercise');
const setsInput = document.getElementById('sets');
const repsInput = document.getElementById('reps');
const weightInput = document.getElementById('weight');
const logsList = document.getElementById('logs');
const datalist = document.getElementById('exercise-list');

const STORAGE_KEY = 'setcheck_logs';
const EXERCISE_KEY = 'setcheck_exercises';

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

function renderLogs() {
  const logs = getLogs();
  logsList.innerHTML = '';
  logs.slice().reverse().forEach(log => {
    const li = document.createElement('li');
    li.innerHTML = `<span><strong>${log.exercise}</strong> &mdash; ${log.sets} x ${log.reps} @ ${log.weight}</span><span style="font-size:0.9em;color:#a08a6a;">${log.time}</span>`;
    logsList.appendChild(li);
  });
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const exercise = exerciseInput.value.trim();
  const sets = setsInput.value;
  const reps = repsInput.value;
  const weight = weightInput.value;
  if (!exercise || !sets || !reps || !weight) return;

  // Save exercise for autocomplete
  let exercises = getExercises();
  if (!exercises.includes(exercise)) {
    exercises.push(exercise);
    saveExercises(exercises);
    updateDatalist();
  }

  // Save log
  const logs = getLogs();
  logs.push({
    exercise,
    sets,
    reps,
    weight,
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