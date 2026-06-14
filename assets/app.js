(function () {
  const data = window.KG_DATA;
  const typeMap = new Map(data.types.map((type) => [type.id, type]));
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  const adjacency = new Map();

  data.nodes.forEach((node) => adjacency.set(node.id, []));
  data.links.forEach((link) => {
    adjacency.get(link.source).push({ id: link.target, relation: link.relation, direction: "out" });
    adjacency.get(link.target).push({ id: link.source, relation: link.relation, direction: "in" });
  });

  const state = {
    selectedId: null,
    search: "",
    activeTypes: new Set(data.types.map((type) => type.id)),
    routeIds: new Set(),
    paused: false,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    draggingNode: null,
    panning: false,
    lastPointer: null,
    nodes: [],
    links: [],
    lastTick: 0
  };

  const svg = document.getElementById("graphSvg");
  const detail = document.getElementById("detailContent");
  const statusText = document.getElementById("statusText");
  const searchInput = document.getElementById("searchInput");
  const zoomRange = document.getElementById("zoomRange");
  const physicsButton = document.getElementById("togglePhysics");

  const graphRoot = createSvgElement("g", { class: "graph-root" });
  const linkLayer = createSvgElement("g", { class: "link-layer" });
  const labelLayer = createSvgElement("g", { class: "label-layer" });
  const nodeLayer = createSvgElement("g", { class: "node-layer" });
  graphRoot.append(linkLayer, labelLayer, nodeLayer);
  svg.append(graphRoot);

  function createSvgElement(tag, attrs = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function typeColor(typeId) {
    return typeMap.get(typeId)?.color || "#64748b";
  }

  function nodeRadius(node) {
    if (node.type === "topic") return 26;
    if (node.type === "law") return 22;
    if (node.type === "standard") return 18;
    if (node.type === "regulation") return 17;
    if (node.type === "agency") return 14;
    return 13;
  }

  function initControls() {
    renderMetrics();
    renderFilters();
    renderLegend();
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value.trim().toLowerCase();
      state.routeIds.clear();
      refreshGraph();
    });
    document.getElementById("fitGraph").addEventListener("click", fitGraph);
    physicsButton.addEventListener("click", () => {
      state.paused = !state.paused;
      physicsButton.querySelector(".icon").textContent = state.paused ? "▶" : "Ⅱ";
    });
    document.getElementById("exportData").addEventListener("click", exportData);
    zoomRange.addEventListener("input", () => {
      state.scale = Number(zoomRange.value) / 100;
      render();
    });
    document.querySelectorAll(".route-buttons button").forEach((button) => {
      button.addEventListener("click", () => setRoute(button.dataset.route));
    });
    window.addEventListener("resize", () => {
      fitGraph();
      refreshGraph();
    });
  }

  function renderMetrics() {
    document.getElementById("metricNodes").textContent = data.nodes.length;
    document.getElementById("metricLinks").textContent = data.links.length;
    document.getElementById("metricDocs").textContent = data.nodes.filter((node) => ["law", "regulation", "standard"].includes(node.type)).length;
    document.getElementById("metricPollutants").textContent = data.nodes.filter((node) => node.type === "pollutant").length;
  }

  function renderFilters() {
    const host = document.getElementById("typeFilters");
    host.innerHTML = "";
    data.types.forEach((type) => {
      const count = data.nodes.filter((node) => node.type === type.id).length;
      const label = document.createElement("label");
      label.className = "check-item";
      label.innerHTML = `
        <input type="checkbox" checked data-type="${type.id}">
        <span>${type.label}</span>
        <span class="check-count">${count}</span>
      `;
      label.querySelector("input").addEventListener("change", (event) => {
        if (event.target.checked) state.activeTypes.add(type.id);
        else state.activeTypes.delete(type.id);
        state.routeIds.clear();
        refreshGraph();
      });
      host.append(label);
    });
  }

  function renderLegend() {
    const host = document.getElementById("legend");
    host.innerHTML = "";
    data.types.forEach((type) => {
      const row = document.createElement("div");
      row.className = "legend-row";
      row.innerHTML = `<span class="legend-dot" style="background:${type.color}"></span><span>${type.label}</span>`;
      host.append(row);
    });
  }

  function setRoute(routeKey) {
    state.search = "";
    searchInput.value = "";
    state.routeIds = new Set(data.routes[routeKey] || []);
    state.selectedId = [...state.routeIds][0] || null;
    refreshGraph();
    renderDetail();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "air-pollution-kg.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function getVisibleData() {
    const search = state.search;
    const matchedIds = new Set();
    if (search) {
      data.nodes.forEach((node) => {
        const text = [node.label, node.code, node.summary, node.year, node.issuer].filter(Boolean).join(" ").toLowerCase();
        if (text.includes(search)) {
          matchedIds.add(node.id);
          adjacency.get(node.id).forEach((item) => matchedIds.add(item.id));
        }
      });
    }

    const allowedNodes = data.nodes.filter((node) => {
      const typeAllowed = state.activeTypes.has(node.type);
      const routeAllowed = state.routeIds.size === 0 || state.routeIds.has(node.id);
      const searchAllowed = !search || matchedIds.has(node.id);
      return typeAllowed && routeAllowed && searchAllowed;
    });

    const allowedIds = new Set(allowedNodes.map((node) => node.id));
    const allowedLinks = data.links.filter((link) => allowedIds.has(link.source) && allowedIds.has(link.target));
    return { allowedNodes, allowedLinks };
  }

  function refreshGraph() {
    const { allowedNodes, allowedLinks } = getVisibleData();
    const bounds = svg.getBoundingClientRect();
    const width = bounds.width || 800;
    const height = (bounds.height || 620) - 10;

    const oldPositions = new Map(state.nodes.map((node) => [node.id, node]));
    state.nodes = allowedNodes.map((node, index) => {
      const old = oldPositions.get(node.id);
      const anchor = anchorFor(node.type, width, height);
      const angle = (index / Math.max(allowedNodes.length, 1)) * Math.PI * 2;
      const ring = 70 + (index % 4) * 26;
      return {
        ...node,
        radius: nodeRadius(node),
        x: old?.x ?? anchor.x + Math.cos(angle) * ring,
        y: old?.y ?? anchor.y + Math.sin(angle) * ring,
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0
      };
    });
    const visibleById = new Map(state.nodes.map((node) => [node.id, node]));
    state.links = allowedLinks
      .map((link) => ({ ...link, sourceNode: visibleById.get(link.source), targetNode: visibleById.get(link.target) }))
      .filter((link) => link.sourceNode && link.targetNode);

    buildSvg();
    updateStatus();
    renderDetail();
    render();
  }

  function buildSvg() {
    linkLayer.innerHTML = "";
    labelLayer.innerHTML = "";
    nodeLayer.innerHTML = "";

    state.links.forEach((link, index) => {
      const line = createSvgElement("line", { class: "link", "data-index": index });
      linkLayer.append(line);
      const label = createSvgElement("text", { class: "link-label", "data-index": index });
      label.textContent = link.relation;
      labelLayer.append(label);
    });

    state.nodes.forEach((node) => {
      const group = createSvgElement("g", { class: "node", "data-id": node.id });
      const circle = createSvgElement("circle", { r: node.radius, fill: typeColor(node.type) });
      const label = createSvgElement("text", {
        "text-anchor": "middle",
        dy: node.radius + 16
      });
      label.textContent = shortenLabel(node.label);
      group.append(circle, label);
      group.addEventListener("pointerdown", (event) => startNodeDrag(event, node.id));
      group.addEventListener("click", (event) => {
        event.stopPropagation();
        selectNode(node.id);
      });
      nodeLayer.append(group);
    });
  }

  function shortenLabel(label) {
    if (label.length <= 14) return label;
    return `${label.slice(0, 13)}…`;
  }

  function updateStatus() {
    const routeText = state.routeIds.size ? `重点链路 ${state.nodes.length} 个实体` : "";
    const searchText = state.search ? `检索结果 ${state.nodes.length} 个实体` : "";
    statusText.textContent = routeText || searchText || `全部实体 ${state.nodes.length} 个`;
  }

  function selectNode(id) {
    state.selectedId = id;
    state.routeIds.clear();
    renderDetail();
    render();
  }

  function renderDetail() {
    const node = state.selectedId ? nodeById.get(state.selectedId) : null;
    if (!node || !state.nodes.some((item) => item.id === node.id)) {
      detail.innerHTML = `
        <p class="empty-title">未选中实体</p>
        <p class="empty-copy">从左侧检索或在图中选择节点。</p>
      `;
      return;
    }

    const type = typeMap.get(node.type);
    const relations = adjacency.get(node.id)
      .map((item) => ({ ...item, node: nodeById.get(item.id) }))
      .filter((item) => item.node);
    const relatedHtml = relations.slice(0, 12).map((item) => {
      const arrow = item.direction === "out" ? "→" : "←";
      return `<div class="relation-item"><strong>${node.label}</strong> ${arrow} ${item.relation} ${arrow} ${item.node.label}</div>`;
    }).join("");

    const sourceHtml = node.sourceUrl
      ? `<a class="source-link" href="${node.sourceUrl}" target="_blank" rel="noreferrer">${node.sourceUrl}</a>`
      : "课程整理数据";

    detail.innerHTML = `
      <div>
        <h2 class="detail-title">${node.label}</h2>
      </div>
      <div class="badge-row">
        <span class="badge" style="background:${typeColor(node.type)}">${type?.label || node.type}</span>
        ${node.code ? `<span class="badge" style="background:#334155">${node.code}</span>` : ""}
      </div>
      <p class="summary">${node.summary || ""}</p>
      <div class="detail-section">
        <h3>属性</h3>
        <div class="kv">
          <span>年份</span><span>${node.year || "未标注"}</span>
          <span>发布方</span><span>${node.issuer || "未标注"}</span>
          <span>来源</span><span>${sourceHtml}</span>
        </div>
      </div>
      <div class="detail-section">
        <h3>关联关系</h3>
        <div class="link-list">${relatedHtml || '<div class="relation-item">暂无关联</div>'}</div>
      </div>
    `;
  }

  function startNodeDrag(event, id) {
    event.preventDefault();
    event.stopPropagation();
    const node = state.nodes.find((item) => item.id === id);
    if (!node) return;
    state.draggingNode = node;
    state.paused = false;
    node.fx = node.x;
    node.fy = node.y;
    svg.setPointerCapture(event.pointerId);
  }

  svg.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".node")) return;
    state.panning = true;
    state.lastPointer = { x: event.clientX, y: event.clientY };
    svg.setPointerCapture(event.pointerId);
  });

  svg.addEventListener("pointermove", (event) => {
    if (state.draggingNode) {
      const point = toGraphPoint(event.clientX, event.clientY);
      state.draggingNode.x = point.x;
      state.draggingNode.y = point.y;
      state.draggingNode.vx = 0;
      state.draggingNode.vy = 0;
      render();
      return;
    }
    if (state.panning && state.lastPointer) {
      state.offsetX += event.clientX - state.lastPointer.x;
      state.offsetY += event.clientY - state.lastPointer.y;
      state.lastPointer = { x: event.clientX, y: event.clientY };
      render();
    }
  });

  svg.addEventListener("pointerup", (event) => {
    if (state.draggingNode) {
      delete state.draggingNode.fx;
      delete state.draggingNode.fy;
      state.draggingNode = null;
    }
    state.panning = false;
    state.lastPointer = null;
    try {
      svg.releasePointerCapture(event.pointerId);
    } catch (_) {
      // Pointer capture can be absent after a browser-level cancel.
    }
  });

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const next = Math.max(0.55, Math.min(1.5, state.scale + (event.deltaY > 0 ? -0.06 : 0.06)));
    state.scale = next;
    zoomRange.value = Math.round(next * 100);
    render();
  }, { passive: false });

  svg.addEventListener("click", () => {
    if (!state.panning) {
      state.selectedId = null;
      renderDetail();
      render();
    }
  });

  function toGraphPoint(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - state.offsetX) / state.scale,
      y: (clientY - rect.top - state.offsetY) / state.scale
    };
  }

  function fitGraph() {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    zoomRange.value = 100;
    const bounds = svg.getBoundingClientRect();
    state.nodes.forEach((node, index) => {
      const anchor = anchorFor(node.type, bounds.width || 800, bounds.height || 600);
      const angle = (index / Math.max(state.nodes.length, 1)) * Math.PI * 2;
      const ring = 70 + (index % 5) * 24;
      node.x = anchor.x + Math.cos(angle) * ring;
      node.y = anchor.y + Math.sin(angle) * ring;
      node.vx = 0;
      node.vy = 0;
    });
    render();
  }

  function tick() {
    if (!state.paused) simulate();
    render();
    requestAnimationFrame(tick);
  }

  function simulate() {
    const bounds = svg.getBoundingClientRect();
    const width = bounds.width || 800;
    const height = bounds.height || 620;
    const alpha = 0.022;

    state.links.forEach((link) => {
      const source = link.sourceNode;
      const target = link.targetNode;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = source.type === "topic" || target.type === "topic" ? 170 : 150;
      const force = (distance - desired) * 0.0038;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    for (let i = 0; i < state.nodes.length; i += 1) {
      const a = state.nodes[i];
      for (let j = i + 1; j < state.nodes.length; j += 1) {
        const b = state.nodes[j];
        const dx = b.x - a.x || 0.1;
        const dy = b.y - a.y || 0.1;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const minDistance = a.radius + b.radius + 64;
        const strength = distance < minDistance ? (minDistance - distance) * 0.018 : 320 / (distance * distance);
        const fx = (dx / distance) * strength;
        const fy = (dy / distance) * strength;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    state.nodes.forEach((node) => {
      const anchor = anchorFor(node.type, width, height);
      node.vx += (anchor.x - node.x) * alpha * (node.type === "topic" ? 0.22 : 0.08);
      node.vy += (anchor.y - node.y) * alpha * (node.type === "topic" ? 0.22 : 0.08);
      node.vx *= 0.88;
      node.vy *= 0.88;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(38, Math.min(width - 38, node.x));
      node.y = Math.max(38, Math.min(height - 42, node.y));
    });
  }

  function anchorFor(type, width, height) {
    const safeWidth = Math.max(width, 520);
    const safeHeight = Math.max(height, 520);
    const anchors = {
      topic: [0.5, 0.48],
      law: [0.66, 0.38],
      regulation: [0.73, 0.55],
      standard: [0.53, 0.68],
      pollutant: [0.32, 0.62],
      industry: [0.28, 0.34],
      measure: [0.46, 0.28],
      limit: [0.68, 0.72],
      agency: [0.83, 0.35]
    };
    const [x, y] = anchors[type] || [0.5, 0.5];
    return { x: safeWidth * x, y: safeHeight * y };
  }

  function render() {
    graphRoot.setAttribute("transform", `translate(${state.offsetX},${state.offsetY}) scale(${state.scale})`);
    const activeNeighborIds = getActiveNeighborIds();

    state.links.forEach((link, index) => {
      const line = linkLayer.querySelector(`[data-index="${index}"]`);
      const label = labelLayer.querySelector(`[data-index="${index}"]`);
      const isActive = state.selectedId && (link.source === state.selectedId || link.target === state.selectedId);
      const isRoute = state.routeIds.has(link.source) && state.routeIds.has(link.target);
      line.setAttribute("x1", link.sourceNode.x);
      line.setAttribute("y1", link.sourceNode.y);
      line.setAttribute("x2", link.targetNode.x);
      line.setAttribute("y2", link.targetNode.y);
      line.setAttribute("class", classNames("link", isActive && "active", isRoute && "route", activeNeighborIds && !isActive && !isRoute && "dimmed"));
      label.setAttribute("x", (link.sourceNode.x + link.targetNode.x) / 2);
      label.setAttribute("y", (link.sourceNode.y + link.targetNode.y) / 2 - 5);
      label.setAttribute("class", classNames("link-label", activeNeighborIds && !isActive && !isRoute && "dimmed"));
    });

    state.nodes.forEach((node) => {
      const group = nodeLayer.querySelector(`[data-id="${CSS.escape(node.id)}"]`);
      const isActive = node.id === state.selectedId;
      const isRoute = state.routeIds.has(node.id);
      const isDimmed = activeNeighborIds && !activeNeighborIds.has(node.id) && !isActive && !isRoute;
      group.setAttribute("transform", `translate(${node.x},${node.y})`);
      group.setAttribute("class", classNames("node", isActive && "active", isRoute && "route", isDimmed && "dimmed"));
    });
  }

  function getActiveNeighborIds() {
    if (!state.selectedId) return null;
    const ids = new Set([state.selectedId]);
    adjacency.get(state.selectedId).forEach((item) => ids.add(item.id));
    return ids;
  }

  function classNames(...names) {
    return names.filter(Boolean).join(" ");
  }

  initControls();
  refreshGraph();
  fitGraph();
  requestAnimationFrame(tick);
})();
