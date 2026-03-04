/**
 * Overlay Manager - Creates/updates/destroys the golden ratio overlay in Shadow DOM.
 * Fixed full-viewport layout (no drag/resize).
 */

const OverlayManager = {
  shadowRoot: null,
  hostElement: null,
  container: null,

  /** Initialize the Shadow DOM host if not already present. */
  init() {
    if (this.hostElement) return;

    this.hostElement = document.createElement('div');
    this.hostElement.id = '__golden-ratio-host';
    document.documentElement.appendChild(this.hostElement);

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });

    // Inject styles
    const style = document.createElement('style');
    if (typeof OVERLAY_CSS !== 'undefined') {
      style.textContent = OVERLAY_CSS;
    } else {
      console.warn('[Divina] OVERLAY_CSS not defined — styles may be missing.');
    }
    this.shadowRoot.appendChild(style);

    // Create overlay container (fixed, full viewport)
    this.container = document.createElement('div');
    this.container.className = 'gr-overlay-container';
    this.container.innerHTML = '<div class="gr-overlay-content"></div>';
    this.shadowRoot.appendChild(this.container);
  },

  /** Show overlay with given options. */
  show(options) {
    this.init();
    this.update(options);
    this.hostElement.style.display = '';
  },

  /** Update overlay appearance. */
  update(options) {
    if (!this.container) return;

    const content = this.container.querySelector('.gr-overlay-content');
    const color = options.color || '#DAA520';

    switch (options.mode) {
      case 'spiral':
        content.innerHTML = SvgRenderer.createSpiralSVG(color);
        break;
      case 'boxes':
        content.innerHTML = SvgRenderer.createBoxesSVG(color);
        break;
      case 'thirds':
        content.innerHTML = SvgRenderer.createThirdsSVG(color);
        break;
      case 'diagonals':
        content.innerHTML = SvgRenderer.createDiagonalSVG(color);
        break;
      case 'center-phi':
        content.innerHTML = SvgRenderer.createCenterPhiSVG(color);
        break;
      case 'custom':
        if (options.customPng) {
          content.innerHTML = SvgRenderer.createCustomPNG(options.customPng);
        }
        break;
    }

    // Apply opacity
    this.container.style.opacity = options.opacity != null ? options.opacity : 0.5;

    // Apply rotation
    const deg = options.rotation || 0;
    content.style.transform = deg ? `rotate(${deg}deg)` : '';
  },

  /** Hide and destroy overlay. */
  destroy() {
    if (this.hostElement) {
      this.hostElement.remove();
      this.hostElement = null;
      this.shadowRoot = null;
      this.container = null;
    }
    AIOverlay.destroy();
  },

  /** Get shadow root for AI overlay to use. */
  getShadowRoot() {
    this.init();
    return this.shadowRoot;
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.OverlayManager = OverlayManager;
}
