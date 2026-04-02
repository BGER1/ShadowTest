import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/RGBELoader.js";

export function Viewer() {
  const wrapper = document.getElementById("viewerCanvasWrapper");
  const loaderEl = document.getElementById("loader");
  const loaderInfo = document.getElementById("loaderInfo");
  const infoRows = document.getElementById("infoRows");
  const availabilityToggle = document.getElementById("availabilityToggle");

  const overviewSection = document.getElementById("overviewSection");
  const detailsSection = document.getElementById("detailsSection");
  const overviewHeader = document.getElementById("overviewHeader");
  const detailsHeader = document.getElementById("detailsHeader");

  const detailsCard = document.getElementById("detailsCard");
  const detailsTitle = document.getElementById("detailsTitle");
  const detailsBadge = document.getElementById("detailsBadge");
  const detailsSize = document.getElementById("detailsSize");
  const detailsPrice = document.getElementById("detailsPrice");
  const detailsRooms = document.getElementById("detailsRooms");
  const detailsFloor = document.getElementById("detailsFloor");
  const detailsOrientation = document.getElementById("detailsOrientation");
  const detailsOutdoor = document.getElementById("detailsOutdoor");
  const detailsPlan = document.getElementById("detailsPlan");
  const detailsPlanEmpty = document.getElementById("detailsPlanEmpty");

  if (!wrapper) throw new Error("Missing #viewerCanvasWrapper");

  const BUILDING_URL =
    "./models/Testche.glb";

  // Replace with your own .hdr/.exr once uploaded somewhere public.
  // Leave empty string to skip HDRI.
  const ENV_URL = "";

  const SHEET_ID = "1wp3hwv9EFidEjsW-FdtniqcdWx_H-VQe_LcrQhelf3k";
  const SHEET_GID = "0";
  const SHEET_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}`;

  let units = [
    { key: "TOP1", number: "Top1", floor: "EG", size: "68 m²", price: "€ 289.000", status: "free", rooms: "2", orientation: "Süd-West", outdoor: "Terrasse 14 m²", plan: "" },
    { key: "TOP2", number: "Top2", floor: "1. OG", size: "74 m²", price: "€ 315.000", status: "reserved", rooms: "3", orientation: "Süd", outdoor: "Balkon 8 m²", plan: "" },
    { key: "TOP3", number: "Top3", floor: "2. OG", size: "81 m²", price: "€ 349.000", status: "free", rooms: "3", orientation: "Süd-Ost", outdoor: "Loggia 7 m²", plan: "" },
    { key: "TOP4", number: "Top4", floor: "3. OG", size: "90 m²", price: "€ 389.000", status: "free", rooms: "4", orientation: "West", outdoor: "Balkon 11 m²", plan: "" },
    { key: "TOP5", number: "Top5", floor: "4. OG", size: "112 m²", price: "Verkauft", status: "sold", rooms: "4", orientation: "Süd-West", outdoor: "Dachterrasse 28 m²", plan: "" }
  ];

  let showOnlyAvailable = false;

  const STATUS_COLOR = {
    free: new THREE.Color(0x1f9d55),
    reserved: new THREE.Color(0xc78b07),
    sold: new THREE.Color(0xb91c1c)
  };

  const STATUS_LABEL = {
    free: "Frei",
    reserved: "Reserviert",
    sold: "Verkauft"
  };

  const AUTO_ROTATE_DELAY_MS = 10000;
  const AUTO_ROTATE_START_DELAY_MS = 1200;

  function normalizeUnitKey(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "";

    const match = raw.match(/^TOP(\d+)$/);
    if (match) return `TOP${match[1]}`;
    if (/^\d+$/.test(raw)) return `TOP${raw}`;

    return "";
  }

  function unitKeyFromName(nameRaw) {
    const raw = String(nameRaw || "").trim().toUpperCase();
    const match = raw.match(/^TOP(\d+)$/);
    return match ? `TOP${match[1]}` : "";
  }

  function normalizeStatus(value) {
    const s = String(value || "").trim().toLowerCase();
    if (s === "free" || s === "frei") return "free";
    if (s === "reserved" || s === "reserviert") return "reserved";
    if (s === "sold" || s === "verkauft") return "sold";
    return s;
  }

  function statusBadge(status) {
    return `<span class="badge ${status}">${STATUS_LABEL[status] || status}</span>`;
  }

  function getUnitByKey(key) {
    const normalized = normalizeUnitKey(key);
    return units.find((u) => normalizeUnitKey(u.key) === normalized) || null;
  }

  function resolvePlanUrl(planValue) {
    return String(planValue || "").trim();
  }

  function setSectionOpen(sectionEl, open) {
    if (!sectionEl) return;
    sectionEl.classList.toggle("is-open", open);
  }

  overviewHeader?.addEventListener("click", () => {
    setSectionOpen(overviewSection, !overviewSection.classList.contains("is-open"));
  });

  detailsHeader?.addEventListener("click", () => {
    setSectionOpen(detailsSection, !detailsSection.classList.contains("is-open"));
  });

  // SCENE
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f3);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  wrapper.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // CONTROLS
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.78;
  controls.minDistance = 4;
  controls.maxDistance = 120;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.minPolarAngle = 0.22;
  controls.screenSpacePanning = false;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.55;
  controls.target.set(0, 2, 0);

  // LIGHTS
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xf8fbff, 0xe9e1d4, 0.80);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3e3, 2.2);
  sun.position.set(30, 12, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.00005;
  sun.shadow.normalBias = 0.02;
  sun.intensity = 1.4;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xe7eef9, 0.45);
  fill.position.set(-16, 12, -14);
  scene.add(fill);

  const kick = new THREE.DirectionalLight(0xf6efe6, 0.22);
  kick.position.set(8, 8, -18);
  scene.add(kick);

  const groundShadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.ShadowMaterial({ opacity: 0.08 })
  );
  groundShadowCatcher.rotation.x = -Math.PI / 2;
  groundShadowCatcher.receiveShadow = true;
  groundShadowCatcher.position.y = -0.03;
  scene.add(groundShadowCatcher);

  function resize() {
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  let idleTimer = null;

  function setAutoRotate(enabled) {
    controls.autoRotate = enabled;
  }

  function scheduleAutoRotateRestart(delay = AUTO_ROTATE_DELAY_MS) {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      setAutoRotate(true);
    }, delay);
  }

  function onUserInteraction() {
    setAutoRotate(false);
    scheduleAutoRotateRestart(AUTO_ROTATE_DELAY_MS);
  }

  async function fetchSheetData() {
    if (!SHEET_ID) return units;

    try {
      const res = await fetch(SHEET_URL, { cache: "no-store" });
      const text = await res.text();

      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");

      if (start === -1 || end === -1 || end <= start) {
        throw new Error("Google Sheets response could not be parsed.");
      }

      const jsonText = text.slice(start, end + 1);
      const data = JSON.parse(jsonText);

      const cols = (data.table?.cols || []).map((c) =>
        String(c.label || c.id || "").trim().toLowerCase()
      );
      const rows = data.table?.rows || [];

      const parsed = rows
        .map((row) => {
          const obj = {};

          cols.forEach((colName, i) => {
            const cell = row.c?.[i];
            obj[colName] = cell ? (cell.f ?? cell.v ?? "") : "";
          });

          const rawNumber = String(obj.number || "").trim();
          const normalizedKey = normalizeUnitKey(rawNumber);

          return {
            key: normalizedKey,
            number: rawNumber || normalizedKey,
            floor: String(obj.floor || "").trim(),
            size: String(obj.size || "").trim(),
            price: String(obj.price || "").trim(),
            status: normalizeStatus(obj.status),
            rooms: String(obj.rooms || "").trim(),
            orientation: String(obj.orientation || "").trim(),
            outdoor: String(obj.outdoor || "").trim(),
            plan: String(obj.plan || "").trim()
          };
        })
        .filter((u) => u.key && /^TOP[1-5]$/.test(u.key));

      if (parsed.length) {
        units = parsed;
        console.log("Loaded units from Google Sheets:", units);
      }

      return units;
    } catch (err) {
      console.error("Failed to load sheet data:", err);
      return units;
    }
  }

  // LOADER
  const gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/");
  gltfLoader.setDRACOLoader(dracoLoader);

  let root = null;
  let pickMeshes = [];
  const unitGroups = new Map();

  let hoveredKey = null;
  let selectedKey = null;
  const overlayClones = new Map();

  function collectUnitGroups() {
    unitGroups.clear();

    const allowedKeys = new Set(units.map((u) => normalizeUnitKey(u.key)));

    root.traverse((obj) => {
      const key = unitKeyFromName(obj.name);
      if (!key) return;
      if (!allowedKeys.has(key)) return;
      if (!unitGroups.has(key)) {
        unitGroups.set(key, obj);
      }
    });

    console.log("Unit groups found:", [...unitGroups.keys()]);
  }

  function tuneMaterial(material) {
    if (!material) return;

    material.needsUpdate = true;

    // Keep baked colors stable.
    if ("metalness" in material) {
      material.metalness = Math.min(material.metalness ?? 0, 0.15);
    }

    if ("roughness" in material) {
      material.roughness = Math.max(material.roughness ?? 0.85, 0.78);
    }

    // PBR materials benefit from environment light.
    if ("envMapIntensity" in material) {
      material.envMapIntensity = 0.55;
    }

    if ("transparent" in material && material.transparent) {
      material.depthWrite = false;
    }

    if ("map" in material && material.map) {
      material.map.colorSpace = THREE.SRGBColorSpace;
    }

    if ("emissiveMap" in material && material.emissiveMap) {
      material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    }

    if ("normalScale" in material && material.normalScale) {
      material.normalScale.set(1, 1);
    }
  }

  function tuneMesh(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(tuneMaterial);
    } else {
      tuneMaterial(mesh.material);
    }
  }

  function clearOverlayGroup(key) {
    const normalized = normalizeUnitKey(key);
    const items = overlayClones.get(normalized);
    if (!items) return;

    items.forEach((mesh) => {
      if (mesh.parent) mesh.parent.remove(mesh);
      if (mesh.material) mesh.material.dispose();
    });

    overlayClones.delete(normalized);
  }

  function clearAllOverlays() {
    for (const key of Array.from(overlayClones.keys())) {
      clearOverlayGroup(key);
    }
  }

  function addOverlayGroup(key, tintColor, opacity = 0.45) {
    const normalized = normalizeUnitKey(key);
    const group = unitGroups.get(normalized);
    if (!group) return;

    clearOverlayGroup(normalized);

    const originals = [];
    group.traverse((child) => {
      if (child.isMesh && child.geometry && !child.userData.__isOverlay) {
        originals.push(child);
      }
    });

    const clones = [];

    originals.forEach((child) => {
      const overlayMaterial = new THREE.MeshBasicMaterial({
        color: tintColor,
        transparent: true,
        opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });

      const overlay = new THREE.Mesh(child.geometry, overlayMaterial);
      overlay.userData.__isOverlay = true;
      overlay.renderOrder = 999;
      overlay.position.set(0, 0, 0);
      overlay.rotation.set(0, 0, 0);
      overlay.scale.set(1, 1, 1);

      child.add(overlay);
      clones.push(overlay);
    });

    overlayClones.set(normalized, clones);
  }

  function refreshVisualState() {
    clearAllOverlays();

    if (showOnlyAvailable) {
      units.forEach((u) => {
        if (u.status === "free") {
          addOverlayGroup(u.key, STATUS_COLOR.free, 0.36);
        }
      });
    }

    if (selectedKey) {
      const unit = getUnitByKey(selectedKey);
      const shouldShowSelected = !showOnlyAvailable || unit?.status === "free";
      if (shouldShowSelected) {
        const color = STATUS_COLOR[unit?.status] || new THREE.Color(0x3399ff);
        addOverlayGroup(selectedKey, color, 0.28);
      }
    }

    if (hoveredKey) {
      const unit = getUnitByKey(hoveredKey);
      const shouldShowHovered = !showOnlyAvailable || unit?.status === "free";
      if (shouldShowHovered) {
        const color = STATUS_COLOR[unit?.status] || new THREE.Color(0x3399ff);
        addOverlayGroup(hoveredKey, color, 0.50);
      }
    }

    updateTableRowStates();
  }

  function updateTableRowStates() {
    const rows = infoRows?.querySelectorAll("tr[data-key]");
    if (!rows) return;

    rows.forEach((row) => {
      const key = normalizeUnitKey(row.getAttribute("data-key"));
      row.classList.toggle("is-active", key === normalizeUnitKey(selectedKey));
      row.classList.toggle("is-hover", key === normalizeUnitKey(hoveredKey));
    });
  }

  function renderTable() {
    if (!infoRows) return;

    infoRows.innerHTML = units.map((u) => {
      return `
        <tr data-key="${u.key}">
          <td>${u.number}</td>
          <td>${u.floor}</td>
          <td>${u.size}</td>
          <td>${u.price}</td>
          <td>${statusBadge(u.status)}</td>
        </tr>
      `;
    }).join("");

    const rows = infoRows.querySelectorAll("tr[data-key]");
    rows.forEach((row) => {
      row.addEventListener("mouseenter", () => {
        hoveredKey = normalizeUnitKey(row.getAttribute("data-key"));
        refreshVisualState();
      });

      row.addEventListener("mouseleave", () => {
        hoveredKey = null;
        refreshVisualState();
      });

      row.addEventListener("click", async () => {
        onUserInteraction();
        await selectUnit(row.getAttribute("data-key"));
      });
    });

    updateTableRowStates();
  }

  function showDetails(unit) {
    if (!unit) {
      detailsCard?.classList.add("is-hidden");
      return;
    }

    detailsCard?.classList.remove("is-hidden");

    detailsTitle.textContent = unit.number || "—";
    detailsBadge.className = `badge ${unit.status}`;
    detailsBadge.textContent = STATUS_LABEL[unit.status] || unit.status;

    detailsSize.textContent = unit.size || "—";
    detailsPrice.textContent = unit.price || "—";
    detailsRooms.textContent = unit.rooms || "—";
    detailsFloor.textContent = unit.floor || "—";
    detailsOrientation.textContent = unit.orientation || "—";
    detailsOutdoor.textContent = unit.outdoor || "—";

    const planUrl = resolvePlanUrl(unit.plan);
    if (planUrl) {
      detailsPlan.src = planUrl;
      detailsPlan.classList.remove("is-hidden");
      detailsPlanEmpty.style.display = "none";
    } else {
      detailsPlan.removeAttribute("src");
      detailsPlan.classList.add("is-hidden");
      detailsPlanEmpty.style.display = "block";
    }
  }

  function flyCameraToGroup(key, ms = 900) {
    const group = unitGroups.get(normalizeUnitKey(key));
    if (!group) return Promise.resolve();

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z);

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();

    const endTarget = new THREE.Vector3(
      center.x,
      center.y + size.y * 0.18,
      center.z
    );

    const offset = camera.position.clone().sub(controls.target);
    const dir = offset.lengthSq() > 0
      ? offset.clone().normalize()
      : new THREE.Vector3(1, 0.35, 1).normalize();

    const endPos = endTarget.clone().add(dir.multiplyScalar(Math.max(radius * 2.0, 8)));

    return new Promise((resolve) => {
      const t0 = performance.now();

      function ease(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      function step(now) {
        const t = Math.min(1, (now - t0) / ms);
        const k = ease(t);

        camera.position.lerpVectors(startPos, endPos, k);
        controls.target.lerpVectors(startTarget, endTarget, k);
        controls.update();

        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }

      requestAnimationFrame(step);
    });
  }

  async function selectUnit(key) {
    selectedKey = normalizeUnitKey(key);
    renderTable();
    showDetails(getUnitByKey(selectedKey));
    refreshVisualState();

    setSectionOpen(overviewSection, false);
    setSectionOpen(detailsSection, true);

    await flyCameraToGroup(selectedKey, 900);
  }

  function fitCamera(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    camera.position.set(
      center.x + maxDim * 0.55,
      center.y + maxDim * 0.22,
      center.z + maxDim * 0.72
    );

    controls.target.set(center.x, center.y + size.y * 0.14, center.z);
    controls.update();

    controls.minDistance = Math.max(4, maxDim * 0.28);
    controls.maxDistance = Math.max(20, maxDim * 4.8);

    const shadowRange = Math.max(size.x, size.z) * 0.9;
    sun.shadow.camera.left = -shadowRange;
    sun.shadow.camera.right = shadowRange;
    sun.shadow.camera.top = shadowRange;
    sun.shadow.camera.bottom = -shadowRange;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = Math.max(120, size.y * 10);
    sun.target.position.copy(center);
    scene.add(sun.target);

    groundShadowCatcher.position.y = box.min.y - 0.025;
  }

  function applyEnvironment(texture) {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    texture.dispose();
  }

  async function loadEnvironment() {
    if (!ENV_URL) return;

    const rgbeLoader = new RGBELoader();
    const hdrTexture = await rgbeLoader.loadAsync(ENV_URL);
    applyEnvironment(hdrTexture);
  }

  function loadModel(url) {
    return new Promise((resolve, reject) => {
      if (loaderEl) loaderEl.style.display = "block";
      if (loaderInfo) loaderInfo.textContent = "Loading…";

      gltfLoader.load(
        url,
        (gltf) => {
          root = gltf.scene;
          window.root = root;
          pickMeshes = [];

          root.traverse((o) => {
            if (o.isMesh) {
              pickMeshes.push(o);
              tuneMesh(o);
            }
          });

          scene.add(root);
          collectUnitGroups();
          fitCamera(root);

          if (loaderEl) loaderEl.style.display = "none";
          if (loaderInfo) loaderInfo.textContent = "";

          resolve(root);
        },
        (ev) => {
          if (loaderInfo) {
            if (ev.total && ev.total > 0) {
              const p = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
              loaderInfo.textContent = `Loading… ${p}%`;
            } else {
              loaderInfo.textContent = "Loading…";
            }
          }
        },
        (err) => {
          console.error(err);
          if (loaderEl) loaderEl.style.display = "none";
          if (loaderInfo) loaderInfo.textContent = "Fehler beim Laden.";
          reject(err);
        }
      );
    });
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function setPointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function findKeyByWalkingParents(obj) {
    let cur = obj;
    while (cur && cur !== root) {
      const key = unitKeyFromName(cur.name);
      if (key) return key;
      cur = cur.parent;
    }
    return null;
  }

  function onPointerMove(e) {
    if (!root) return;

    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(pickMeshes, true);

    if (!hits.length) {
      hoveredKey = null;
      refreshVisualState();
      return;
    }

    const key = findKeyByWalkingParents(hits[0].object);
    if (!key) {
      hoveredKey = null;
      refreshVisualState();
      return;
    }

    const normalizedKey = normalizeUnitKey(key);

    if (hoveredKey !== normalizedKey) {
      hoveredKey = normalizedKey;
      refreshVisualState();
    }
  }

  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerleave", () => {
    hoveredKey = null;
    refreshVisualState();
  });

  controls.addEventListener("start", onUserInteraction);
  renderer.domElement.addEventListener("wheel", onUserInteraction, { passive: true });
  renderer.domElement.addEventListener("pointerdown", onUserInteraction);

  const clickState = {
    downX: 0,
    downY: 0,
    downTime: 0,
    isDown: false
  };

  const CLICK_MOVE_PX = 6;
  const CLICK_MAX_MS = 450;

  renderer.domElement.addEventListener("pointerdown", (e) => {
    clickState.isDown = true;
    clickState.downX = e.clientX;
    clickState.downY = e.clientY;
    clickState.downTime = performance.now();
  });

  renderer.domElement.addEventListener("pointerup", async (e) => {
    if (!clickState.isDown) return;
    clickState.isDown = false;

    const dx = e.clientX - clickState.downX;
    const dy = e.clientY - clickState.downY;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - clickState.downTime;

    if (dist > CLICK_MOVE_PX || dt > CLICK_MAX_MS) return;
    if (!root) return;

    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(pickMeshes, true);
    if (!hits.length) return;

    const key = findKeyByWalkingParents(hits[0].object);
    if (!key) return;

    onUserInteraction();
    await selectUnit(key);
  });

  function updateAvailabilityButton() {
    if (!availabilityToggle) return;
    availabilityToggle.classList.toggle("is-active", showOnlyAvailable);
    availabilityToggle.textContent = showOnlyAvailable
      ? "Alle Wohnungen anzeigen"
      : "Nur verfügbare Wohnungen anzeigen";
  }

  availabilityToggle?.addEventListener("click", () => {
    showOnlyAvailable = !showOnlyAvailable;
    hoveredKey = null;

    if (showOnlyAvailable) {
      const selected = getUnitByKey(selectedKey);
      if (selected && selected.status !== "free") {
        selectedKey = null;
        showDetails(null);
      }
    }

    refreshVisualState();
    updateAvailabilityButton();
    onUserInteraction();
  });

  async function init() {
    renderTable();
    showDetails(null);
    updateAvailabilityButton();

    await fetchSheetData();
    renderTable();
    updateAvailabilityButton();

    await loadEnvironment();
    await loadModel(BUILDING_URL);

    if (loaderInfo) loaderInfo.textContent = "Loading… 100%";
    setTimeout(() => {
      if (loaderEl) loaderEl.style.display = "none";
      if (loaderInfo) loaderInfo.textContent = "";
    }, 120);

    setTimeout(() => {
      setAutoRotate(true);
      scheduleAutoRotateRestart(AUTO_ROTATE_DELAY_MS);
    }, AUTO_ROTATE_START_DELAY_MS);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  return { init };
}
