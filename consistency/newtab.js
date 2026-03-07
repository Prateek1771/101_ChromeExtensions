document.addEventListener('DOMContentLoaded', async () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);

  document.getElementById('manage-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'manage.html' });
  });

  const addLink = document.getElementById('add-tasks-link');
  if (addLink) {
    addLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'manage.html' });
    });
  }

  await loadStreak();
  await Heatmap.render(document.getElementById('heatmap-container'));
  await loadTodayTasks();

  document.getElementById('tasks-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('.task-btn');
    if (!btn) return;

    const taskId = btn.dataset.id;
    const action = btn.dataset.action;
    const today = new Date();
    const dateStr = Storage.formatDate(today);
    const history = await Storage.getHistory();
    const dayData = history[dateStr] || {};

    if (dayData[taskId] === action) {
      delete dayData[taskId];
    } else {
      dayData[taskId] = action;
    }

    await Storage.saveDay(dateStr, dayData);
    await loadTodayTasks();
    await loadStreak();
    await Heatmap.render(document.getElementById('heatmap-container'));
  });
});

function updateDateTime() {
  const now = new Date();
  document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

async function loadStreak() {
  const streak = await Storage.getStreak();
  document.getElementById('streak-count').textContent = streak;
}

async function loadTodayTasks() {
  const today = new Date();
  const dow = today.getDay();
  const dateStr = Storage.formatDate(today);
  const tasks = await Storage.getTasksForDay(dow, dateStr);
  const history = await Storage.getHistory();
  const dayData = history[dateStr] || {};

  const listEl = document.getElementById('tasks-list');
  const noTasksEl = document.getElementById('no-tasks');
  listEl.innerHTML = '';

  if (tasks.length === 0) {
    noTasksEl.style.display = 'block';
    return;
  }
  noTasksEl.style.display = 'none';

  tasks.forEach(task => {
    const status = dayData[task.id] || null;
    const item = document.createElement('div');
    item.className = 'task-item' + (status ? ` ${status}` : '');
    item.innerHTML = `
      <span class="task-name">${escapeHtml(task.name)}</span>
      <div class="task-actions">
        <button class="task-btn done-btn ${status === 'done' ? 'active' : ''}" data-id="${task.id}" data-action="done" title="Mark done">&#10003;</button>
        <button class="task-btn skip-btn ${status === 'skipped' ? 'active' : ''}" data-id="${task.id}" data-action="skipped" title="Skip">&#10007;</button>
      </div>
    `;
    listEl.appendChild(item);
  });

}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
