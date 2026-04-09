import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceFile = path.join(root, "data", "source-tools.json");
const outputFile = path.join(root, "data", "tools.js");

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

function buildPayload(raw) {
  const tools = raw.tools.map((tool) => {
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
    dailyUpdates: buildDailyUpdates(raw.tools)
  };
}

async function main() {
  const rawContent = await readFile(sourceFile, "utf8");
  const raw = JSON.parse(rawContent.replace(/^\uFEFF/, ""));
  const payload = buildPayload(raw);
  const scriptContent = `window.AI_MARKETPLACE = ${JSON.stringify(payload, null, 2)};\n`;

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, scriptContent, "utf8");

  console.log(`Generated ${path.relative(root, outputFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
