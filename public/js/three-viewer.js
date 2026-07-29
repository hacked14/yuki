/* ============ THREE.JS "TOP PICKS" INTERACTIVE VIEWER ============
   Loads the admin-selected Top Pick product's .glb model with OrbitControls,
   toggles between a bare "360 Studio View" and a "Wear View" (bust/mannequin),
   and renders clickable hotspot dots pulled from the product's `hotspots` field.
*/

let scene, camera, renderer, controls, currentModel, bustModel;
let currentViewMode = 'studio';
let activeProduct = null;

async function initThreeViewer(product) {
  activeProduct = product;
  const container = document.getElementById('three-canvas-container');
  const loadingEl = document.getElementById('canvasLoading');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0.2, 3.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Lighting tuned for warm rose-gold/wire-wrapped jewelry
  scene.add(new THREE.AmbientLight(0xfff3e6, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xeab6be, 0.6);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;
  controls.enablePan = false;

  const loader = new THREE.GLTFLoader();

  const loadModel = (url) =>
    new Promise((resolve, reject) => {
      if (!url) return reject(new Error('No model URL'));
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err)
      );
    });

  try {
    if (product?.model3D?.url) {
      currentModel = await loadModel(product.model3D.url);
      centerAndScale(currentModel);
      scene.add(currentModel);
    } else {
      // Graceful fallback: a simple procedural placeholder (torus = wire-wrapped ring silhouette)
      const geo = new THREE.TorusKnotGeometry(0.55, 0.14, 120, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0xc9973f, metalness: 0.7, roughness: 0.25 });
      currentModel = new THREE.Mesh(geo, mat);
      scene.add(currentModel);
    }
    loadingEl && (loadingEl.style.display = 'none');
    renderHotspots(product?.hotspots || []);
  } catch (err) {
    console.warn('3D model failed to load, showing placeholder:', err);
    const geo = new THREE.TorusKnotGeometry(0.55, 0.14, 120, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9973f, metalness: 0.7, roughness: 0.25 });
    currentModel = new THREE.Mesh(geo, mat);
    scene.add(currentModel);
    loadingEl && (loadingEl.style.display = 'none');
  }

  animate();
  window.addEventListener('resize', onViewerResize);
}

function centerAndScale(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 1.6 / maxDim;
  object.scale.setScalar(scale);
}

function onViewerResize() {
  const container = document.getElementById('three-canvas-container');
  if (!container || !renderer || !camera) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls?.update();
  renderer?.render(scene, camera);
}

// Toggle between "360° Studio View" (model alone) and "Wear View" (model + a simple bust)
function setViewMode(mode) {
  currentViewMode = mode;
  document.querySelectorAll('.view-toggle button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));

  if (mode === 'wear') {
    if (!bustModel) {
      const geo = new THREE.CapsuleGeometry ? new THREE.CylinderGeometry(0.5, 0.7, 1.4, 32) : new THREE.CylinderGeometry(0.5, 0.7, 1.4, 32);
      const mat = new THREE.MeshStandardMaterial({ color: 0xf1e7d6, roughness: 0.9 });
      bustModel = new THREE.Mesh(geo, mat);
      bustModel.position.set(0, -1.1, 0);
    }
    scene.add(bustModel);
    if (currentModel) currentModel.position.y = 0.35;
  } else {
    if (bustModel) scene.remove(bustModel);
    if (currentModel) currentModel.position.y = 0;
  }
}

// Renders clickable dots over the canvas at normalized (x,y) positions from the product's hotspots
function renderHotspots(hotspots) {
  const frame = document.querySelector('.canvas-frame');
  document.querySelectorAll('.hotspot, .hotspot-tooltip').forEach((el) => el.remove());
  if (!frame || !hotspots.length) return;

  hotspots.forEach((spot, idx) => {
    const dot = document.createElement('div');
    dot.className = 'hotspot';
    dot.style.left = `${spot.x * 100}%`;
    dot.style.top = `${spot.y * 100}%`;

    const tooltip = document.createElement('div');
    tooltip.className = 'hotspot-tooltip';
    tooltip.style.left = `${spot.x * 100}%`;
    tooltip.style.top = `${spot.y * 100}%`;
    tooltip.innerHTML = `<strong>${spot.label}</strong><br>${spot.note || ''}`;

    dot.addEventListener('click', () => tooltip.classList.toggle('visible'));
    frame.appendChild(dot);
    frame.appendChild(tooltip);
  });
}

document.querySelectorAll('.view-toggle button').forEach((btn) => {
  btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
});
