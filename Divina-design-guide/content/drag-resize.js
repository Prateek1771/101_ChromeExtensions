/**
 * Drag & Resize - Handles drag-to-move and corner resize (aspect-ratio locked to phi).
 */

const DragResize = {
  container: null,
  shadowRoot: null,
  isDragging: false,
  isResizing: false,
  activeHandle: null,
  startX: 0,
  startY: 0,
  startLeft: 0,
  startTop: 0,
  startWidth: 0,
  _boundMouseMove: null,
  _boundMouseUp: null,

  init(container, shadowRoot) {
    this.container = container;
    this.shadowRoot = shadowRoot;

    // Drag: mousedown on the container (not on handles)
    container.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('gr-resize-handle')) return;
      e.preventDefault();
      this.startDrag(e);
    });

    // Resize: mousedown on handles
    container.querySelectorAll('.gr-resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startResize(e, handle.dataset.handle);
      });
    });

    // Store bound references so we can remove them later
    this._boundMouseMove = (e) => this.onMouseMove(e);
    this._boundMouseUp = () => this.onMouseUp();

    // Global mouse events (on document, outside shadow DOM)
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp);
  },

  startDrag(e) {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startLeft = this.container.offsetLeft;
    this.startTop = this.container.offsetTop;
  },

  startResize(e, handle) {
    this.isResizing = true;
    this.activeHandle = handle;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startWidth = this.container.offsetWidth;
    this.startLeft = this.container.offsetLeft;
    this.startTop = this.container.offsetTop;
  },

  onMouseMove(e) {
    if (this.isDragging) {
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      this.container.style.left = (this.startLeft + dx) + 'px';
      this.container.style.top = (this.startTop + dy) + 'px';
    }

    if (this.isResizing) {
      const dx = e.clientX - this.startX;
      let newWidth;

      if (this.activeHandle === 'se' || this.activeHandle === 'ne') {
        newWidth = this.startWidth + dx;
      } else {
        newWidth = this.startWidth - dx;
      }

      newWidth = Math.max(100, newWidth);

      // Lock aspect ratio to golden ratio
      this.container.style.width = newWidth + 'px';
      this.container.style.height = (newWidth / GoldenRatioMath.PHI) + 'px';
      this.container.style.aspectRatio = 'auto';

      // Adjust position for left-side handles
      if (this.activeHandle === 'nw' || this.activeHandle === 'sw') {
        this.container.style.left = (this.startLeft + (this.startWidth - newWidth)) + 'px';
      }
      // Fix #2: removed dead ternary — condition already guarantees nw or ne
      if (this.activeHandle === 'nw' || this.activeHandle === 'ne') {
        const heightDiff = (newWidth / GoldenRatioMath.PHI) - (this.startWidth / GoldenRatioMath.PHI);
        this.container.style.top = (this.startTop - heightDiff) + 'px';
      }
    }
  },

  onMouseUp() {
    if (this.isDragging || this.isResizing) {
      // Save position
      chrome.storage.local.set({
        overlayPos: {
          left: this.container.style.left,
          top: this.container.style.top,
          width: this.container.style.width
        }
      });
    }
    this.isDragging = false;
    this.isResizing = false;
    this.activeHandle = null;
  },

  /** Remove global event listeners to prevent leaks. */
  destroy() {
    if (this._boundMouseMove) {
      document.removeEventListener('mousemove', this._boundMouseMove);
      this._boundMouseMove = null;
    }
    if (this._boundMouseUp) {
      document.removeEventListener('mouseup', this._boundMouseUp);
      this._boundMouseUp = null;
    }
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.DragResize = DragResize;
}
