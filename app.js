const state = {
  query: "",
  type: "全部",
  scenario: "全部",
  region: "全部"
};

const data = window.AI_MARKETPLACE || {
  tools: [],
  basics: [],
  skills: [],
  claws: [],
  spotlights: [],
  modelGuides: [],
  dailyUpdates: [],
  lastUpdated: ""
};

const elements = {
  metrics: document.querySelector("#metrics"),
  basicsGrid: document.querySelector("#basicsGrid"),
  recommendationGrid: document.querySelector("#recommendationGrid"),
  toolGrid: document.querySelector("#toolGrid"),
  dailyUpdates: document.querySelector("#dailyUpdates"),
  skillGrid: document.querySelector("#skillGrid"),
  clawGrid: document.querySelector("#clawGrid"),
  spotlightGrid: document.querySelector("#spotlightGrid"),
  modelGuideGrid: document.querySelector("#modelGuideGrid"),
  searchInput: document.querySelector("#searchInput"),
  typeFilters: document.querySelector("#typeFilters"),
  scenarioFilters: document.querySelector("#scenarioFilters"),
  regionFilters: document.querySelector("#regionFilters"),
  resultSummary: document.querySelector("#resultSummary"),
  lastUpdated: document.querySelector("#lastUpdated"),
  template: document.querySelector("#toolCardTemplate")
};

function uniqueValues(key) {
  return ["全部"].concat(
    [...new Set(data.tools.flatMap((tool) => tool[key]))].sort((a, b) => a.localeCompare(b, "zh-CN"))
  );
}

function createChip(label, groupKey) {
  const button = document.createElement("button");
  button.className = "chip";
  button.type = "button";
  button.textContent = label;
  button.dataset.group = groupKey;
  button.dataset.value = label;
  button.addEventListener("click", () => {
    state[groupKey] = label;
    render();
  });
  return button;
}

function renderFilters() {
  const filterTargets = [
    { key: "type", target: elements.typeFilters, source: uniqueValues("types") },
    { key: "scenario", target: elements.scenarioFilters, source: uniqueValues("scenarios") },
    { key: "region", target: elements.regionFilters, source: uniqueValues("regions") }
  ];

  filterTargets.forEach(({ key, target, source }) => {
    target.innerHTML = "";
    source.forEach((item) => target.appendChild(createChip(item, key)));
  });
}

function createMetaPills(values, className) {
  return values.map((value) => `<span class="meta-pill ${className}">${value}</span>`).join("");
}

function createSoftTags(values) {
  return values.map((value) => `<span class="tag-soft">${value}</span>`).join("");
}

function createToolCard(tool) {
  const fragment = elements.template.content.cloneNode(true);
  const card = fragment.querySelector(".tool-card");
  card.querySelector("h3").textContent = tool.name;
  card.querySelector(".score-pill").textContent = `推荐值 ${tool.score}`;
  card.querySelector(".tool-card__tagline").textContent = tool.tagline;
  card.querySelector(".tool-card__description").textContent = tool.description;
  card.querySelector(".meta-row--types").innerHTML = createMetaPills(tool.types, "meta-pill--type");
  card.querySelector(".meta-row--scenarios").innerHTML = createMetaPills(
    tool.scenarios,
    "meta-pill--scenario"
  );
  card.querySelector(".fact-pill--region").textContent = tool.regions.join(" / ");
  card.querySelector(".fact-pill--pricing").textContent = tool.pricing;
  card.querySelector(".fact-pill--stability").textContent = `稳定性：${tool.stability}`;
  card.querySelector(".fact-pill--latency").textContent = `响应：${tool.latency}`;
  card.querySelector(".tool-card__strengths").innerHTML = createSoftTags(tool.strengths.slice(0, 3));
  card.querySelector(".source-badge").textContent = tool.source;
  card.querySelector(".update-badge").textContent = tool.updatedAt;

  const link = card.querySelector(".visit-link");
  link.href = tool.url;
  link.setAttribute("aria-label", `访问 ${tool.name}`);

  return fragment;
}

function filterTools() {
  const query = state.query.trim().toLowerCase();

  return data.tools.filter((tool) => {
    const matchesQuery =
      query === "" ||
      [
        tool.name,
        tool.tagline,
        tool.description,
        tool.pricing,
        tool.source,
        ...tool.types,
        ...tool.scenarios,
        ...tool.regions,
        ...tool.strengths,
        ...tool.weaknesses
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesType = state.type === "全部" || tool.types.includes(state.type);
    const matchesScenario = state.scenario === "全部" || tool.scenarios.includes(state.scenario);
    const matchesRegion = state.region === "全部" || tool.regions.includes(state.region);

    return matchesQuery && matchesType && matchesScenario && matchesRegion;
  });
}

function renderRecommendations() {
  const topTools = [...data.tools]
    .filter((tool) => tool.featured)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  elements.recommendationGrid.innerHTML = "";
  topTools.forEach((tool) => elements.recommendationGrid.appendChild(createToolCard(tool)));
}

function renderDailyUpdates() {
  elements.dailyUpdates.innerHTML = "";
  data.dailyUpdates.forEach((item) => {
    const block = document.createElement("article");
    block.className = "daily-item";
    block.innerHTML = `<strong>${item.title}</strong><p>${item.content}</p>`;
    elements.dailyUpdates.appendChild(block);
  });
}

function renderBasics() {
  elements.basicsGrid.innerHTML = "";
  data.basics.forEach((item) => {
    const card = document.createElement("article");
    card.className = "basic-card";
    card.innerHTML = `
      <strong class="basic-card__title">${item.title}</strong>
      <p>${item.summary}</p>
      <div class="compare-list">
        ${item.points
          .map((point) => `<div class="compare-row"><div><strong>${point.label}</strong><p>${point.text}</p></div></div>`)
          .join("")}
      </div>
    `;
    elements.basicsGrid.appendChild(card);
  });
}

function renderSkills() {
  elements.skillGrid.innerHTML = "";
  data.skills.forEach((skill) => {
    const card = document.createElement("article");
    card.className = "skill-card";
    card.innerHTML = `
      <div>
        <strong class="skill-card__title">${skill.name}</strong>
        <p>${skill.description}</p>
      </div>
      <div class="spotlight-card__stats">
        ${createStatChip("推荐值", skill.recommendScore)}
        ${createStatChip("安装位置", skill.installPath)}
      </div>
      <div class="skill-card__meta">
        <span>${skill.type}</span>
        <span>${skill.forAudience}</span>
        <span>${skill.level}</span>
      </div>
      <p>${skill.intro}</p>
      <p>${skill.example}</p>
    `;
    elements.skillGrid.appendChild(card);
  });
}

function renderClaws() {
  elements.clawGrid.innerHTML = "";
  data.claws.forEach((claw) => {
    const card = document.createElement("article");
    card.className = "guide-card";
    card.innerHTML = `
      <div>
        <h3>${claw.name}</h3>
        <p>${claw.summary}</p>
      </div>
      <div class="guide-card__variants">
        <span class="variant-pill">${claw.kind}</span>
        <span class="variant-pill">${claw.region}</span>
        <span class="variant-pill">推荐值 ${claw.recommendScore}</span>
      </div>
      <div class="compare-list">
        ${createCompareRow("适合谁", claw.bestFor, "先看")}
        ${createCompareRow("主要用途", claw.useCase, "能做")}
        ${createCompareRow("注意点", claw.caution, "提醒")}
      </div>
    `;
    elements.clawGrid.appendChild(card);
  });
}

function createStatChip(label, value) {
  return `<span class="stat-chip"><span class="stat-chip__label">${label}</span><span class="stat-chip__value">${value}</span></span>`;
}

function createCompareRow(title, description, fit) {
  return `
    <div class="compare-row">
      <div>
        <strong>${title}</strong>
        <p>${description}</p>
      </div>
      <span>${fit}</span>
    </div>
  `;
}

function renderSpotlights() {
  elements.spotlightGrid.innerHTML = "";
  data.spotlights.forEach((spotlight) => {
    const card = document.createElement("article");
    card.className = "spotlight-card";
    card.innerHTML = `
      <div>
        <h3>${spotlight.name}</h3>
        <p class="spotlight-card__summary">${spotlight.summary}</p>
      </div>
      <div class="spotlight-card__stats">
        ${createStatChip("效率", spotlight.efficiency)}
        ${createStatChip("价格", spotlight.pricing)}
        ${createStatChip("稳定性", spotlight.stability)}
        ${createStatChip("响应", spotlight.responseTime)}
      </div>
      <div class="compare-list">
        ${createCompareRow("擅长", spotlight.goodAt, "优先用")}
        ${createCompareRow("不擅长", spotlight.notGoodAt, "谨慎用")}
        ${createCompareRow("优点", spotlight.pros, "亮点")}
        ${createCompareRow("缺点", spotlight.cons, "注意")}
      </div>
    `;
    elements.spotlightGrid.appendChild(card);
  });
}

function renderModelGuides() {
  elements.modelGuideGrid.innerHTML = "";
  data.modelGuides.forEach((guide) => {
    const card = document.createElement("article");
    card.className = "guide-card";
    card.innerHTML = `
      <div>
        <h3>${guide.family}</h3>
        <p>${guide.summary}</p>
      </div>
      <div class="guide-card__variants">
        ${guide.variants.map((variant) => `<span class="variant-pill">${variant.name}</span>`).join("")}
      </div>
      <div class="compare-list">
        ${guide.variants
          .map((variant) =>
            createCompareRow(
              variant.name,
              `${variant.positioning}；适合：${variant.bestFor}；避开：${variant.avoidFor}`,
              variant.recommendation
            )
          )
          .join("")}
      </div>
      <div class="guide-card__footer">${guide.pickAdvice}</div>
    `;
    elements.modelGuideGrid.appendChild(card);
  });
}

function renderMetrics() {
  const metrics = [
    { label: "收录工具", value: String(data.tools.length) },
    { label: "覆盖地区", value: String(uniqueValues("regions").length - 1) },
    { label: "Skill 数量", value: String(data.skills.length) },
    { label: "Claw 数量", value: String(data.claws.length) }
  ];

  elements.metrics.innerHTML = metrics
    .map(
      (item) => `<div class="metric-card"><span>${item.label}</span><strong>${item.value}</strong></div>`
    )
    .join("");
}

function renderSummary(filteredTools) {
  elements.resultSummary.textContent = `当前展示 ${filteredTools.length} 个工具，覆盖中国、美国、欧洲和 GitHub 热门开源项目。`;
}

function renderToolGrid(filteredTools) {
  elements.toolGrid.innerHTML = "";

  if (filteredTools.length === 0) {
    elements.toolGrid.innerHTML =
      '<div class="empty-state">没有匹配结果，可以切换地区、场景或缩短关键词后再试。</div>';
    return;
  }

  [...filteredTools]
    .sort((a, b) => b.score - a.score)
    .forEach((tool) => elements.toolGrid.appendChild(createToolCard(tool)));
}

function syncFilterStates() {
  document.querySelectorAll(".chip").forEach((chip) => {
    const group = chip.dataset.group;
    chip.classList.toggle("is-active", chip.dataset.value === state[group]);
  });
}

function render() {
  const filteredTools = filterTools();
  renderMetrics();
  renderBasics();
  renderRecommendations();
  renderDailyUpdates();
  renderSkills();
  renderClaws();
  renderSpotlights();
  renderModelGuides();
  renderSummary(filteredTools);
  renderToolGrid(filteredTools);
  syncFilterStates();
  elements.lastUpdated.textContent = `最后更新：${data.lastUpdated}`;
}

function initEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
}

renderFilters();
initEvents();
render();
