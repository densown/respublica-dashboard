#!/usr/bin/env node
'use strict';

const fs = require('fs');

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error('Usage: node ua-arch-analyze.js <input.json> <output.json>');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const fileNodes = raw.fileNodes || [];
  const importEdges = raw.importEdges || [];
  const allEdges = raw.allEdges || [];

  const idToNode = new Map();
  for (const n of fileNodes) idToNode.set(n.id, n);
  const fileNodeIds = new Set(fileNodes.map((n) => n.id));

  // ---- Common prefix computation ----
  const paths = fileNodes.map((n) => n.filePath || '');
  function commonPrefixDir(allPaths) {
    if (allPaths.length === 0) return '';
    // split into segments
    const segLists = allPaths.map((p) => p.split('/'));
    // only consider directory segments (drop last = filename)
    const dirSegLists = segLists.map((s) => s.slice(0, -1));
    if (dirSegLists.some((s) => s.length === 0)) return '';
    let prefix = [];
    const first = dirSegLists[0];
    for (let i = 0; i < first.length; i++) {
      const seg = first[i];
      if (dirSegLists.every((s) => s[i] === seg)) prefix.push(seg);
      else break;
    }
    return prefix.length ? prefix.join('/') + '/' : '';
  }
  const prefix = commonPrefixDir(paths);

  // ---- A. Directory Grouping ----
  function groupOf(filePath) {
    let rel = filePath;
    if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length);
    const segs = rel.split('/');
    if (segs.length === 1) return '(root)';
    return segs[0];
  }
  const directoryGroups = {};
  const fileToGroupTop = {};
  for (const n of fileNodes) {
    const g = groupOf(n.filePath);
    fileToGroupTop[n.id] = g;
    (directoryGroups[g] = directoryGroups[g] || []).push(n.id);
  }

  // ---- A2. Refined grouping: drill into the dominant directory ----
  // When one top-level group (e.g. src/) holds most files, the coarse grouping
  // hides real structure. Regroup such files by their next-level sub-directory.
  function refinedGroupOf(filePath) {
    let rel = filePath;
    if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length);
    const segs = rel.split('/');
    if (segs.length === 1) return '(root)';
    const top = segs[0];
    if (top === 'src') {
      if (segs.length === 2) return 'src/(root)';
      // collapse design-system/i18n and design-system/components into design-system
      if (segs[1] === 'design-system') return 'src/design-system';
      return 'src/' + segs[1];
    }
    return top;
  }
  const refinedGroups = {};
  const fileToGroup = {}; // primary group map used by all downstream analysis
  for (const n of fileNodes) {
    const g = refinedGroupOf(n.filePath);
    fileToGroup[n.id] = g;
    (refinedGroups[g] = refinedGroups[g] || []).push(n.id);
  }

  // ---- B. Node Type Grouping ----
  const nodeTypeGroups = {};
  for (const n of fileNodes) {
    (nodeTypeGroups[n.type] = nodeTypeGroups[n.type] || []).push(n.id);
  }

  // ---- C. Import Adjacency ----
  const fileFanOut = {};
  const fileFanIn = {};
  for (const id of fileNodeIds) {
    fileFanOut[id] = 0;
    fileFanIn[id] = 0;
  }
  const importsOnly = importEdges.filter(
    (e) => fileNodeIds.has(e.source) && fileNodeIds.has(e.target)
  );
  for (const e of importsOnly) {
    fileFanOut[e.source] = (fileFanOut[e.source] || 0) + 1;
    fileFanIn[e.target] = (fileFanIn[e.target] || 0) + 1;
  }

  // ---- D. Cross-Category Dependency Analysis ----
  const crossCatMap = new Map();
  for (const e of allEdges) {
    const s = idToNode.get(e.source);
    const t = idToNode.get(e.target);
    if (!s || !t) continue;
    if (s.type === t.type) continue; // cross-category only
    const key = s.type + '|' + t.type + '|' + e.type;
    crossCatMap.set(key, (crossCatMap.get(key) || 0) + 1);
  }
  const crossCategoryEdges = [];
  for (const [key, count] of crossCatMap.entries()) {
    const [fromType, toType, edgeType] = key.split('|');
    crossCategoryEdges.push({ fromType, toType, edgeType, count });
  }
  crossCategoryEdges.sort((a, b) => b.count - a.count);

  // ---- E. Inter-Group Import Frequency ----
  const interMap = new Map();
  for (const e of importsOnly) {
    const gs = fileToGroup[e.source];
    const gt = fileToGroup[e.target];
    if (gs === gt) continue;
    const key = gs + '|' + gt;
    interMap.set(key, (interMap.get(key) || 0) + 1);
  }
  const interGroupImports = [];
  for (const [key, count] of interMap.entries()) {
    const [from, to] = key.split('|');
    interGroupImports.push({ from, to, count });
  }
  interGroupImports.sort((a, b) => b.count - a.count);

  // ---- F. Intra-Group Import Density ----
  const intraGroupDensity = {};
  for (const g of Object.keys(refinedGroups)) {
    intraGroupDensity[g] = { internalEdges: 0, totalEdges: 0, density: 0 };
  }
  for (const e of importsOnly) {
    const gs = fileToGroup[e.source];
    const gt = fileToGroup[e.target];
    if (gs === gt) {
      intraGroupDensity[gs].internalEdges += 1;
      intraGroupDensity[gs].totalEdges += 1;
    } else {
      intraGroupDensity[gs].totalEdges += 1;
      intraGroupDensity[gt].totalEdges += 1;
    }
  }
  for (const g of Object.keys(intraGroupDensity)) {
    const d = intraGroupDensity[g];
    d.density = d.totalEdges ? +(d.internalEdges / d.totalEdges).toFixed(3) : 0;
  }

  // ---- G. Directory Pattern Matching ----
  const dirPatternTable = [
    [['routes', 'api', 'controllers', 'endpoints', 'handlers', 'controller', 'routers', 'serializers', 'blueprints'], 'api'],
    [['services', 'core', 'lib', 'domain', 'logic', 'signals', 'composables', 'mailers', 'jobs', 'channels', 'internal'], 'service'],
    [['models', 'db', 'data', 'persistence', 'repository', 'entities', 'migrations', 'entity', 'sql', 'database'], 'data'],
    [['components', 'views', 'pages', 'ui', 'layouts', 'screens'], 'ui'],
    [['middleware', 'plugins', 'interceptors', 'guards'], 'middleware'],
    [['utils', 'helpers', 'common', 'shared', 'tools', 'templatetags', 'pkg'], 'utility'],
    [['config', 'constants', 'env', 'settings', 'management', 'commands'], 'config'],
    [['__tests__', 'test', 'tests', 'spec', 'specs'], 'test'],
    [['types', 'interfaces', 'schemas', 'contracts', 'dtos', 'dto', 'request', 'response'], 'types'],
    [['hooks'], 'hooks'],
    [['store', 'state', 'reducers', 'actions', 'slices'], 'state'],
    [['assets', 'static', 'public'], 'assets'],
    [['cmd', 'bin'], 'entry'],
    [['docs', 'documentation', 'wiki', 'notes'], 'documentation'],
    [['deploy', 'deployment', 'infra', 'infrastructure', 'docker', 'k8s', 'kubernetes', 'helm', 'charts', 'terraform', 'tf'], 'infrastructure'],
    [['.github', '.gitlab', '.circleci'], 'ci-cd'],
  ];
  function matchDirPattern(name) {
    const lower = name.toLowerCase();
    for (const [names, label] of dirPatternTable) {
      if (names.includes(lower)) return label;
    }
    return null;
  }

  function matchFilePattern(node) {
    const fp = node.filePath || '';
    const base = fp.split('/').pop();
    if (/\.(test|spec)\.[jt]sx?$/.test(base) || /^test_.*\.py$/.test(base) ||
        /_test\.go$/.test(base) || /Test\.java$/.test(base) || /_spec\.rb$/.test(base) ||
        /Test\.php$/.test(base) || /Tests\.cs$/.test(base)) return 'test';
    if (/\.d\.ts$/.test(base)) return 'types';
    if (/^(Dockerfile|docker-compose).*/.test(base)) return 'infrastructure';
    if (/\.tf$|\.tfvars$/.test(base)) return 'infrastructure';
    if (base === 'Makefile') return 'infrastructure';
    if (fp.includes('.github/workflows/') || base === '.gitlab-ci.yml' || base === 'Jenkinsfile') return 'ci-cd';
    if (/\.sql$/.test(base)) return 'data';
    if (/\.(graphql|gql|proto)$/.test(base)) return 'types';
    if (/\.(md|rst)$/.test(base)) return 'documentation';
    if (['Cargo.toml','go.mod','Gemfile','pom.xml','build.gradle','composer.json'].includes(base)) return 'config';
    return null;
  }

  function lastSeg(g) {
    return g.includes('/') ? g.split('/').pop() : g;
  }
  const patternMatches = {};
  for (const g of Object.keys(refinedGroups)) {
    const m = matchDirPattern(lastSeg(g));
    if (m) patternMatches[g] = m;
  }

  // ---- H. Deployment Topology ----
  const infraFiles = [];
  let hasDockerfile = false, hasCompose = false, hasK8s = false, hasTerraform = false, hasCI = false;
  for (const n of fileNodes) {
    const fp = n.filePath || '';
    const base = fp.split('/').pop();
    if (/^Dockerfile/.test(base)) { hasDockerfile = true; infraFiles.push(fp); }
    else if (/^docker-compose/.test(base)) { hasCompose = true; infraFiles.push(fp); }
    else if (/\.tf$|\.tfvars$/.test(base)) { hasTerraform = true; infraFiles.push(fp); }
    else if (fp.includes('.github/workflows/') || base === '.gitlab-ci.yml' || base === 'Jenkinsfile') { hasCI = true; infraFiles.push(fp); }
    else if (/(^|\/)(k8s|kubernetes|helm|charts)(\/|$)/.test(fp)) { hasK8s = true; infraFiles.push(fp); }
    else if (n.type === 'pipeline') { hasCI = true; infraFiles.push(fp); }
    else if (/deploy\.sh$/.test(base)) { infraFiles.push(fp); }
  }

  // ---- I. Data Pipeline ----
  const schemaFiles = [], migrationFiles = [], dataModelFiles = [], apiHandlerFiles = [];
  for (const n of fileNodes) {
    const fp = n.filePath || '';
    const tags = (n.tags || []).map((t) => t.toLowerCase());
    if (/\.(sql|graphql|gql|proto|prisma)$/.test(fp)) schemaFiles.push(fp);
    if (/migrations?\//.test(fp)) migrationFiles.push(fp);
    if (tags.includes('data-model') || /\/(models|data)\//.test(fp)) dataModelFiles.push(fp);
    if (tags.includes('api-handler') || tags.includes('api-consumer') || tags.includes('api')) apiHandlerFiles.push(fp);
  }

  // ---- J. Documentation Coverage ----
  const docFiles = fileNodes.filter((n) => n.type === 'document' || /\.(md|rst)$/.test(n.filePath || ''));
  const docGroups = new Set(docFiles.map((n) => fileToGroup[n.id]));
  const allGroups = Object.keys(refinedGroups);
  const groupsWithDocs = allGroups.filter((g) => docGroups.has(g));
  const undocumentedGroups = allGroups.filter((g) => !docGroups.has(g));

  // ---- K. Dependency Direction ----
  const pairDir = new Map(); // unordered pair -> {a->b, b->a}
  for (const { from, to, count } of interGroupImports) {
    const key = [from, to].sort().join('||');
    const rec = pairDir.get(key) || {};
    rec[from + '>' + to] = count;
    pairDir.set(key, rec);
  }
  const dependencyDirection = [];
  const seenPairs = new Set();
  for (const { from, to } of interGroupImports) {
    const key = [from, to].sort().join('||');
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    const rec = pairDir.get(key);
    const fwd = rec[from + '>' + to] || 0;
    const bwd = rec[to + '>' + from] || 0;
    if (fwd >= bwd) dependencyDirection.push({ dependent: from, dependsOn: to });
    else dependencyDirection.push({ dependent: to, dependsOn: from });
  }

  // ---- Stats ----
  const filesPerGroup = {};
  for (const g of Object.keys(refinedGroups)) filesPerGroup[g] = refinedGroups[g].length;
  const nodeTypeCounts = {};
  for (const t of Object.keys(nodeTypeGroups)) nodeTypeCounts[t] = nodeTypeGroups[t].length;

  const out = {
    scriptCompleted: true,
    commonPrefix: prefix,
    directoryGroups,
    refinedGroups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    filePatternMatches: (() => {
      const m = {};
      for (const n of fileNodes) {
        const p = matchFilePattern(n);
        if (p) m[n.id] = p;
      }
      return m;
    })(),
    deploymentTopology: { hasDockerfile, hasCompose, hasK8s, hasTerraform, hasCI, infraFiles },
    dataPipeline: { schemaFiles, migrationFiles, dataModelFiles, apiHandlerFiles },
    docCoverage: {
      groupsWithDocs: groupsWithDocs.length,
      totalGroups: allGroups.length,
      coverageRatio: allGroups.length ? +(groupsWithDocs.length / allGroups.length).toFixed(2) : 0,
      undocumentedGroups,
    },
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup,
      nodeTypeCounts,
    },
    fileFanIn,
    fileFanOut,
  };

  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
  console.error('Analysis complete. Groups:', allGroups.length, 'Files:', fileNodes.length);
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error('FATAL:', err && err.stack ? err.stack : err);
  process.exit(1);
}
