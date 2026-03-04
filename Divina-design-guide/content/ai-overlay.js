/**
 * AI Overlay - Renders analysis guide lines and floating panel.
 */

const AIOverlay = {
  elements: [],
  panel: null,
  _guides: null,
  _score: null,
  _shadowRoot: null,
  _boundResize: null,

  /**
   * Render AI analysis guides on the page.
   * @param {Object} shadowRoot - Shadow DOM root to render into
   * @param {Array} guides - Array of { type: 'h'|'v'|'rect', position: fraction(s) }
   * @param {number} score - Golden ratio score 1-10
   */
  show(shadowRoot, guides, score) {
    this.destroy();
    this._guides = guides;
    this._score = score;
    this._shadowRoot = shadowRoot;

    this._renderGuides();

    // Floating panel
    this.panel = document.createElement('div');
    this.panel.className = 'gr-ai-panel';

    const header = document.createElement('div');
    header.className = 'gr-ai-panel-header';

    const title = document.createElement('span');
    title.className = 'gr-ai-panel-title';
    title.textContent = 'Design Analysis';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'gr-ai-panel-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.destroy());
    header.appendChild(closeBtn);

    this.panel.appendChild(header);

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'gr-ai-panel-score';
    scoreDiv.textContent = String(score) + ' ';
    const suffix = document.createElement('span');
    suffix.textContent = '/ 10';
    scoreDiv.appendChild(suffix);
    this.panel.appendChild(scoreDiv);

    shadowRoot.appendChild(this.panel);
    this.elements.push(this.panel);

    // Reposition guides on window resize
    this._boundResize = () => this._repositionGuides();
    window.addEventListener('resize', this._boundResize);
  },

  /** Render guide elements based on current viewport size. */
  _renderGuides() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    this._guides.forEach(guide => {
      const el = document.createElement('div');
      el.className = 'gr-ai-guide';

      switch (guide.type) {
        case 'h':
          el.classList.add('gr-ai-guide-h');
          el.style.top = (guide.position * vh) + 'px';
          break;
        case 'v':
          el.classList.add('gr-ai-guide-v');
          el.style.left = (guide.position * vw) + 'px';
          break;
        case 'rect':
          el.classList.add('gr-ai-guide-rect');
          el.style.left = (guide.x * vw) + 'px';
          el.style.top = (guide.y * vh) + 'px';
          el.style.width = (guide.w * vw) + 'px';
          el.style.height = (guide.h * vh) + 'px';
          break;
      }

      this._shadowRoot.appendChild(el);
      this.elements.push(el);
    });
  },

  /** Recalculate guide positions on resize. */
  _repositionGuides() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Filter out the panel from elements to only reposition guide lines
    this.elements.forEach(el => {
      if (el === this.panel) return;

      // Find matching guide data by index
      const idx = this.elements.indexOf(el);
      // Guides are the first N elements, panel is last
      if (idx >= this._guides.length) return;
      const guide = this._guides[idx];

      switch (guide.type) {
        case 'h':
          el.style.top = (guide.position * vh) + 'px';
          break;
        case 'v':
          el.style.left = (guide.position * vw) + 'px';
          break;
        case 'rect':
          el.style.left = (guide.x * vw) + 'px';
          el.style.top = (guide.y * vh) + 'px';
          el.style.width = (guide.w * vw) + 'px';
          el.style.height = (guide.h * vh) + 'px';
          break;
      }
    });
  },

  /** Remove all AI overlay elements. */
  destroy() {
    this.elements.forEach(el => el.remove());
    this.elements = [];
    this.panel = null;
    this._guides = null;
    this._score = null;
    this._shadowRoot = null;
    if (this._boundResize) {
      window.removeEventListener('resize', this._boundResize);
      this._boundResize = null;
    }
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.AIOverlay = AIOverlay;
}
