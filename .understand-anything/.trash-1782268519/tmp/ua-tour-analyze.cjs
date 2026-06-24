#!/usr/bin/env node
'use strict';

const fs = require('fs');

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error('Usage: ua-tour-analyze.js <input.json> <output.json>');
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw);
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];
  const layers = Array.isArray(data.layers) ? data.layers : [];

  // Build node lookup (only real graph nodes from input)
  const nodeById = new Map();
  for (const n of nodes) nodeById.set(n.id, n);

  // Node summary index (all node types)
  const nodeSummaryIndex = {};
  for (const n of nodes) {
    nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary || '' };
  }

  // Consider only edges between real input nodes (skip function/class targets etc.)
  const realEdges = edges.filter(
    (e) => nodeById.has(e.source) && nodeById.has(e.target)
  );

  // ---- A & B: Fan-in / Fan-out ----
  const fanIn = new Map();
  const fanOut = new Map();
  for (const n of nodes) {
    fanIn.set(n.id, 0);
    fanOut.set(n.id, 0);
  }
  for (const e of realEdges) {
    fanOut.set(e.source, (fanOut.get(e.source) || 0) + 1);
    fanIn.set(e.target, (fanIn.get(e.target) || 0) + 1);
  }

  const fanInRanking = [...fanIn.entries()]
    .map(([id, c]) => ({ id, fanIn: c, name: nodeById.get(id).name }))
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 20);

  const fanOutRanking = [...fanOut.entries()]
    .map(([id, c]) => ({ id, fanOut: c, name: nodeById.get(id).name }))
    .sort((a, b) => b.fanOut - a.fanOut)
    .slice(0, 20);

  // ---- C: Entry point candidates ----
  const codeEntryNames = new Set([
    'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js',
    'server.ts', 'server.js', 'mod.rs', 'main.go', 'main.py', 'main.rs',
    'manage.py', 'app.py', 'wsgi.py', 'asgi.py', 'run.py', '__main__.py',
    'Application.java', 'Main.java', 'Program.cs', 'config.ru', 'index.php',
    'App.swift', 'Application.kt', 'main.cpp', 'main.c',
    // common front-end roots
    'App.tsx', 'App.jsx', 'main.tsx', 'main.jsx', 'index.tsx', 'index.jsx'
  ]);

  // fan-out top 10% threshold
  const sortedFanOut = [...fanOut.values()].sort((a, b) => b - a);
  const top10Idx = Math.max(0, Math.floor(sortedFanOut.length * 0.1) - 1);
  const fanOutTop10Threshold = sortedFanOut.length ? sortedFanOut[top10Idx] : 0;

  // fan-in bottom 25% threshold
  const sortedFanInAsc = [...fanIn.values()].sort((a, b) => a - b);
  const bottom25Idx = Math.max(0, Math.floor(sortedFanInAsc.length * 0.25) - 1);
  const fanInBottom25Threshold = sortedFanInAsc.length ? sortedFanInAsc[bottom25Idx] : 0;

  const entryScores = [];
  for (const n of nodes) {
    let score = 0;
    const fp = n.filePath || '';
    const depth = fp.split('/').length; // 1 = root

    if (n.type === 'document') {
      if (n.name === 'README.md' && depth === 1) score += 5;
      else if (/\.md$/i.test(n.name) && depth === 1) score += 2;
    } else if (n.type === 'file') {
      if (codeEntryNames.has(n.name)) score += 3;
      if (depth <= 2) score += 1;
      if ((fanOut.get(n.id) || 0) >= fanOutTop10Threshold && fanOutTop10Threshold > 0) score += 1;
      if ((fanIn.get(n.id) || 0) <= fanInBottom25Threshold) score += 1;
    }
    if (score > 0) {
      entryScores.push({ id: n.id, score, name: n.name, summary: n.summary || '' });
    }
  }
  entryScores.sort((a, b) => b.score - a.score);
  const entryPointCandidates = entryScores.slice(0, 5);

  // ---- D: BFS from top CODE entry point ----
  // adjacency for imports + calls (forward), among real nodes
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of realEdges) {
    if (e.type === 'imports' || e.type === 'calls') {
      adj.get(e.source).push(e.target);
    }
  }

  // pick top code entry point (skip documents)
  const codeEntries = entryScores.filter((c) => {
    const t = nodeById.get(c.id);
    return t && t.type === 'file';
  });
  const startNode = codeEntries.length ? codeEntries[0].id : (nodes[0] && nodes[0].id);

  const order = [];
  const depthMap = {};
  if (startNode) {
    const visited = new Set([startNode]);
    const queue = [startNode];
    depthMap[startNode] = 0;
    while (queue.length) {
      const cur = queue.shift();
      order.push(cur);
      for (const next of adj.get(cur) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          depthMap[next] = depthMap[cur] + 1;
          queue.push(next);
        }
      }
    }
  }
  const byDepth = {};
  for (const id of order) {
    const d = String(depthMap[id]);
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(id);
  }

  // ---- E: Non-code file inventory ----
  const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
  const dataTypes = new Set(['table', 'schema', 'endpoint']);
  const infraTypes = new Set(['service', 'pipeline', 'resource']);
  for (const n of nodes) {
    const entry = { id: n.id, name: n.name, type: n.type, summary: n.summary || '' };
    if (n.type === 'document') nonCodeFiles.documentation.push(entry);
    else if (infraTypes.has(n.type)) nonCodeFiles.infrastructure.push(entry);
    else if (dataTypes.has(n.type)) nonCodeFiles.data.push(entry);
    else if (n.type === 'config') nonCodeFiles.config.push(entry);
  }

  // ---- F: Tightly coupled clusters ----
  // bidirectional pairs over imports/calls
  const edgeSet = new Set();
  for (const e of realEdges) {
    if (e.type === 'imports' || e.type === 'calls') {
      edgeSet.add(e.source + '>>' + e.target);
    }
  }
  // undirected adjacency among real nodes (imports/calls) for cluster expansion
  const undAdj = new Map();
  for (const n of nodes) undAdj.set(n.id, new Set());
  for (const e of realEdges) {
    if (e.type === 'imports' || e.type === 'calls') {
      undAdj.get(e.source).add(e.target);
      undAdj.get(e.target).add(e.source);
    }
  }

  const seedPairs = [];
  for (const e of realEdges) {
    if (e.type === 'imports' || e.type === 'calls') {
      const rev = e.target + '>>' + e.source;
      if (edgeSet.has(rev) && e.source < e.target) {
        seedPairs.push([e.source, e.target]);
      }
    }
  }

  // expand clusters: add nodes connected to 2+ existing members
  const clusters = [];
  const usedSeeds = new Set();
  for (const [a, b] of seedPairs) {
    const key = a + '|' + b;
    if (usedSeeds.has(key)) continue;
    usedSeeds.add(key);
    const members = new Set([a, b]);
    let grew = true;
    while (grew && members.size < 5) {
      grew = false;
      const candidates = new Map();
      for (const m of members) {
        for (const nb of undAdj.get(m)) {
          if (members.has(nb)) continue;
          candidates.set(nb, (candidates.get(nb) || 0) + 1);
        }
      }
      let best = null, bestCount = 1;
      for (const [c, cnt] of candidates) {
        if (cnt >= 2 && cnt > bestCount) { best = c; bestCount = cnt; }
      }
      if (best) { members.add(best); grew = true; }
    }
    // count internal edges
    let edgeCount = 0;
    const arr = [...members];
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue;
        if (edgeSet.has(arr[i] + '>>' + arr[j])) edgeCount++;
      }
    }
    clusters.push({ nodes: arr, edgeCount });
  }
  // dedupe clusters by membership signature, keep highest edgeCount
  const clusterSig = new Map();
  for (const c of clusters) {
    const sig = [...c.nodes].sort().join('|');
    const prev = clusterSig.get(sig);
    if (!prev || c.edgeCount > prev.edgeCount) clusterSig.set(sig, c);
  }
  const uniqueClusters = [...clusterSig.values()]
    .sort((a, b) => b.edgeCount - a.edgeCount)
    .slice(0, 10);

  // ---- G: Layers ----
  const layerOut = {
    count: layers.length,
    list: layers.map((l) => ({ id: l.id, name: l.name, description: l.description }))
  };

  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: { startNode, order, depthMap, byDepth },
    nonCodeFiles,
    clusters: uniqueClusters,
    layers: layerOut,
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: realEdges.length
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error('Fatal error:', err && err.stack ? err.stack : err);
  process.exit(1);
}
