import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceFile = path.join(root, "data", "source-tools.json");
const generatedFile = path.join(root, "data", "generated", "public-sources.json");
const outputFile = path.join(root, "data", "tools.js");

const GITHUB_API_BASE = "https://api.github.com";
const HUGGING_FACE_API_BASE = "https://huggingface.co";

const githubQueries = [
  {
    label: "GitHub 热门 AI Agent",
    query: "agent ai language:Python stars:>5000 pushed:>2025-01-01",
    scenarios: ["自动化", "编程"],
    types: ["Agent", "开源"]
  },
  {
    label: "GitHub 热门 AI 工作流",
    query: "llm workflow language:Python stars:>3000 pushed:>2025-01-01",
    scenarios: ["自动化", "办公"],
    types: ["工作流", "开源"]
  },
  {
    label: "GitHub 热门本地模型工具",
    query: "local llm language:Python stars:>3000 pushed:>2025-01-01",
    scenarios: ["编程", "自动化"],
    types: ["本地模型", "开源"]
  }
];

async function readJson(filePath, fallback) {
  try {
    const rawContent = await readFile(filePath, "utf8");
    return JSON.parse(rawContent.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function computeScore(signals) {
  const community = signals.community ?? 0;
  const breadth = signals.breadth ?? 0;
  const momentum = signals.momentum ?? 0;
  return Math.round(community * 0.45 + breadth * 0.25 + momentum * 0.3);
}

function buildDailyUpdates(tools) {
  const rising = [...tools].sort((a, b) => b.signals.momentum - a.signals.momentum).slice(0, 3);
  return rising.map((tool, index) => ({
    title: `今日关注 ${index + 1}: ${tool.name}`,
    content: `${tool.name} 在 ${tool.scenarios[0]} 场景热度较高，适合放入首页推荐位或今日上升榜。`
  }));
}

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ai-marketplace-refresh-script",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed: ${response.status} ${response.statusText}\n${text}`);
  }
  return response.json();
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function scoreFromRepository(repo) {
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  const watchers = repo.watchers_count ?? 0;
  const normalized = Math.min(99, Math.round(stars / 1200 + forks / 250 + watchers / 400 + 75));
  return Math.max(82, normalized);
}

function toGeneratedToolFromRepo(repo, metadata) {
  const owner = repo.owner?.login ?? "GitHub";
  const repoName = repo.name ?? "unknown";
  const topics = Array.isArray(repo.topics) ? repo.topics : [];

  return {
    id: `github-${slugify(`${owner}-${repoName}`)}`,
    name: repoName,
    tagline: repo.description || `${metadata.label} 候选项目。`,
    description: `${owner}/${repoName} 来自 GitHub 公开热榜搜索，适合放入“公开平台热度”推荐区。`,
    types: metadata.types,
    scenarios: metadata.scenarios,
    regions: ["GitHub", "全球"],
    pricing: "开源免费",
    stability: "需看项目成熟度",
    latency: "取决于部署方式",
    strengths: topics.slice(0, 3).length > 0 ? topics.slice(0, 3) : ["GitHub 热门", "公开开源", "社区讨论高"],
    weaknesses: ["需要自行判断成熟度", "开源项目通常需要自己部署"],
    score: scoreFromRepository(repo),
    source: `GitHub API · ${owner}/${repoName}`,
    updatedAt: `Stars ${repo.stargazers_count ?? 0} · Forks ${repo.forks_count ?? 0}`,
    featured: (repo.stargazers_count ?? 0) >= 15000,
    url: repo.html_url
  };
}

async function fetchGithubRepositories() {
  const allTools = [];

  for (const metadata of githubQueries) {
    const searchParams = new URLSearchParams({
      q: metadata.query,
      sort: "stars",
      order: "desc",
      per_page: "5"
    });
    const url = `${GITHUB_API_BASE}/search/repositories?${searchParams.toString()}`;
    const payload = await fetchJson(url, { headers: githubHeaders() });
    const items = Array.isArray(payload.items) ? payload.items : [];

    items.forEach((repo) => {
      allTools.push(toGeneratedToolFromRepo(repo, metadata));
    });
  }

  return allTools;
}

async function fetchHuggingFaceUpdates() {
  const searchParams = new URLSearchParams({
    search: "text-generation",
    sort: "downloads",
    direction: "-1",
    limit: "5"
  });
  const url = `${HUGGING_FACE_API_BASE}/api/models?${searchParams.toString()}`;
  const payload = await fetchJson(url);

  return (Array.isArray(payload) ? payload : []).map((model) => ({
    title: `Hugging Face 热门模型: ${model.id}`,
    content: `${model.id} 在 Hugging Face 模型列表中按 downloads 排序靠前，适合加入“模型热度观察”板块。`
  }));
}

function normalizeStaticTools(rawTools) {
  return rawTools.map((tool) => {
    const score = computeScore(tool.signals);
    return {
      id: tool.id,
      name: tool.name,
      tagline: tool.tagline,
      description: tool.description,
      types: tool.types,
      scenarios: tool.scenarios,
      regions: tool.regions,
      pricing: tool.pricing,
      stability: tool.stability,
      latency: tool.latency,
      strengths: tool.strengths,
      weaknesses: tool.weaknesses,
      score,
      source: tool.source,
      updatedAt: tool.updatedAt,
      featured: score >= 90,
      url: tool.url
    };
  });
}

function mergeById(staticTools, generatedTools) {
  const merged = new Map();

  staticTools.forEach((tool) => {
    merged.set(tool.id, tool);
  });

  generatedTools.forEach((tool) => {
    const existing = merged.get(tool.id);
    merged.set(tool.id, existing ? { ...tool, featured: tool.featured || existing.featured } : tool);
  });

  return [...merged.values()];
}

function buildPayload(raw, generated) {
  const staticTools = normalizeStaticTools(raw.tools);
  const generatedTools = generated.tools ?? [];
  const tools = mergeById(staticTools, generatedTools).sort((a, b) => b.score - a.score);
  const dailyUpdates =
    generated.dailyUpdates && generated.dailyUpdates.length > 0
      ? generated.dailyUpdates
      : buildDailyUpdates(raw.tools);

  return {
    siteName: "AI市集",
    lastUpdated: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai"
    }).format(new Date()),
    tools,
    basics: raw.basics,
    skills: raw.skills,
    claws: raw.claws,
    spotlights: raw.spotlights,
    modelGuides: raw.modelGuides,
    dailyUpdates
  };
}

async function main() {
  const raw = await readJson(sourceFile, {});
  const [githubResult, huggingFaceResult] = await Promise.allSettled([
    fetchGithubRepositories(),
    fetchHuggingFaceUpdates()
  ]);

  const githubTools = githubResult.status === "fulfilled" ? githubResult.value : [];
  const huggingFaceUpdates =
    huggingFaceResult.status === "fulfilled" ? huggingFaceResult.value : [];

  if (githubResult.status === "rejected") {
    console.warn(`GitHub refresh skipped: ${githubResult.reason}`);
  }

  if (huggingFaceResult.status === "rejected") {
    console.warn(`Hugging Face refresh skipped: ${huggingFaceResult.reason}`);
  }

  const generatedPayload = {
    refreshedAt: new Date().toISOString(),
    tools: githubTools,
    dailyUpdates: huggingFaceUpdates
  };

  const finalPayload = buildPayload(raw, generatedPayload);

  await mkdir(path.dirname(generatedFile), { recursive: true });
  await writeFile(generatedFile, JSON.stringify(generatedPayload, null, 2), "utf8");
  await writeFile(outputFile, `window.AI_MARKETPLACE = ${JSON.stringify(finalPayload, null, 2)};\n`, "utf8");

  console.log(`Refreshed marketplace with ${githubTools.length} public-source tools`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
