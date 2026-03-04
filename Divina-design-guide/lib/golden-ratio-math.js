/**
 * Golden Ratio Math Library
 * Pure functions for PHI calculations and SVG geometry.
 */

const PHI = 1.6180339887498948;
const PHI_INV = 1 / PHI; // 0.618...
const TOLERANCE = 0.05;

/**
 * Generate Fibonacci sequence up to n terms.
 */
function fibonacci(n) {
  const seq = [1, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq.slice(0, n);
}

/**
 * Check if a ratio is golden (within tolerance).
 * Returns { ratio, deviation, isGolden }.
 */
function checkRatio(a, b) {
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const ratio = larger / smaller;
  const deviation = Math.abs(ratio - PHI) / PHI;
  return { ratio, deviation, isGolden: deviation <= TOLERANCE };
}

/**
 * Suggest nearest golden-ratio pair given two values.
 */
function suggestGoldenPair(a, b) {
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  return {
    keepSmaller: { keep: smaller, change: Math.round(smaller * PHI) },
    keepLarger:  { keep: larger,  change: Math.round(larger / PHI) }
  };
}

/**
 * Generate Fibonacci rectangle layout for SVG overlay.
 * Returns array of rectangle + arc data for drawing the golden spiral.
 *
 * The spiral is continuous and clockwise, built from quarter-circle arcs
 * inscribed in Fibonacci-proportioned squares.
 *
 * Direction cycle: RIGHT → BOTTOM → LEFT → TOP
 * Arc center (inner corner) cycle: TL → TR → BR → BL
 * Arc path: from one adjacent corner to the other, sweep=1 (CW)
 *
 * iterations: number of subdivisions (default 10)
 */
function generateGoldenGeometry(iterations = 10) {
  const fib = fibonacci(iterations + 1);
  const totalW = fib[iterations];
  const totalH = fib[iterations - 1];

  const rects = [];
  let x = 0, y = 0, w = totalW, h = totalH;

  for (let i = 0; i < iterations; i++) {
    let rx, ry, side;
    let cx, cy; // arc center (inner corner)
    let sx, sy; // arc start point
    let ex, ey; // arc end point

    switch (i % 4) {
      case 0: // Square on the RIGHT
        side = h;
        rx = x + w - side;
        ry = y;
        // Center at TL, arc from TR to BL
        cx = rx;            cy = ry;
        sx = rx + side;     sy = ry;
        ex = rx;            ey = ry + side;
        w -= side;
        break;

      case 1: // Square on the BOTTOM
        side = w;
        rx = x;
        ry = y + h - side;
        // Center at TR, arc from BR to TL
        cx = rx + side;     cy = ry;
        sx = rx + side;     sy = ry + side;
        ex = rx;            ey = ry;
        h -= side;
        break;

      case 2: // Square on the LEFT
        side = h;
        rx = x;
        ry = y;
        // Center at BR, arc from BL to TR
        cx = rx + side;     cy = ry + side;
        sx = rx;            sy = ry + side;
        ex = rx + side;     ey = ry;
        x += side;
        w -= side;
        break;

      case 3: // Square on the TOP
        side = w;
        rx = x;
        ry = y;
        // Center at BL, arc from TL to BR
        cx = rx;            cy = ry + side;
        sx = rx;            sy = ry;
        ex = rx + side;     ey = ry + side;
        y += side;
        h -= side;
        break;
    }

    rects.push({
      x: rx, y: ry, w: side, h: side,
      arcCenterX: cx,
      arcCenterY: cy,
      arcStartX: sx,
      arcStartY: sy,
      arcEndX: ex,
      arcEndY: ey,
      arcRadius: side,
      arcSweep: 1 // Always clockwise
    });
  }

  return { rects, viewBox: { w: totalW, h: totalH } };
}

// Export for use in different contexts
if (typeof globalThis !== 'undefined') {
  globalThis.GoldenRatioMath = {
    PHI, PHI_INV, TOLERANCE,
    fibonacci, checkRatio, suggestGoldenPair, generateGoldenGeometry
  };
}
