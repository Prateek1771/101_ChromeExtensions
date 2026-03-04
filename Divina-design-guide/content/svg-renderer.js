/**
 * SVG Renderer - Builds golden ratio SVG overlays from math geometry.
 */

const SvgRenderer = {
  /**
   * Generate full spiral + boxes SVG markup.
   * @param {string} color - Stroke color
   * @returns {string} SVG markup
   */
  createSpiralSVG(color = '#DAA520') {
    const { rects, viewBox } = GoldenRatioMath.generateGoldenGeometry(10);
    const vw = viewBox.w;
    const vh = viewBox.h;

    let rectMarkup = '';
    let spiralPath = `M ${rects[0].arcStartX} ${rects[0].arcStartY} `;

    rects.forEach((r) => {
      // Rectangle
      rectMarkup += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"
        fill="none" stroke="${color}" stroke-width="${Math.max(0.3, vw * 0.0008)}"
        stroke-opacity="0.5"/>`;

      // Quarter-circle arc (continuous spiral)
      spiralPath += `A ${r.arcRadius} ${r.arcRadius} 0 0 ${r.arcSweep} ${r.arcEndX} ${r.arcEndY} `;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}"
      preserveAspectRatio="none" width="100%" height="100%">
      ${rectMarkup}
      <path d="${spiralPath}" fill="none" stroke="${color}"
        stroke-width="${vw * 0.0015}" stroke-linecap="round"/>
    </svg>`;
  },

  /**
   * Generate boxes-only SVG (no spiral curve).
   */
  createBoxesSVG(color = '#DAA520') {
    const { rects, viewBox } = GoldenRatioMath.generateGoldenGeometry(10);
    const vw = viewBox.w;
    const vh = viewBox.h;

    let rectMarkup = '';
    rects.forEach(r => {
      rectMarkup += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"
        fill="none" stroke="${color}" stroke-width="${Math.max(0.3, vw * 0.0008)}"
        stroke-opacity="0.5"/>`;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}"
      preserveAspectRatio="none" width="100%" height="100%">
      ${rectMarkup}
    </svg>`;
  },

  /**
   * Generate Rule of Thirds grid SVG.
   * @param {string} color - Stroke color
   * @returns {string} SVG markup
   */
  createThirdsSVG(color = '#DAA520') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"
      preserveAspectRatio="none" width="100%" height="100%">
      <line x1="100" y1="0" x2="100" y2="300" stroke="${color}" stroke-width="0.5" stroke-opacity="0.7"/>
      <line x1="200" y1="0" x2="200" y2="300" stroke="${color}" stroke-width="0.5" stroke-opacity="0.7"/>
      <line x1="0" y1="100" x2="300" y2="100" stroke="${color}" stroke-width="0.5" stroke-opacity="0.7"/>
      <line x1="0" y1="200" x2="300" y2="200" stroke="${color}" stroke-width="0.5" stroke-opacity="0.7"/>
      <circle cx="100" cy="100" r="3" fill="${color}" opacity="0.8"/>
      <circle cx="200" cy="100" r="3" fill="${color}" opacity="0.8"/>
      <circle cx="100" cy="200" r="3" fill="${color}" opacity="0.8"/>
      <circle cx="200" cy="200" r="3" fill="${color}" opacity="0.8"/>
    </svg>`;
  },

  /**
   * Generate Diagonal Grid SVG.
   * @param {string} color - Stroke color
   * @returns {string} SVG markup
   */
  createDiagonalSVG(color = '#DAA520') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      preserveAspectRatio="none" width="100%" height="100%">
      <line x1="0" y1="0" x2="1000" y2="1000" stroke="${color}" stroke-width="1" stroke-opacity="0.7"/>
      <line x1="1000" y1="0" x2="0" y2="1000" stroke="${color}" stroke-width="1" stroke-opacity="0.7"/>
      <line x1="500" y1="0" x2="0" y2="500" stroke="${color}" stroke-width="0.8" stroke-opacity="0.35"/>
      <line x1="500" y1="0" x2="1000" y2="500" stroke="${color}" stroke-width="0.8" stroke-opacity="0.35"/>
      <line x1="0" y1="500" x2="500" y2="1000" stroke="${color}" stroke-width="0.8" stroke-opacity="0.35"/>
      <line x1="1000" y1="500" x2="500" y2="1000" stroke="${color}" stroke-width="0.8" stroke-opacity="0.35"/>
    </svg>`;
  },

  /**
   * Generate Center + Phi Lines SVG.
   * @param {string} color - Stroke color
   * @returns {string} SVG markup
   */
  createCenterPhiSVG(color = '#DAA520') {
    const phi = typeof GoldenRatioMath !== 'undefined' ? GoldenRatioMath.PHI_INV : 0.618033988749895;
    const p1 = (1 - phi) * 1000; // 38.2%
    const p2 = phi * 1000;       // 61.8%
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      preserveAspectRatio="none" width="100%" height="100%">
      <line x1="500" y1="0" x2="500" y2="1000" stroke="${color}" stroke-width="1" stroke-opacity="0.5" stroke-dasharray="8 6"/>
      <line x1="0" y1="500" x2="1000" y2="500" stroke="${color}" stroke-width="1" stroke-opacity="0.5" stroke-dasharray="8 6"/>
      <line x1="${p1}" y1="0" x2="${p1}" y2="1000" stroke="${color}" stroke-width="0.8" stroke-opacity="0.7"/>
      <line x1="${p2}" y1="0" x2="${p2}" y2="1000" stroke="${color}" stroke-width="0.8" stroke-opacity="0.7"/>
      <line x1="0" y1="${p1}" x2="1000" y2="${p1}" stroke="${color}" stroke-width="0.8" stroke-opacity="0.7"/>
      <line x1="0" y1="${p2}" x2="1000" y2="${p2}" stroke="${color}" stroke-width="0.8" stroke-opacity="0.7"/>
      <circle cx="${p1}" cy="${p1}" r="4" fill="${color}" opacity="0.6"/>
      <circle cx="${p2}" cy="${p1}" r="4" fill="${color}" opacity="0.6"/>
      <circle cx="${p1}" cy="${p2}" r="4" fill="${color}" opacity="0.6"/>
      <circle cx="${p2}" cy="${p2}" r="4" fill="${color}" opacity="0.6"/>
    </svg>`;
  },

  /**
   * Create custom PNG overlay.
   * @param {string} dataUrl - Base64 data URL of the image
   * @returns {string} HTML img markup
   */
  createCustomPNG(dataUrl) {
    return `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;">`;
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.SvgRenderer = SvgRenderer;
}
