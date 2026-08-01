(() => {
  const slider = document.getElementById('comparison-slider');
  const after = document.getElementById('after-image');
  const divider = document.getElementById('divider');
  const handle = document.getElementById('handle');
  const world = document.getElementById('world');
  const rotation = document.getElementById('rotation');
  const tilt = document.getElementById('tilt');
  const zoom = document.getElementById('zoom');
  const rotationOutput = document.getElementById('rotation-output');
  const tiltOutput = document.getElementById('tilt-output');
  const zoomOutput = document.getElementById('zoom-output');

  if (!slider || !after || !divider || !handle || !world || !rotation || !tilt || !zoom) {
    console.error('EBC Project Viewer could not initialize because a required element is missing.');
    return;
  }

  const updateComparison = () => {
    const value = Number(slider.value);
    after.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    divider.style.left = `${value}%`;
    handle.style.left = `${value}%`;
  };

  const updateWorld = () => {
    world.style.transform = `rotateX(${tilt.value}deg) rotateZ(${rotation.value}deg) scale(${Number(zoom.value) / 100})`;
    rotationOutput.textContent = `${rotation.value}°`;
    tiltOutput.textContent = `${tilt.value}°`;
    zoomOutput.textContent = `${zoom.value}%`;
  };

  const connectLayerToggle = (toggleId, layerId) => {
    const toggle = document.getElementById(toggleId);
    const layer = document.getElementById(layerId);
    if (!toggle || !layer) return;
    toggle.addEventListener('change', () => {
      layer.hidden = !toggle.checked;
    });
  };

  slider.addEventListener('input', updateComparison);
  [rotation, tilt, zoom].forEach((control) => control.addEventListener('input', updateWorld));
  connectLayerToggle('show-slab', 'slab-layer');
  connectLayerToggle('show-rebar', 'rebar-layer');
  connectLayerToggle('show-base', 'base-layer');

  updateComparison();
  updateWorld();
})();
