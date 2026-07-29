((root) => {
  function polygonArea(points) {
    if (points.length < 3) return 0;
    return Math.abs(points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0)) / 2;
  }

  function distance(first, second) {
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function polygonPerimeter(points, closed = true) {
    if (points.length < 2) return 0;
    const limit = closed ? points.length : points.length - 1;
    let total = 0;
    for (let index = 0; index < limit; index += 1) {
      total += distance(points[index], points[(index + 1) % points.length]);
    }
    return total;
  }

  function materialTakeoff({ area, perimeter, thickness, waste, baseDepth }) {
    const safeArea = Math.max(0, Number(area) || 0);
    const safePerimeter = Math.max(0, Number(perimeter) || 0);
    const safeThickness = Math.max(0, Number(thickness) || 0);
    const safeWaste = Math.max(0, Number(waste) || 0);
    const safeBaseDepth = Math.max(0, Number(baseDepth) || 0);
    const yards = safeArea * (safeThickness / 12) / 27;
    return {
      area: safeArea,
      perimeter: safePerimeter,
      yards,
      orderYards: yards * (1 + safeWaste / 100),
      baseYards: safeArea * (safeBaseDepth / 12) / 27 * (1 + safeWaste / 100)
    };
  }

  root.EbcPlanMath = {
    polygonArea,
    distance,
    polygonPerimeter,
    materialTakeoff
  };
})(typeof window === 'undefined' ? globalThis : window);
