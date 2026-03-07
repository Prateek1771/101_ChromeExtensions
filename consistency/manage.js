document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('back-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.close();
  });

  document.getElementById('task-form').addEventListener('submit', handleSubmit);
  document.getElementById('cancel-btn').addEventListener('click', resetForm);
  document.getElementById('add-date-btn').addEventListener('click', addDate);

  await renderTasks();
});

async function handleSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('task-name');
  const editId = document.getElementById('edit-id').value;
  const name = nameInput.value.trim();
  if (!name) return;

  const days = getSelectedDays();
  const dates = getSelectedDates();
  const tasks = await Storage.getTasks();

  if (editId) {
    const task = tasks.find(t => t.id === editId);
    if (task) {
      task.name = name;
      task.days = days;
      task.dates = dates;
    }
  } else {
    tasks.push({
      id: Storage.generateId(),
      name,
      days,
      dates,
      createdAt: Storage.formatDate(new Date()),
      order: tasks.length
    });
  }

  await Storage.saveTasks(tasks);
  resetForm();
  await renderTasks();
}

function getSelectedDays() {
  const checks = document.querySelectorAll('.day-picker input[type="checkbox"]');
  const days = [];
  checks.forEach(cb => {
    if (cb.checked) days.push(parseInt(cb.value));
  });
  return days;
}

function addDate() {
  const input = document.getElementById('date-input');
  const dateStr = input.value;
  if (!dateStr) return;

  const list = document.getElementById('dates-list');
  // Prevent duplicates
  if (list.querySelector(`[data-date="${dateStr}"]`)) return;

  const tag = document.createElement('span');
  tag.className = 'date-tag';
  tag.dataset.date = dateStr;
  const display = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  tag.innerHTML = `${escapeHtml(display)}<button class="remove-date" type="button">&times;</button>`;
  tag.querySelector('.remove-date').addEventListener('click', () => tag.remove());
  list.appendChild(tag);
  input.value = '';
}

function getSelectedDates() {
  const tags = document.querySelectorAll('#dates-list .date-tag');
  return Array.from(tags).map(tag => tag.dataset.date);
}

function resetForm() {
  document.getElementById('task-name').value = '';
  document.getElementById('edit-id').value = '';
  document.getElementById('date-input').value = '';
  document.getElementById('dates-list').innerHTML = '';
  document.querySelectorAll('.day-picker input').forEach(cb => cb.checked = false);
  document.getElementById('form-title').textContent = 'Add New Task';
  document.getElementById('submit-btn').textContent = 'Add Task';
  document.getElementById('cancel-btn').style.display = 'none';
}

function editTask(task) {
  document.getElementById('task-name').value = task.name;
  document.getElementById('edit-id').value = task.id;
  document.querySelectorAll('.day-picker input').forEach(cb => {
    cb.checked = task.days.includes(parseInt(cb.value));
  });

  // Populate dates
  const list = document.getElementById('dates-list');
  list.innerHTML = '';
  (task.dates || []).forEach(dateStr => {
    const tag = document.createElement('span');
    tag.className = 'date-tag';
    tag.dataset.date = dateStr;
    const display = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    tag.innerHTML = `${escapeHtml(display)}<button class="remove-date" type="button">&times;</button>`;
    tag.querySelector('.remove-date').addEventListener('click', () => tag.remove());
    list.appendChild(tag);
  });

  document.getElementById('form-title').textContent = 'Edit Task';
  document.getElementById('submit-btn').textContent = 'Save Changes';
  document.getElementById('cancel-btn').style.display = 'inline-block';
  document.getElementById('task-name').focus();
}

async function deleteTask(taskId, taskName) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <p>Delete "<strong>${escapeHtml(taskName)}</strong>"?</p>
      <button class="btn btn-danger" id="confirm-yes">Delete</button>
      <button class="btn btn-secondary" id="confirm-no">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);

  return new Promise(resolve => {
    overlay.querySelector('#confirm-yes').addEventListener('click', async () => {
      let tasks = await Storage.getTasks();
      tasks = tasks.filter(t => t.id !== taskId);
      tasks.forEach((t, i) => t.order = i);
      await Storage.saveTasks(tasks);
      overlay.remove();
      await renderTasks();
      resolve(true);
    });
    overlay.querySelector('#confirm-no').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
  });
}

async function moveTask(taskId, direction) {
  const tasks = await Storage.getTasks();
  tasks.sort((a, b) => a.order - b.order);
  const idx = tasks.findIndex(t => t.id === taskId);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= tasks.length) return;

  [tasks[idx], tasks[newIdx]] = [tasks[newIdx], tasks[idx]];
  tasks.forEach((t, i) => t.order = i);
  await Storage.saveTasks(tasks);
  await renderTasks();
}

async function renderTasks() {
  const tasks = await Storage.getTasks();
  tasks.sort((a, b) => a.order - b.order);
  const listEl = document.getElementById('task-list');
  const emptyEl = document.getElementById('empty-msg');
  listEl.innerHTML = '';

  if (tasks.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  tasks.forEach((task, idx) => {
    const row = document.createElement('div');
    row.className = 'task-row';
    const hasDays = task.days.length > 0;
    const hasDates = task.dates && task.dates.length > 0;
    let daysText;
    if (!hasDays && !hasDates) {
      daysText = 'Every day';
    } else {
      const parts = [];
      if (hasDays) parts.push(task.days.map(d => dayNames[d]).join(', '));
      if (hasDates) {
        const dateLabels = task.dates.map(ds =>
          new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        parts.push(dateLabels.join(', '));
      }
      daysText = parts.join(' · ');
    }

    row.innerHTML = `
      <div class="task-info">
        <div class="name">${escapeHtml(task.name)}</div>
        <div class="days">${daysText}</div>
      </div>
      <div class="row-actions">
        <button class="row-btn move-up" title="Move up">&#9650;</button>
        <button class="row-btn move-down" title="Move down">&#9660;</button>
        <button class="row-btn edit" title="Edit">&#9998;</button>
        <button class="row-btn delete" title="Delete">&#10005;</button>
      </div>
    `;

    row.querySelector('.move-up').addEventListener('click', () => moveTask(task.id, -1));
    row.querySelector('.move-down').addEventListener('click', () => moveTask(task.id, 1));
    row.querySelector('.edit').addEventListener('click', () => editTask(task));
    row.querySelector('.delete').addEventListener('click', () => deleteTask(task.id, task.name));

    listEl.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
