(function () {
  const data = window.KG_DATA;
  const typeMap = new Map(data.types.map((type) => [type.id, type]));
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  const adjacency = new Map(data.nodes.map((node) => [node.id, []]));

  data.links = data.links.filter((link) => nodeById.has(link.source) && nodeById.has(link.target));
  data.links.forEach((link) => {
    adjacency.get(link.source).push({ id: link.target, relation: link.relation, direction: "out" });
    adjacency.get(link.target).push({ id: link.source, relation: link.relation, direction: "in" });
  });

  const degree = new Map(data.nodes.map((node) => [node.id, adjacency.get(node.id).length]));
  const relationNames = [...new Set(data.links.map((link) => link.relation))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const routeNames = {
    permit: "排污许可",
    voc: "VOCs 管控",
    thermal: "火电排放",
    ambient: "环境空气",
    steel: "钢铁超低排放",
    ozone: "臭氧协同控制",
    cems: "在线监测",
    incineration: "焚烧烟气"
  };

  const state = {
    page: "dashboard",
    selectedId: null,
    search: "",
    activeTypes: new Set(data.types.map((type) => type.id)),
    relation: "all",
    routeIds: new Set(),
    focusDepth: 0,
    showLabels: false,
    paused: false,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    draggingNode: null,
    panning: false,
    lastPointer: null,
    nodes: [],
    links: [],
    lastPathIds: []
  };

  const svg = document.getElementById("graphSvg");
  const detail = document.getElementById("detailContent");
  const statusText = document.getElementById("statusText");
  const searchInput = document.getElementById("searchInput");
  const zoomRange = document.getElementById("zoomRange");
  const labelToggle = document.getElementById("labelToggle");
  const physicsButton = document.getElementById("togglePhysics");
  const relationFilter = document.getElementById("relationFilter");

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

  function typeLabel(typeId) {
    return typeMap.get(typeId)?.label || typeId;
  }

  function nodeRadius(node) {
    if (node.type === "topic") return 27;
    if (node.type === "law") return 21;
    if (node.type === "standard") return 16;
    if (node.type === "regulation" || node.type === "policy") return 15;
    if (node.type === "agency") return 13;
    return 10 + Math.min(5, Math.sqrt(degree.get(node.id) || 1));
  }

  function init() {
    setupNavigation();
    setupGraphControls();
    setupDataPages();
    renderMetrics();
    renderDashboard();
    renderDocs();
    renderPollutants();
    renderIndustries();
    renderPathSelectors();
    renderQuality();
    const initialPage = location.hash.replace("#", "");
    if (initialPage && document.getElementById(`page-${initialPage}`)) {
      showPage(initialPage);
    } else if (initialPage) {
      showPage("dashboard");
    }
    refreshGraph();
    requestAnimationFrame(tick);
  }

  function setupNavigation() {
    document.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => showPage(button.dataset.page));
    });
    document.querySelectorAll("[data-jump-page]").forEach((button) => {
      button.addEventListener("click", () => showPage(button.dataset.jumpPage));
    });
  }

  function showPage(page) {
    state.page = page;
    if (location.hash !== `#${page}`) {
      history.replaceState(null, "", `#${page}`);
    }
    document.querySelectorAll(".page-nav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === page);
    });
    document.querySelectorAll(".page").forEach((section) => {
      section.classList.toggle("active", section.id === `page-${page}`);
    });
    if (page === "graph") {
      setTimeout(() => {
        refreshGraph();
        fitGraph(false);
      }, 30);
    }
  }

  function setupGraphControls() {
    renderFilters();
    renderLegend();
    renderRouteButtons();
    relationFilter.innerHTML = `<option value="all">全部关系</option>${relationNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;

    searchInput.addEventListener("input", () => {
      state.search = searchInput.value.trim().toLowerCase();
      state.routeIds.clear();
      refreshGraph();
    });
    relationFilter.addEventListener("change", () => {
      state.relation = relationFilter.value;
      refreshGraph();
    });
    document.getElementById("fitGraph").addEventListener("click", () => fitGraph(true));
    physicsButton.addEventListener("click", () => {
      state.paused = !state.paused;
      physicsButton.querySelector(".icon").textContent = state.paused ? "▶" : "Ⅱ";
    });
    document.getElementById("exportData").addEventListener("click", exportData);
    document.getElementById("exportCsv").addEventListener("click", exportCsv);
    zoomRange.addEventListener("input", () => {
      state.scale = Number(zoomRange.value) / 100;
      renderGraph();
    });
    labelToggle.addEventListener("change", () => {
      state.showLabels = labelToggle.checked;
      renderGraph();
    });
    document.querySelectorAll("#depthControl button").forEach((button) => {
      button.addEventListener("click", () => {
        state.focusDepth = Number(button.dataset.depth);
        document.querySelectorAll("#depthControl button").forEach((item) => item.classList.toggle("active", item === button));
        refreshGraph();
      });
    });
    window.addEventListener("resize", () => {
      if (state.page === "graph") {
        refreshGraph();
      }
    });
  }

  function setupDataPages() {
    ["docSearch", "docTypeFilter", "docYearFilter"].forEach((id) => document.getElementById(id).addEventListener("input", renderDocs));
    document.getElementById("pollutantSearch").addEventListener("input", renderPollutants);
    document.getElementById("industrySearch").addEventListener("input", renderIndustries);
    document.getElementById("runPathQuery").addEventListener("click", runPathQuery);
    document.getElementById("showPathInGraph").addEventListener("click", () => {
      if (!state.lastPathIds.length) return;
      state.routeIds = new Set(state.lastPathIds);
      state.selectedId = state.lastPathIds[0];
      showPage("graph");
      refreshGraph();
      renderDetail();
    });
  }

  function renderMetrics() {
    setText("metricNodes", data.nodes.length);
    setText("metricLinks", data.links.length);
    setText("metricDocs", data.nodes.filter((node) => ["law", "regulation", "standard", "policy"].includes(node.type)).length);
    setText("metricPollutants", data.nodes.filter((node) => node.type === "pollutant").length);
    setText("metricIndustries", data.nodes.filter((node) => node.type === "industry").length);
    setText("metricMethods", data.nodes.filter((node) => node.type === "method").length);
  }

  function renderDashboard() {
    const counts = groupCount(data.nodes, "type");
    const maxType = Math.max(...counts.map((item) => item.count));
    document.getElementById("typeChart").innerHTML = counts
      .map(({ key, count }) => barRow(typeLabel(key), count, maxType, typeColor(key)))
      .join("");

    const top = [...degree.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => {
        const node = nodeById.get(id);
        return `<div class="rank-item" data-open-node="${node.id}"><strong>${escapeHtml(node.label)}</strong>${typeLabel(node.type)} · ${count} 条关联</div>`;
      })
      .join("");
    document.getElementById("topEntities").innerHTML = top;

    const relCounts = groupCount(data.links, "relation").slice(0, 14);
    document.getElementById("relationChart").innerHTML = relCounts
      .map(({ key, count }) => `<div class="relation-item"><strong>${escapeHtml(key)}</strong>${count} 条关系</div>`)
      .join("");

    document.getElementById("routeCards").innerHTML = Object.entries(data.routes)
      .map(([key, ids]) => {
        const labels = ids.map((id) => nodeById.get(id)?.label).filter(Boolean).slice(0, 5);
        return `
          <article class="route-card">
            <h3>${routeNames[key] || key}</h3>
            <p>${labels.map(escapeHtml).join(" → ")}</p>
            <div class="tag-row">
              <span class="tag">${ids.length} 个实体</span>
              <button class="table-action" data-route-card="${key}">查看链路</button>
            </div>
          </article>
        `;
      })
      .join("");

    bindOpenNodeActions();
    document.querySelectorAll("[data-route-card]").forEach((button) => {
      button.addEventListener("click", () => {
        setRoute(button.dataset.routeCard);
        showPage("graph");
      });
    });
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
        <span>${escapeHtml(type.label)}</span>
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
    document.getElementById("legend").innerHTML = data.types
      .map((type) => `<div class="legend-row"><span class="legend-dot" style="background:${type.color}"></span><span>${escapeHtml(type.label)}</span></div>`)
      .join("");
  }

  function renderRouteButtons() {
    document.getElementById("routeButtons").innerHTML = Object.keys(data.routes)
      .map((key) => `<button data-route="${key}">${routeNames[key] || key}</button>`)
      .join("");
    document.querySelectorAll("[data-route]").forEach((button) => {
      button.addEventListener("click", () => setRoute(button.dataset.route));
    });
  }

  function setRoute(routeKey) {
    state.search = "";
    searchInput.value = "";
    state.routeIds = new Set(data.routes[routeKey] || []);
    state.selectedId = [...state.routeIds][0] || null;
    document.querySelectorAll("[data-route]").forEach((button) => button.classList.toggle("active", button.dataset.route === routeKey));
    refreshGraph();
    renderDetail();
  }

  function getVisibleData() {
    let allowedIds = new Set(data.nodes.filter((node) => state.activeTypes.has(node.type)).map((node) => node.id));

    if (state.routeIds.size) {
      allowedIds = intersectSets(allowedIds, state.routeIds);
    } else if (state.search) {
      const matched = new Set();
      data.nodes.forEach((node) => {
        if (!allowedIds.has(node.id)) return;
        const text = [node.label, node.code, node.summary, node.year, node.issuer, typeLabel(node.type)].filter(Boolean).join(" ").toLowerCase();
        if (text.includes(state.search)) {
          matched.add(node.id);
          adjacency.get(node.id).forEach((item) => matched.add(item.id));
        }
      });
      allowedIds = intersectSets(allowedIds, matched);
    } else if (state.selectedId && state.focusDepth > 0) {
      allowedIds = intersectSets(allowedIds, bfsIds(state.selectedId, state.focusDepth));
    }

    let visibleLinks = data.links.filter((link) => allowedIds.has(link.source) && allowedIds.has(link.target));
    if (state.relation !== "all") {
      visibleLinks = visibleLinks.filter((link) => link.relation === state.relation);
      const incident = new Set();
      visibleLinks.forEach((link) => {
        incident.add(link.source);
        incident.add(link.target);
      });
      allowedIds = intersectSets(allowedIds, incident);
    }

    const visibleNodes = data.nodes.filter((node) => allowedIds.has(node.id));
    const byId = new Map(visibleNodes.map((node) => [node.id, node]));
    visibleLinks = visibleLinks
      .map((link) => ({ ...link, sourceNode: byId.get(link.source), targetNode: byId.get(link.target) }))
      .filter((link) => link.sourceNode && link.targetNode);
    return { visibleNodes, visibleLinks };
  }

  function refreshGraph() {
    const { visibleNodes, visibleLinks } = getVisibleData();
    const bounds = svg.getBoundingClientRect();
    const width = bounds.width || 960;
    const height = (bounds.height || 660) - 10;
    const oldPositions = new Map(state.nodes.map((node) => [node.id, node]));

    state.nodes = visibleNodes.map((node, index) => {
      const old = oldPositions.get(node.id);
      const anchor = anchorFor(node.type, width, height);
      const angle = (index / Math.max(visibleNodes.length, 1)) * Math.PI * 2;
      const ring = 64 + (index % 7) * 18;
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
    state.links = visibleLinks
      .map((link) => ({ ...link, sourceNode: visibleById.get(link.source), targetNode: visibleById.get(link.target) }))
      .filter((link) => link.sourceNode && link.targetNode);

    buildSvg();
    updateStatus();
    renderDetail();
    renderSearchResults();
    renderGraph();
  }

  function buildSvg() {
    linkLayer.innerHTML = "";
    labelLayer.innerHTML = "";
    nodeLayer.innerHTML = "";

    state.links.forEach((link, index) => {
      linkLayer.append(createSvgElement("line", { class: "link", "data-index": index }));
      const label = createSvgElement("text", { class: "link-label", "data-index": index });
      label.textContent = link.relation;
      labelLayer.append(label);
    });

    state.nodes.forEach((node) => {
      const group = createSvgElement("g", { class: "node", "data-id": node.id });
      const circle = createSvgElement("circle", { r: node.radius, fill: typeColor(node.type) });
      const label = createSvgElement("text", { "text-anchor": "middle", dy: node.radius + 15 });
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

  function updateStatus() {
    const pieces = [];
    if (state.routeIds.size) pieces.push(`重点链路 ${state.nodes.length} 个实体`);
    else if (state.search) pieces.push(`检索结果 ${state.nodes.length} 个实体`);
    else if (state.selectedId && state.focusDepth > 0) pieces.push(`${state.focusDepth} 跳邻域 ${state.nodes.length} 个实体`);
    else pieces.push(`当前图谱 ${state.nodes.length} 个实体、${state.links.length} 条关系`);
    if (state.relation !== "all") pieces.push(`关系：${state.relation}`);
    statusText.textContent = pieces.join(" · ");
  }

  function renderSearchResults() {
    const host = document.getElementById("searchResults");
    const source = state.search ? state.nodes : [...state.nodes].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0)).slice(0, 18);
    host.innerHTML = source.slice(0, 28).map((node) => `
      <div class="mini-item" data-open-node="${node.id}">
        <strong>${escapeHtml(node.label)}</strong><br>
        <span>${typeLabel(node.type)} · ${degree.get(node.id) || 0} 条关联</span>
      </div>
    `).join("") || `<div class="mini-item">暂无结果</div>`;
    bindOpenNodeActions();
  }

  function selectNode(id) {
    state.selectedId = id;
    state.routeIds.clear();
    document.querySelectorAll("[data-route]").forEach((button) => button.classList.remove("active"));
    renderDetail();
    renderGraph();
  }

  function renderDetail() {
    const node = state.selectedId ? nodeById.get(state.selectedId) : null;
    if (!node || !state.nodes.some((item) => item.id === node.id)) {
      detail.innerHTML = `<p class="empty-title">未选中实体</p><p class="empty-copy">从左侧检索或在图中选择节点。</p>`;
      return;
    }
    const relations = adjacency.get(node.id)
      .map((item) => ({ ...item, node: nodeById.get(item.id) }))
      .filter((item) => item.node)
      .sort((a, b) => a.relation.localeCompare(b.relation, "zh-CN"));
    const relationHtml = relations.slice(0, 28).map((item) => {
      const arrow = item.direction === "out" ? "→" : "←";
      return `<div class="relation-item"><strong>${escapeHtml(node.label)}</strong> ${arrow} ${escapeHtml(item.relation)} ${arrow} <span data-open-node="${item.node.id}">${escapeHtml(item.node.label)}</span></div>`;
    }).join("");
    const sourceHtml = node.sourceUrl
      ? `<a class="source-link" href="${node.sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(node.sourceUrl)}</a>`
      : "课程整理数据";
    detail.innerHTML = `
      <div><h2 class="detail-title">${escapeHtml(node.label)}</h2></div>
      <div class="badge-row">
        <span class="badge" style="background:${typeColor(node.type)}">${typeLabel(node.type)}</span>
        ${node.code ? `<span class="badge" style="background:#334155">${escapeHtml(node.code)}</span>` : ""}
        <span class="badge" style="background:#5d6b76">${degree.get(node.id) || 0} 条关联</span>
      </div>
      <p class="summary">${escapeHtml(node.summary || "暂无摘要。")}</p>
      <div class="detail-section">
        <h3>属性</h3>
        <div class="kv">
          <span>年份</span><span>${escapeHtml(node.year || "未标注")}</span>
          <span>发布方</span><span>${escapeHtml(node.issuer || "未标注")}</span>
          <span>来源</span><span>${sourceHtml}</span>
        </div>
      </div>
      <div class="detail-section">
        <h3>关联关系</h3>
        <div class="link-list">${relationHtml || '<div class="relation-item">暂无关联</div>'}</div>
      </div>
    `;
    bindOpenNodeActions();
  }

  function renderGraph() {
    graphRoot.setAttribute("transform", `translate(${state.offsetX},${state.offsetY}) scale(${state.scale})`);
    const activeNeighborIds = getActiveNeighborIds();
    const labelsAllowed = state.showLabels || state.nodes.length <= 90 || state.routeIds.size > 0 || state.focusDepth > 0;

    state.links.forEach((link, index) => {
      const line = linkLayer.querySelector(`[data-index="${index}"]`);
      const label = labelLayer.querySelector(`[data-index="${index}"]`);
      if (!line || !label) return;
      const isActive = state.selectedId && (link.source === state.selectedId || link.target === state.selectedId);
      const isRoute = state.routeIds.has(link.source) && state.routeIds.has(link.target);
      line.setAttribute("x1", link.sourceNode.x);
      line.setAttribute("y1", link.sourceNode.y);
      line.setAttribute("x2", link.targetNode.x);
      line.setAttribute("y2", link.targetNode.y);
      line.setAttribute("class", classNames("link", isActive && "active", isRoute && "route", activeNeighborIds && !isActive && !isRoute && "dimmed"));
      label.setAttribute("x", (link.sourceNode.x + link.targetNode.x) / 2);
      label.setAttribute("y", (link.sourceNode.y + link.targetNode.y) / 2 - 5);
      label.setAttribute("style", `display:${labelsAllowed && (isActive || isRoute || state.nodes.length <= 90) ? "block" : "none"}`);
      label.setAttribute("class", classNames("link-label", activeNeighborIds && !isActive && !isRoute && "dimmed"));
    });

    state.nodes.forEach((node) => {
      const group = nodeLayer.querySelector(`[data-id="${CSS.escape(node.id)}"]`);
      if (!group) return;
      const isActive = node.id === state.selectedId;
      const isRoute = state.routeIds.has(node.id);
      const isDimmed = activeNeighborIds && !activeNeighborIds.has(node.id) && !isActive && !isRoute;
      const text = group.querySelector("text");
      text.style.display = labelsAllowed || isActive || isRoute || ["topic", "law"].includes(node.type) ? "block" : "none";
      group.setAttribute("transform", `translate(${node.x},${node.y})`);
      group.setAttribute("class", classNames("node", isActive && "active", isRoute && "route", isDimmed && "dimmed"));
    });
  }

  function tick() {
    if (!state.paused && state.page === "graph") simulate();
    if (state.page === "graph") renderGraph();
    requestAnimationFrame(tick);
  }

  function simulate() {
    const bounds = svg.getBoundingClientRect();
    const width = bounds.width || 960;
    const height = bounds.height || 660;
    const alpha = 0.02;

    state.links.forEach((link) => {
      const source = link.sourceNode;
      const target = link.targetNode;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = source.type === "topic" || target.type === "topic" ? 170 : 118;
      const force = (distance - desired) * 0.0035;
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
        const minDistance = a.radius + b.radius + (state.nodes.length > 180 ? 38 : 54);
        const strength = distance < minDistance ? (minDistance - distance) * 0.014 : 150 / (distance * distance);
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
      node.vx += (anchor.x - node.x) * alpha * (node.type === "topic" ? 0.22 : 0.07);
      node.vy += (anchor.y - node.y) * alpha * (node.type === "topic" ? 0.22 : 0.07);
      node.vx *= 0.88;
      node.vy *= 0.88;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(32, Math.min(width - 32, node.x));
      node.y = Math.max(32, Math.min(height - 40, node.y));
    });
  }

  function anchorFor(type, width, height) {
    const anchors = {
      topic: [0.5, 0.5],
      law: [0.72, 0.28],
      regulation: [0.82, 0.45],
      policy: [0.68, 0.16],
      standard: [0.56, 0.66],
      pollutant: [0.32, 0.66],
      industry: [0.22, 0.37],
      measure: [0.47, 0.27],
      limit: [0.74, 0.72],
      agency: [0.9, 0.34],
      method: [0.46, 0.82],
      process: [0.18, 0.76],
      region: [0.9, 0.82]
    };
    const [x, y] = anchors[type] || [0.5, 0.5];
    return { x: Math.max(width, 760) * x, y: Math.max(height, 560) * y };
  }

  function startNodeDrag(event, id) {
    event.preventDefault();
    event.stopPropagation();
    const node = state.nodes.find((item) => item.id === id);
    if (!node) return;
    state.draggingNode = node;
    state.paused = false;
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
      renderGraph();
      return;
    }
    if (state.panning && state.lastPointer) {
      state.offsetX += event.clientX - state.lastPointer.x;
      state.offsetY += event.clientY - state.lastPointer.y;
      state.lastPointer = { x: event.clientX, y: event.clientY };
      renderGraph();
    }
  });

  svg.addEventListener("pointerup", (event) => {
    state.draggingNode = null;
    state.panning = false;
    state.lastPointer = null;
    try {
      svg.releasePointerCapture(event.pointerId);
    } catch (_) {}
  });

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const next = Math.max(0.45, Math.min(1.8, state.scale + (event.deltaY > 0 ? -0.06 : 0.06)));
    state.scale = next;
    zoomRange.value = Math.round(next * 100);
    renderGraph();
  }, { passive: false });

  svg.addEventListener("click", () => {
    if (!state.panning) {
      state.selectedId = null;
      renderDetail();
      renderGraph();
    }
  });

  function toGraphPoint(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - state.offsetX) / state.scale,
      y: (clientY - rect.top - state.offsetY) / state.scale
    };
  }

  function fitGraph(resetNodes) {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    zoomRange.value = 100;
    if (resetNodes) {
      const bounds = svg.getBoundingClientRect();
      const width = bounds.width || 960;
      const height = bounds.height || 660;
      state.nodes.forEach((node, index) => {
        const anchor = anchorFor(node.type, width, height);
        const angle = (index / Math.max(state.nodes.length, 1)) * Math.PI * 2;
        const ring = 60 + (index % 8) * 16;
        node.x = anchor.x + Math.cos(angle) * ring;
        node.y = anchor.y + Math.sin(angle) * ring;
        node.vx = 0;
        node.vy = 0;
      });
    }
    renderGraph();
  }

  function renderDocs() {
    const docTypes = ["all", "law", "regulation", "policy", "standard"];
    const docTypeFilter = document.getElementById("docTypeFilter");
    if (!docTypeFilter.dataset.ready) {
      docTypeFilter.innerHTML = docTypes.map((type) => `<option value="${type}">${type === "all" ? "全部文件" : typeLabel(type)}</option>`).join("");
      docTypeFilter.dataset.ready = "1";
      const years = ["all", ...new Set(data.nodes.filter(isDocument).map((node) => String(node.year || "").slice(0, 4)).filter(Boolean))].sort().reverse();
      document.getElementById("docYearFilter").innerHTML = years.map((year) => `<option value="${year}">${year === "all" ? "全部年份" : year}</option>`).join("");
    }
    const query = document.getElementById("docSearch").value.trim().toLowerCase();
    const type = docTypeFilter.value;
    const year = document.getElementById("docYearFilter").value;
    const docs = data.nodes.filter((node) => {
      if (!isDocument(node)) return false;
      if (type !== "all" && node.type !== type) return false;
      if (year !== "all" && !String(node.year || "").startsWith(year)) return false;
      if (!query) return true;
      return [node.label, node.code, node.summary, node.issuer].filter(Boolean).join(" ").toLowerCase().includes(query);
    }).sort((a, b) => String(b.year || "").localeCompare(String(a.year || "")));
    document.getElementById("docCountText").textContent = `${docs.length} 条记录`;
    document.getElementById("documentsTable").innerHTML = docs.map((node) => `
      <tr>
        <td><strong>${escapeHtml(node.label)}</strong></td>
        <td><span class="tag">${typeLabel(node.type)}</span></td>
        <td>${escapeHtml(node.code || node.year || "未标注")}</td>
        <td>${escapeHtml(node.issuer || "未标注")}</td>
        <td>${relationSummary(node)}</td>
        <td><button class="table-action" data-open-node="${node.id}">查看图谱</button></td>
      </tr>
    `).join("");
    bindOpenNodeActions();
  }

  function renderPollutants() {
    const query = document.getElementById("pollutantSearch").value.trim().toLowerCase();
    const pollutants = data.nodes.filter((node) => node.type === "pollutant" && (!query || [node.label, node.summary].join(" ").toLowerCase().includes(query)));
    document.getElementById("pollutantStats").innerHTML = [
      ["污染物总数", data.nodes.filter((node) => node.type === "pollutant").length],
      ["当前显示", pollutants.length],
      ["关联标准数", countRelatedTypes(pollutants, "standard")]
    ].map(([label, count]) => `<div class="stat-item"><strong>${count}</strong>${label}</div>`).join("");
    document.getElementById("pollutantCards").innerHTML = pollutants.map((node) => entityCard(node, ["standard", "industry", "measure"])).join("");
    bindOpenNodeActions();
  }

  function renderIndustries() {
    const query = document.getElementById("industrySearch").value.trim().toLowerCase();
    const industries = data.nodes.filter((node) => node.type === "industry" && (!query || [node.label, node.summary].join(" ").toLowerCase().includes(query)));
    document.getElementById("industryStats").innerHTML = [
      ["行业总数", data.nodes.filter((node) => node.type === "industry").length],
      ["当前显示", industries.length],
      ["关联标准数", countRelatedTypes(industries, "standard")]
    ].map(([label, count]) => `<div class="stat-item"><strong>${count}</strong>${label}</div>`).join("");
    document.getElementById("industryCards").innerHTML = industries.map((node) => entityCard(node, ["standard", "pollutant", "measure"])).join("");
    bindOpenNodeActions();
  }

  function entityCard(node, relatedTypes) {
    const related = adjacency.get(node.id)
      .map((item) => nodeById.get(item.id))
      .filter((item) => item && relatedTypes.includes(item.type))
      .slice(0, 8);
    return `
      <article class="entity-card">
        <h3>${escapeHtml(node.label)}</h3>
        <p>${escapeHtml(node.summary || "暂无摘要。")}</p>
        <div class="tag-row">
          <span class="tag">${degree.get(node.id) || 0} 条关联</span>
          ${related.slice(0, 4).map((item) => `<span class="tag">${escapeHtml(item.label)}</span>`).join("")}
        </div>
        <div class="tag-row" style="margin-top:10px"><button class="table-action" data-open-node="${node.id}">查看图谱</button></div>
      </article>
    `;
  }

  function renderPathSelectors() {
    const options = data.nodes
      .slice()
      .sort((a, b) => `${typeLabel(a.type)}${a.label}`.localeCompare(`${typeLabel(b.type)}${b.label}`, "zh-CN"))
      .map((node) => `<option value="${node.id}">${typeLabel(node.type)} · ${escapeHtml(node.label)}</option>`)
      .join("");
    document.getElementById("pathStart").innerHTML = options;
    document.getElementById("pathEnd").innerHTML = options;
    document.getElementById("pathStart").value = "law-air";
    document.getElementById("pathEnd").value = "pollutant-vocs";
    runPathQuery();
  }

  function runPathQuery() {
    const start = document.getElementById("pathStart").value;
    const end = document.getElementById("pathEnd").value;
    const path = shortestPath(start, end);
    state.lastPathIds = path.map((item) => item.id);
    if (!path.length) {
      document.getElementById("pathResult").innerHTML = `<div class="quality-item"><strong>未找到路径</strong>请更换起点或终点。</div>`;
      return;
    }
    const steps = [];
    path.forEach((item, index) => {
      const node = nodeById.get(item.id);
      steps.push(`<span class="path-node" style="background:${typeColor(node.type)}">${escapeHtml(node.label)}</span>`);
      if (index < path.length - 1) {
        steps.push(`<span class="path-rel">${escapeHtml(path[index + 1].via || "关联")}</span>`);
      }
    });
    document.getElementById("pathResult").innerHTML = `
      <div class="quality-item"><strong>最短路径长度：${path.length - 1} 跳</strong>起点与终点通过以下知识链条连接。</div>
      <div class="path-line">${steps.join("")}</div>
    `;
  }

  function renderQuality() {
    const withSource = data.nodes.filter((node) => node.sourceUrl).length;
    const docs = data.nodes.filter(isDocument);
    document.getElementById("sourceQuality").innerHTML = [
      ["带来源链接实体", withSource],
      ["文档类实体", docs.length],
      ["无关联实体", data.nodes.filter((node) => (degree.get(node.id) || 0) === 0).length],
      ["平均度数", (data.links.length * 2 / data.nodes.length).toFixed(2)]
    ].map(([label, value]) => `<div class="quality-item"><strong>${value}</strong>${label}</div>`).join("");

    const yearCounts = {};
    docs.forEach((node) => {
      const year = String(node.year || "未知").match(/\d{4}/)?.[0] || "未知";
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });
    const yearItems = Object.entries(yearCounts).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14).map(([key, count]) => ({ key, count }));
    const max = Math.max(...yearItems.map((item) => item.count), 1);
    document.getElementById("yearChart").innerHTML = yearItems.map((item) => barRow(item.key, item.count, max, "#1d6f63")).join("");

    const noSourceDocs = docs.filter((node) => !node.sourceUrl).slice(0, 10);
    document.getElementById("maintenanceList").innerHTML = `
      <table class="data-table">
        <thead><tr><th>维护项</th><th>对象</th><th>建议动作</th></tr></thead>
        <tbody>
          ${noSourceDocs.map((node) => `<tr><td>来源补全</td><td>${escapeHtml(node.label)}</td><td>补充准确发布页面或标准公开系统链接</td></tr>`).join("")}
          <tr><td>数据扩展</td><td>地方标准</td><td>可继续加入北京、上海、广东等地方固定源/VOCs 标准</td></tr>
          <tr><td>条文粒度</td><td>排放限值</td><td>可把浓度、速率、厂界监控点限值进一步结构化</td></tr>
        </tbody>
      </table>
    `;
  }

  function shortestPath(start, end) {
    if (start === end) return [{ id: start }];
    const queue = [[{ id: start }]];
    const seen = new Set([start]);
    while (queue.length) {
      const path = queue.shift();
      const current = path[path.length - 1].id;
      for (const edge of adjacency.get(current)) {
        if (seen.has(edge.id)) continue;
        const nextPath = [...path, { id: edge.id, via: edge.relation }];
        if (edge.id === end) return nextPath;
        seen.add(edge.id);
        if (nextPath.length <= 7) queue.push(nextPath);
      }
    }
    return [];
  }

  function bindOpenNodeActions() {
    document.querySelectorAll("[data-open-node]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        openNode(element.dataset.openNode);
      });
    });
  }

  function openNode(id) {
    state.selectedId = id;
    state.routeIds.clear();
    state.focusDepth = 1;
    document.querySelectorAll("#depthControl button").forEach((button) => button.classList.toggle("active", button.dataset.depth === "1"));
    showPage("graph");
    refreshGraph();
    renderDetail();
  }

  function exportData() {
    downloadBlob("air-pollution-kg-expanded.json", JSON.stringify(data, null, 2), "application/json;charset=utf-8");
  }

  function exportCsv() {
    const nodeRows = ["id,label,type,year,issuer,degree"].concat(data.nodes.map((node) => [
      node.id, node.label, typeLabel(node.type), node.year || "", node.issuer || "", degree.get(node.id) || 0
    ].map(csvCell).join(",")));
    const linkRows = ["source,relation,target"].concat(data.links.map((link) => [link.source, link.relation, link.target].map(csvCell).join(",")));
    downloadBlob("air-pollution-kg-nodes.csv", `\ufeff${nodeRows.join("\n")}\n\n${linkRows.join("\n")}`, "text/csv;charset=utf-8");
  }

  function downloadBlob(name, content, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function relationSummary(node) {
    const counts = {};
    adjacency.get(node.id).forEach((item) => {
      const target = nodeById.get(item.id);
      if (target) counts[target.type] = (counts[target.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => `${typeLabel(type)} ${count}`).join("；") || "暂无关联";
  }

  function countRelatedTypes(nodes, type) {
    const ids = new Set();
    nodes.forEach((node) => adjacency.get(node.id).forEach((item) => {
      if (nodeById.get(item.id)?.type === type) ids.add(item.id);
    }));
    return ids.size;
  }

  function isDocument(node) {
    return ["law", "regulation", "policy", "standard"].includes(node.type);
  }

  function groupCount(items, key) {
    const counts = new Map();
    items.forEach((item) => {
      const value = item[key] || "未知";
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  }

  function barRow(label, count, max, color) {
    const width = Math.max(5, Math.round((count / max) * 100));
    return `
      <div class="bar-row">
        <span>${escapeHtml(label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${width}%;background:${color}"></span></span>
        <strong>${count}</strong>
      </div>
    `;
  }

  function getActiveNeighborIds() {
    if (!state.selectedId) return null;
    const ids = new Set([state.selectedId]);
    adjacency.get(state.selectedId).forEach((item) => ids.add(item.id));
    return ids;
  }

  function bfsIds(start, depth) {
    const result = new Set([start]);
    let frontier = new Set([start]);
    for (let i = 0; i < depth; i += 1) {
      const next = new Set();
      frontier.forEach((id) => {
        adjacency.get(id).forEach((item) => {
          if (!result.has(item.id)) next.add(item.id);
          result.add(item.id);
        });
      });
      frontier = next;
    }
    return result;
  }

  function intersectSets(a, b) {
    const result = new Set();
    a.forEach((item) => {
      if (b.has(item)) result.add(item);
    });
    return result;
  }

  function shortenLabel(label) {
    if (label.length <= 13) return label;
    return `${label.slice(0, 12)}…`;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function classNames(...names) {
    return names.filter(Boolean).join(" ");
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  init();
})();
