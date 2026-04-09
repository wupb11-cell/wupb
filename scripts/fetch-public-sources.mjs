import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputFile = path.join(root, "data", "generated", "public-sources.json");

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

async function fetchHuggingFaceModels() {
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

async function main() {
  const [githubResult, huggingFaceResult] = await Promise.allSettled([
    fetchGithubRepositories(),
    fetchHuggingFaceModels()
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

  const payload = {
    refreshedAt: new Date().toISOString(),
    tools: githubTools,
    dailyUpdates: huggingFaceUpdates
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(payload, null, 2), "utf8");

  console.log(`Fetched ${githubTools.length} tools into ${path.relative(root, outputFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
