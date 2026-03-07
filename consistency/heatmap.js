const Heatmap = {
  async render(container) {
    container.innerHTML = '';
    const tasks = await Storage.getTasks();
    const history = await Storage.getHistory();

    const wrapper = document.createElement('div');
    wrapper.className = 'heatmap-wrapper';

    // Month labels row
    const monthRow = document.createElement('div');
    monthRow.className = 'heatmap-months';
    monthRow.innerHTML = '<div class="heatmap-day-label"></div>';

    // Day labels column
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate the start date (52 weeks ago, starting from Sunday)
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (52 * 7) - today.getDay());

    // Build month labels
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;
    const weekCount = 53;
    const monthLabels = [];

    for (let w = 0; w < weekCount; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const m = weekStart.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ week: w, label: months[m] });
        lastMonth = m;
      }
    }

    // Create month label cells
    for (let w = 0; w < weekCount; w++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap-month-label';
      const match = monthLabels.find(ml => ml.week === w);
      if (match) cell.textContent = match.label;
      monthRow.appendChild(cell);
    }

    wrapper.appendChild(monthRow);

    // Build grid rows (one per day of week)
    for (let dow = 0; dow < 7; dow++) {
      const row = document.createElement('div');
      row.className = 'heatmap-row';

      const label = document.createElement('div');
      label.className = 'heatmap-day-label';
      label.textContent = dayLabels[dow];
      row.appendChild(label);

      for (let w = 0; w < weekCount; w++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(cellDate.getDate() + w * 7 + dow);
        const dateStr = Storage.formatDate(cellDate);

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';

        if (cellDate > today) {
          cell.classList.add('future');
        } else {
          const cellDow = cellDate.getDay();
          const scheduled = tasks.filter(t => Storage.isTaskScheduled(t, cellDow, dateStr));

          if (scheduled.length === 0) {
            cell.classList.add('no-tasks');
          } else {
            const dayData = history[dateStr] || {};
            const done = scheduled.filter(t => dayData[t.id] === 'done').length;
            const pct = done / scheduled.length;

            if (pct === 0) cell.classList.add('level-0');
            else if (pct <= 0.5) cell.classList.add('level-1');
            else if (pct < 1) cell.classList.add('level-2');
            else cell.classList.add('level-3');
          }

          // Tooltip
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const tipDate = cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const scheduled2 = tasks.filter(t => Storage.isTaskScheduled(t, cellDate.getDay(), dateStr));
          if (scheduled2.length > 0) {
            const dayData = history[dateStr] || {};
            const done = scheduled2.filter(t => dayData[t.id] === 'done').length;
            cell.title = `${tipDate}\n${done}/${scheduled2.length} tasks done`;
          } else {
            cell.title = `${tipDate}\nNo tasks scheduled`;
          }
        }

        row.appendChild(cell);
      }

      wrapper.appendChild(row);
    }

    // Legend
    const legend = document.createElement('div');
    legend.className = 'heatmap-legend';
    legend.innerHTML = `
      <span>Less</span>
      <div class="heatmap-cell no-tasks"></div>
      <div class="heatmap-cell level-0"></div>
      <div class="heatmap-cell level-1"></div>
      <div class="heatmap-cell level-2"></div>
      <div class="heatmap-cell level-3"></div>
      <span>More</span>
    `;
    wrapper.appendChild(legend);

    container.appendChild(wrapper);
  }
};
