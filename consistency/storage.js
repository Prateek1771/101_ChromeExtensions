const Storage = {
  async getTasks() {
    const data = await chrome.storage.local.get('tasks');
    return data.tasks || [];
  },

  async saveTasks(tasks) {
    await chrome.storage.local.set({ tasks });
  },

  async getHistory() {
    const data = await chrome.storage.local.get('history');
    return data.history || {};
  },

  async saveDay(dateStr, dayData) {
    const history = await this.getHistory();
    history[dateStr] = dayData;
    await chrome.storage.local.set({ history });
  },

  isTaskScheduled(task, dayOfWeek, dateStr) {
    const hasDays = task.days.length > 0;
    const hasDates = task.dates && task.dates.length > 0;
    if (!hasDays && !hasDates) return true; // every day
    if (hasDays && task.days.includes(dayOfWeek)) return true;
    if (hasDates && task.dates.includes(dateStr)) return true;
    return false;
  },

  async getTasksForDay(dayOfWeek, dateStr) {
    const tasks = await this.getTasks();
    return tasks
      .filter(t => this.isTaskScheduled(t, dayOfWeek, dateStr))
      .sort((a, b) => a.order - b.order);
  },

  async getCompletionForDate(dateStr, tasks, history) {
    const date = new Date(dateStr + 'T00:00:00');
    const dow = date.getDay();
    const scheduled = tasks.filter(t => this.isTaskScheduled(t, dow, dateStr));
    if (scheduled.length === 0) return null;
    const dayData = history[dateStr] || {};
    const done = scheduled.filter(t => dayData[t.id] === 'done').length;
    return done / scheduled.length;
  },

  async getStreak() {
    const tasks = await this.getTasks();
    const history = await this.getHistory();
    if (tasks.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today is fully done; if so, include it and count back from today.
    // Otherwise, count back starting from yesterday.
    const todayStr = this.formatDate(today);
    const todayDow = today.getDay();
    const todayScheduled = tasks.filter(t => this.isTaskScheduled(t, todayDow, todayStr));
    const todayData = history[todayStr] || {};
    const todayDone = todayScheduled.length > 0 && todayScheduled.every(t => todayData[t.id] === 'done');

    const startOffset = todayDone ? 0 : 1;

    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = this.formatDate(d);
      const dow = d.getDay();
      const scheduled = tasks.filter(t => this.isTaskScheduled(t, dow, dateStr));

      if (scheduled.length === 0) continue;

      const dayData = history[dateStr] || {};
      const allDone = scheduled.every(t => dayData[t.id] === 'done');

      if (allDone) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  generateId() {
    return crypto.randomUUID();
  }
};
