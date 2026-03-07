# Consistency Tracker

A Chrome extension for tracking daily habits with a GitHub-style heat map and streak counter. No accounts, no logins, no cloud — everything is stored locally in your browser.

![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen)
![Storage](https://img.shields.io/badge/Storage-Local%20Only-orange)

---

## Features

### Task Management
- **Create tasks** with custom names
- **Schedule by day of week** — select specific days (Mon, Wed, Fri) or leave unchecked for every day
- **Schedule by specific dates** — assign tasks to one-off dates in addition to recurring days
- **Edit and delete** tasks at any time with confirmation dialogs
- **Reorder tasks** with move up/down buttons to control display priority

### Daily Tracking
- **Mark tasks as done** (checkmark) or **skipped** (cross) from the popup or new tab page
- **Toggle status** — click the same button again to undo
- Tasks are filtered to show only what's scheduled for today
- Status persists across popup reopens

### Heat Map
- **52-week GitHub-style contribution grid** rendered on both the popup and new tab page
- **4 intensity levels** based on completion percentage:
  - **Level 0** — 0% done (no tasks completed)
  - **Level 1** — 1–50% done
  - **Level 2** — 51–99% done
  - **Level 3** — 100% done
- **Month labels** along the top row for orientation
- **Day-of-week labels** (Mon, Wed, Fri) along the left side
- **Tooltips** on hover showing the date and completion count (e.g., "Mar 7, 2026 — 3/4 tasks done")
- **Legend** at the bottom (Less → More)
- Future dates and days with no scheduled tasks are styled distinctly

### Streak Counter
- Displays current consecutive-day streak with a fire icon
- A day counts toward the streak only if **all** scheduled tasks are marked done
- Days with no scheduled tasks are skipped (don't break the streak)
- If today is fully complete, it's included in the streak; otherwise the count starts from yesterday

### New Tab Override
- Replaces Chrome's default new tab page with the full tracker view
- Same functionality as the popup: heat map, streak, today's tasks with done/skip actions
- Live date and time display updated every second

---

## Project Structure

```
consistency/
├── manifest.json        # Chrome extension manifest (V3)
├── popup.html           # Extension popup UI
├── popup.js             # Popup logic (task rendering, status toggling)
├── popup.css            # Popup styles
├── newtab.html          # New tab override UI
├── newtab.js            # New tab logic (mirrors popup functionality)
├── newtab.css           # New tab styles
├── manage.html          # Task management page
├── manage.js            # Task CRUD, reordering, form handling
├── manage.css           # Management page styles
├── storage.js           # Storage API (chrome.storage.local wrapper)
├── heatmap.js           # Heat map rendering engine
├── icons/
│   ├── icon16.png       # Toolbar icon
│   ├── icon48.png       # Extensions page icon
│   └── icon128.png      # Chrome Web Store icon
└── README.md
```

---

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `consistency/` folder
6. The extension icon appears in your toolbar — click it to open the popup

---

## Usage

### Adding Tasks

1. Click the pencil icon in the popup header (or the "Add some!" link if no tasks exist)
2. The **Manage Tasks** page opens in a new tab
3. Enter a task name (e.g., "Go to gym")
4. Optionally select recurring days (Mon–Sun) — leave all unchecked for every day
5. Optionally add specific dates using the date picker
6. Click **Add Task**

### Tracking Your Day

1. Click the extension icon or open a new tab
2. Today's scheduled tasks appear with two buttons each:
   - **Checkmark** — mark as done
   - **Cross** — mark as skipped
3. Click a button to toggle its status; click again to undo
4. The heat map and streak update in real time

### Editing Tasks

1. Open the Manage Tasks page
2. Click the **pencil icon** on any task to edit its name, days, or dates
3. Use **up/down arrows** to reorder tasks
4. Click the **X** to delete a task (with confirmation)

---

## Data Storage

All data is stored locally using `chrome.storage.local`. Nothing leaves your browser.

### Schema

**Tasks** (`chrome.storage.local.tasks`):
```json
[
  {
    "id": "uuid",
    "name": "Go to gym",
    "days": [1, 3, 5],
    "dates": ["2026-03-15"],
    "createdAt": "2026-03-01",
    "order": 0
  }
]
```

**History** (`chrome.storage.local.history`):
```json
{
  "2026-03-07": {
    "task-uuid-1": "done",
    "task-uuid-2": "skipped"
  }
}
```

- `days` — array of day-of-week integers (0 = Sunday, 6 = Saturday). Empty array = every day.
- `dates` — array of `YYYY-MM-DD` strings for one-off date assignments.
- History values are either `"done"` or `"skipped"`. Absent means untouched.

---

## Permissions

The extension requires only one permission:

| Permission | Reason |
|---|---|
| `storage` | Read/write tasks and history to `chrome.storage.local` |

No network access, no remote servers, no tracking.

---

## Development

This is a pure vanilla JavaScript Chrome extension — no build tools, no frameworks, no dependencies.

To make changes:
1. Edit the source files directly
2. Go to `chrome://extensions`
3. Click the **reload** button on the Consistency Tracker card
4. Reopen the popup or new tab to see changes

---

## License

MIT
