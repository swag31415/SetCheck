const REP_PERCENTAGES = [
  1, 0.97, 0.94, 0.92, 0.89, 0.86, 0.83, 0.81, 0.78, 0.75,
  0.73, 0.71, 0.70, 0.68, 0.67, 0.65, 0.64, 0.63, 0.61, 0.60,
  0.59, 0.58, 0.57, 0.56, 0.55, 0.54, 0.53, 0.52, 0.51, 0.50
];
const STORAGE_KEY = 'setcheck_logs';

const app = Vue.createApp({
  data() {
    return {
      exercise: '',
      reps: '',
      weight: '',
      logs: [],
      toastMessage: '',
      toastType: 'info',
      toastTimeout: null,
      importInput: null,
      openLogKeys: [],
      charts: {}, // Store chart instances
    };
  },
  computed: {
    uniqueMoves() {
      return Array.from(new Set(this.logs.map(log => log.exercise).filter(Boolean)));
    },
    sortedLogs() {
      // Get the highest 1RM entry for each exercise
      const exerciseMap = {};
      this.logs.forEach(log => {
        const oneRM = (log.reps && log.weight) ? this.calculateOneRepMax(log.weight, log.reps) : 0;
        if (!exerciseMap[log.exercise] || oneRM > exerciseMap[log.exercise].oneRM) {
          exerciseMap[log.exercise] = { log, oneRM };
        }
      });
      
      // Convert to array and sort by 1RM descending
      return Object.values(exerciseMap)
        .map(item => item.log)
        .sort((a, b) => {
          const a1RM = (a.reps && a.weight) ? this.calculateOneRepMax(a.weight, a.reps) : 0;
          const b1RM = (b.reps && b.weight) ? this.calculateOneRepMax(b.weight, b.reps) : 0;
          return b1RM - a1RM;
        });
    },
    showOneRM() {
      return this.reps && this.weight && this.reps > 0 && this.weight > 0 && this.oneRM;
    },
    oneRM() {
      return this.calculateOneRepMax(this.weight, this.reps);
    },
    prMap() {
      // Find PRs: highest 1RM per exercise
      const map = {};
      this.sortedLogs.forEach(log => {
        const oneRM = (log.reps && log.weight) ? this.calculateOneRepMax(log.weight, log.reps) : 0;
        if (!map[log.exercise] || oneRM > map[log.exercise].oneRM) {
          map[log.exercise] = { log, oneRM };
        }
      });
      return map;
    }
  },
  methods: {
    getLogs() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch {
        return [];
      }
    },
    saveLogs(logs) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    },
    calculateOneRepMax(weight, reps) {
      reps = parseInt(reps, 10);
      weight = parseFloat(weight);
      if (reps < 1 || reps > 30 || isNaN(weight)) return null;
      const percent = REP_PERCENTAGES[reps - 1];
      if (!percent) return null;
      return Math.floor(weight / percent);
    },
    formatRelativeTime(dateString) {
      if (!dateString) return '';
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
    },
    showToast(message, type = 'info') {
      this.toastMessage = message;
      this.toastType = type;
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.toastMessage = '';
      }, 2500);
    },
    handleSubmit() {
      const exercise = this.exercise.trim();
      const reps = this.reps;
      const weight = this.weight;
      if (!exercise || !reps || !weight) return;
      const new1RM = this.calculateOneRepMax(weight, reps);
      if (!new1RM) return;
      let logs = this.logs.slice();
      
      // Always add new log entry to show progression over time
      logs.push({
        exercise,
        reps,
        weight,
        time: new Date().toLocaleString()
      });
      
      this.saveLogs(logs);
      this.logs = logs;
      
      // Check if this is a new PR
      const exerciseLogs = logs.filter(log => log.exercise === exercise);
      const currentPR = Math.max(...exerciseLogs.map(log => this.calculateOneRepMax(log.weight, log.reps)));
      
      if (new1RM === currentPR) {
        this.showToast('💪 New PR, beast mode unlocked!', 'success');
      } else {
        this.showToast("🔥 Move logged, keep flexin'!", 'info');
      }
      
      // Refresh chart if it's open
      if (this.openLogKeys.some(key => key.startsWith(exercise + '-'))) {
        this.$nextTick(() => {
          this.createProgressionChart(exercise);
        });
      }
      
      this.exercise = '';
      this.reps = '';
      this.weight = '';
    },
    clearLogs() {
      this.saveLogs([]);
      this.logs = [];
    },
    exportLogs() {
      const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'setcheck_logs.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('Logs exported!', 'success');
    },
    importLogs() {
      if (this.importInput) {
        document.body.removeChild(this.importInput);
        this.importInput = null;
      }
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
            this.saveLogs(logs);
            this.logs = logs;
            this.showToast('Logs imported!', 'success');
            // Refresh any open charts
            this.$nextTick(() => {
              this.openLogKeys.forEach(key => {
                const exercise = key.split('-').slice(0, -1).join('-');
                if (this.charts[exercise]) {
                  this.createProgressionChart(exercise);
                }
              });
            });
          } catch (err) {
            this.showToast('Import failed: Invalid file', 'warning');
          }
        };
        reader.readAsText(file);
      });
      document.body.appendChild(input);
      this.importInput = input;
      input.click();
    },
    isPR(log) {
      const pr = this.prMap[log.exercise];
      return pr && pr.log === log;
    },
    async shareWorkoutImage(log) {
      // Create a canvas
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
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
      } catch (e) {}
      ctx.font = '48px sans-serif';
      ctx.fillText('💪', 100, 70);
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = '#222';
      ctx.fillText(`${log.exercise}`, 30, 120);
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#444';
      ctx.fillText(`New PR: ${log.reps} reps @ ${log.weight} (${this.calculateOneRepMax(log.weight, log.reps)} 1RM)`, 30, 170);
      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#a08a6a';
      ctx.fillText('Beast mode unlocked! #SetCheck', 30, 220);
      return new Promise((resolve) => {
        canvas.toBlob(blob => {
          resolve(blob);
        }, 'image/png');
      });
    },
    async handleShare(log) {
      const message = `💪 New PR in ${log.exercise}: ${log.reps} reps @ ${log.weight} (1RM: ${this.calculateOneRepMax(log.weight, log.reps)})! Beast mode unlocked! #SetCheck`;
      if (navigator.canShare) {
        try {
          const imageBlob = await this.shareWorkoutImage(log);
          const file = new File([imageBlob], 'pr.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              text: message,
              title: 'My New PR!'
            });
            return;
          }
        } catch (e) {}
      }
      if (navigator.share) {
        await navigator.share({
          text: message,
          title: 'My New PR!'
        });
      } else {
        this.showToast('Sharing is not supported on this browser.', 'warning');
      }
    },
    populateFieldsFromLog(log) {
      this.exercise = log.exercise;
    },
    toggleLogDetails(log) {
      const key = log.exercise + '-' + log.time;
      const idx = this.openLogKeys.indexOf(key);
      if (idx === -1) {
        this.openLogKeys.push(key);
        this.$nextTick(() => {
          this.createProgressionChart(log.exercise);
        });
      } else {
        this.openLogKeys.splice(idx, 1);
      }
      this.populateFieldsFromLog(log);
    },
    createProgressionChart(exercise) {
      // Get all logs for this exercise, sorted by date
      const exerciseLogs = this.logs
        .filter(log => log.exercise === exercise)
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      
      if (exerciseLogs.length === 0) return;
      
      // Prepare chart data with PR tracking
      let currentPR = 0;
      const chartData = exerciseLogs.map(log => {
        const oneRM = this.calculateOneRepMax(log.weight, log.reps);
        const isPR = oneRM > currentPR;
        if (isPR) currentPR = oneRM;
        return {
          x: new Date(log.time),
          y: oneRM,
          isPR: isPR,
          log: log
        };
      });
      
      // Get chart canvas
      const canvasId = 'chart-' + exercise.replace(/\s+/g, '-');
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      
      // Create new chart
      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'All Attempts',
              data: chartData,
              borderColor: '#a08a6a',
              backgroundColor: 'rgba(160, 138, 106, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointBackgroundColor: chartData.map(d => d.isPR ? '#4caf50' : '#a08a6a'),
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: 'PR Progression',
              data: chartData.filter(d => d.isPR),
              borderColor: '#4caf50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#4caf50',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `${exercise} - 1RM Progression`,
              font: {
                size: 14,
                weight: 'bold'
              },
              color: '#222',
              padding: {
                top: 10,
                bottom: 10
              }
            },
            legend: {
              display: true,
              labels: {
                usePointStyle: true,
                padding: 15,
                color: '#666',
                font: {
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#a08a6a',
              borderWidth: 1,
              cornerRadius: 6,
              displayColors: false,
              callbacks: {
                title: function(context) {
                  const date = new Date(context[0].parsed.x);
                  return date.toLocaleDateString();
                },
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
                displayFormats: {
                  day: 'MMM d'
                }
              },
              title: {
                display: true,
                text: 'Date',
                color: '#666',
                font: {
                  size: 12
                }
              },
              grid: {
                color: 'rgba(0,0,0,0.1)'
              },
              ticks: {
                color: '#666',
                font: {
                  size: 10
                }
              }
            },
            y: {
              title: {
                display: true,
                text: '1RM (lbs)',
                color: '#666',
                font: {
                  size: 12
                }
              },
              grid: {
                color: 'rgba(0,0,0,0.1)'
              },
              ticks: {
                color: '#666',
                font: {
                  size: 10
                }
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
          elements: {
            point: {
              hoverBackgroundColor: '#8b7355'
            }
          }
        }
      });
      
      // Store chart instance
      this.charts[exercise] = chart;
    },
  },
  mounted() {
    this.logs = this.getLogs();
  }
});

app.mount('#app');