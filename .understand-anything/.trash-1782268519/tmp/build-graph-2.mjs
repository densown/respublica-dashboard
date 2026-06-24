import fs from 'fs';

const ROOT = '/root/respublica-dashboard';
const importData = JSON.parse(fs.readFileSync(ROOT + '/.understand-anything/tmp/ua-file-analyzer-input-2.json','utf8')).batchImportData;

const nodes = [];
const edges = [];
const seenNode = new Set();
function addNode(n){ if(seenNode.has(n.id)) return; seenNode.add(n.id); nodes.push(n); }
function addEdge(e){ if(e.source===e.target) return; edges.push(e); }

// ---- File nodes ----
const files = {
 "src/pages/elections/AdvancedAnalysis.tsx": {name:"AdvancedAnalysis.tsx", summary:"Election analysis dashboard tab hosting scatter plots, ranking tables, and change-over-time visualizations for district (Kreis) election data, with search, region filtering, and gain/loss leaderboards.", tags:["component","page","data-visualization","elections","analysis"], complexity:"complex"},
 "src/pages/elections/ChangeAnalysisCharts.tsx": {name:"ChangeAnalysisCharts.tsx", summary:"Chart components rendering vote-change analysis: top gains/losses bar charts, a delta histogram, and per-state average change bars for election comparisons.", tags:["component","data-visualization","elections","charts"], complexity:"complex"},
 "src/pages/elections/ChangeMap.tsx": {name:"ChangeMap.tsx", summary:"Interactive SVG choropleth map coloring districts by vote-share change between two elections, with hover tooltips, zoom-to-region, and a diverging legend.", tags:["component","map","data-visualization","elections","svg"], complexity:"complex"},
 "src/pages/elections/CompareMode.tsx": {name:"CompareMode.tsx", summary:"Multi-region comparison view that fetches election results for several Kreise and renders side-by-side bar charts, time series, and difference tables.", tags:["component","data-visualization","elections","comparison","api-consumer"], complexity:"complex"},
 "src/pages/elections/DifferenceTable.tsx": {name:"DifferenceTable.tsx", summary:"Table comparing per-party vote shares across multiple selected regions, color-coding the spread between min and max values per party.", tags:["component","table","data-visualization","elections"], complexity:"complex"},
 "src/pages/elections/DistrictAnalysis.tsx": {name:"DistrictAnalysis.tsx", summary:"Deep-dive single-district (Kreis) analysis page combining historical tables, party bar charts, percentile bars, and election-type comparison line charts.", tags:["component","page","data-visualization","elections","analysis"], complexity:"complex"},
 "src/pages/elections/ElectionMap.tsx": {name:"ElectionMap.tsx", summary:"Interactive SVG choropleth of Germany's districts colored by party share or turnout, with hover tooltips, zoom-to-region, and a metric-aware legend.", tags:["component","map","data-visualization","elections","svg"], complexity:"complex"},
 "src/pages/elections/HistoricalTable.tsx": {name:"HistoricalTable.tsx", summary:"Table presenting a district's party vote shares across historical election years, highlighting the winning party per row.", tags:["component","table","data-visualization","elections"], complexity:"complex"},
 "src/pages/elections/KreisAutocomplete.tsx": {name:"KreisAutocomplete.tsx", summary:"Autocomplete search input for German districts (Kreise) that filters GeoJSON features by name and exposes a reusable hit-filtering helper.", tags:["component","search","autocomplete","elections"], complexity:"moderate"},
 "src/pages/elections/MapMode.tsx": {name:"MapMode.tsx", summary:"Map-centric election view orchestrating the choropleth map, metric/type selectors, district search, and the advanced analysis tabs.", tags:["component","map","elections","orchestration"], complexity:"complex"},
 "src/pages/elections/PartyBarChart.tsx": {name:"PartyBarChart.tsx", summary:"Horizontal bar chart rendering a single region's party vote shares for one election year, using shared party colors.", tags:["component","chart","data-visualization","elections"], complexity:"moderate"},
 "src/pages/elections/PartyToggles.tsx": {name:"PartyToggles.tsx", summary:"Toggle-button group letting users enable or disable individual parties in district charts, with readable text contrast against party colors.", tags:["component","filter","elections","ui-control"], complexity:"moderate"},
 "src/pages/elections/PercentileBar.tsx": {name:"PercentileBar.tsx", summary:"Percentile bar widget positioning a district's value within a min/max range to show relative standing among all districts.", tags:["component","data-visualization","elections"], complexity:"moderate"},
 "src/pages/elections/RadarCompare.tsx": {name:"RadarCompare.tsx", summary:"Radar chart comparing multiple regions across fixed party-share axes, with localized subject labels.", tags:["component","chart","data-visualization","elections","comparison"], complexity:"moderate"},
 "src/pages/elections/RankingTable.tsx": {name:"RankingTable.tsx", summary:"Sortable ranking table listing districts by a metric, deriving the Bundesland (state) from each district's AGS code.", tags:["component","table","data-visualization","elections","ranking"], complexity:"moderate"},
 "src/pages/elections/RegionPanel.tsx": {name:"RegionPanel.tsx", summary:"Side panel showing a selected region's election detail: per-party bars, time series across years, and metadata, fetched from the API.", tags:["component","panel","data-visualization","elections","api-consumer"], complexity:"complex"},
 "src/pages/elections/ScatterPlot.tsx": {name:"ScatterPlot.tsx", summary:"Configurable scatter plot correlating two district metrics with selectable axes and party/state color modes, plus an interactive color legend.", tags:["component","chart","data-visualization","elections"], complexity:"complex"},
 "src/pages/elections/TimeSeriesChart.tsx": {name:"TimeSeriesChart.tsx", summary:"Multi-party line chart plotting vote shares over election years, supporting comparison overlays between regions.", tags:["component","chart","data-visualization","elections","time-series"], complexity:"moderate"},
 "src/pages/elections/electionUiUtils.tsx": {name:"electionUiUtils.tsx", summary:"Shared UI helpers for the elections module: election-type constants, themed select styling, localized type labels, AGS normalization, and section-title rendering.", tags:["utility","elections","ui-helpers"], complexity:"moderate"},
 "src/pages/elections/mapColors.ts": {name:"mapColors.ts", summary:"Color-scale functions mapping election metrics (party share, turnout, vote change) to fill colors for choropleth maps.", tags:["utility","color","map","elections"], complexity:"moderate"},
 "src/pages/elections/mapGeometry.ts": {name:"mapGeometry.ts", summary:"GeoJSON projection utilities converting district coordinates into SVG path data and building a lookup map of district geometries.", tags:["utility","geometry","map","svg","elections"], complexity:"moderate"},
 "src/pages/elections/normalizeWahlen.ts": {name:"normalizeWahlen.ts", summary:"Normalization helpers converting raw API election values into display percentages and resolving district display names.", tags:["utility","data-transformation","elections","normalization"], complexity:"moderate"},
 "src/pages/elections/partyColors.ts": {name:"partyColors.ts", summary:"Central palette and labels for German parties and federal states, with light/dark theme variants and AGS-to-state-color helpers.", tags:["constants","color","elections","theme"], complexity:"moderate"},
 "src/pages/elections/regionBarRows.ts": {name:"regionBarRows.ts", summary:"Helper transforming a region's election row into bar-chart data using shared party colors and normalization utilities.", tags:["utility","data-transformation","elections"], complexity:"simple"},
 "src/pages/elections/types.ts": {name:"types.ts", summary:"Shared TypeScript type definitions for election map rows, distinguishing API-shaped rows from normalized display rows.", tags:["type-definition","elections"], complexity:"simple"},
};

for (const [p,m] of Object.entries(files)){
  addNode({id:"file:"+p, type:"file", name:m.name, filePath:p, summary:m.summary, tags:m.tags, complexity:m.complexity});
}

// ---- Significant function nodes (>=10 lines OR exported & non-trivial). React components & exported helpers. ----
// list: [path, name, start, end, exported, summary, tags]
const fns = [
 ["src/pages/elections/AdvancedAnalysis.tsx","AdvancedAnalysis",92,795,true,"Main analysis tab component wiring scatter/ranking/change views, managing tab state, region search, and gain/loss leaderboards.",["component","elections","analysis"]],
 ["src/pages/elections/AdvancedAnalysis.tsx","selectStyle",66,84,false,"Builds themed inline styles for native select elements used in the analysis toolbar.",["utility","styling"]],
 ["src/pages/elections/ChangeAnalysisCharts.tsx","ChangeGainsLossesBarCharts",71,200,true,"Renders side-by-side bar charts of the largest vote-share gains and losses across districts.",["component","chart","elections"]],
 ["src/pages/elections/ChangeAnalysisCharts.tsx","ChangeDeltaHistogram",216,350,true,"Renders a histogram binning districts by their vote-change delta.",["component","chart","elections"]],
 ["src/pages/elections/ChangeAnalysisCharts.tsx","ChangeStateAverageBars",357,457,true,"Renders per-state average vote-change bars aggregated from district rows.",["component","chart","elections"]],
 ["src/pages/elections/ChangeMap.tsx","ChangeMap",50,290,true,"SVG choropleth map coloring districts by vote-share change with hover tooltips and zoom-to-region.",["component","map","elections","svg"]],
 ["src/pages/elections/CompareMode.tsx","CompareMode",84,687,true,"Multi-region comparison view fetching and rendering side-by-side election results, time series, and difference tables.",["component","comparison","elections","api-consumer"]],
 ["src/pages/elections/DifferenceTable.tsx","DifferenceTable",40,370,true,"Table comparing per-party vote shares across regions with color-coded spreads.",["component","table","elections"]],
 ["src/pages/elections/DifferenceTable.tsx","spanColor",30,38,false,"Maps a value's position within a min/max spread to a color intensity.",["utility","color"]],
 ["src/pages/elections/DistrictAnalysis.tsx","DistrictAnalysis",176,1159,true,"Single-district deep-dive page combining historical tables, party charts, percentile bars, and type-comparison line charts.",["component","page","elections","analysis"]],
 ["src/pages/elections/DistrictAnalysis.tsx","ElectionTypeCompareLineLegend",74,131,false,"Renders the legend for the election-type comparison line chart.",["component","chart","legend"]],
 ["src/pages/elections/DistrictAnalysis.tsx","winnerPartyKey",138,149,false,"Determines the winning party key for an election row by comparing party shares.",["utility","elections"]],
 ["src/pages/elections/ElectionMap.tsx","ElectionMap",50,249,true,"SVG choropleth of districts colored by party share or turnout, with hover tooltips and zoom.",["component","map","elections","svg"]],
 ["src/pages/elections/ElectionMap.tsx","ElectionMapLegend",251,380,true,"Metric-aware legend for the election choropleth, switching between party-share and turnout scales.",["component","map","legend","elections"]],
 ["src/pages/elections/HistoricalTable.tsx","HistoricalTable",57,333,true,"Table of a district's party vote shares across historical years with winner highlighting.",["component","table","elections"]],
 ["src/pages/elections/HistoricalTable.tsx","winnerKey",37,48,false,"Determines the winning party key for a historical election row.",["utility","elections"]],
 ["src/pages/elections/KreisAutocomplete.tsx","filterKreiseSearchHits",12,30,true,"Filters GeoJSON district features by a search query, returning ranked name hits.",["utility","search","elections"]],
 ["src/pages/elections/KreisAutocomplete.tsx","KreisAutocomplete",63,205,true,"Autocomplete input component for searching and selecting German districts.",["component","search","autocomplete"]],
 ["src/pages/elections/KreisAutocomplete.tsx","selectInputStyle",32,49,false,"Builds themed inline styles for the autocomplete input element.",["utility","styling"]],
 ["src/pages/elections/MapMode.tsx","MapMode",151,437,true,"Map view orchestrating the choropleth, metric/type selectors, district search, and analysis tabs.",["component","map","elections","orchestration"]],
 ["src/pages/elections/MapMode.tsx","sparseKreisBannerText",82,111,false,"Builds a localized banner message warning of sparse district data coverage.",["utility","i18n","elections"]],
 ["src/pages/elections/MapMode.tsx","typeLabel",59,74,false,"Returns a localized label for an election type.",["utility","i18n","elections"]],
 ["src/pages/elections/PartyBarChart.tsx","PartyBarChart",29,115,true,"Horizontal bar chart of a region's party vote shares for one election year.",["component","chart","elections"]],
 ["src/pages/elections/PartyToggles.tsx","PartyToggles",35,94,true,"Toggle-button group for enabling/disabling parties in district charts.",["component","filter","elections"]],
 ["src/pages/elections/PercentileBar.tsx","PercentileBar",18,95,true,"Percentile bar widget showing a district's standing within a min/max range.",["component","data-visualization","elections"]],
 ["src/pages/elections/RadarCompare.tsx","RadarCompare",44,118,true,"Radar chart comparing regions across fixed party-share axes.",["component","chart","elections","comparison"]],
 ["src/pages/elections/RankingTable.tsx","RankingTable",21,184,true,"Sortable ranking table of districts by a metric with state derivation from AGS codes.",["component","table","elections","ranking"]],
 ["src/pages/elections/RegionPanel.tsx","RegionPanel",80,387,true,"Side panel rendering a selected region's election detail with bars, time series, and metadata.",["component","panel","elections","api-consumer"]],
 ["src/pages/elections/RegionPanel.tsx","rowToBarData",41,65,false,"Transforms an election row into per-party bar-chart data entries.",["utility","data-transformation","elections"]],
 ["src/pages/elections/ScatterPlot.tsx","ScatterPlot",63,290,true,"Configurable scatter plot correlating two district metrics with selectable axes and color modes.",["component","chart","elections"]],
 ["src/pages/elections/ScatterPlot.tsx","ScatterColorLegend",296,445,false,"Interactive color legend for the scatter plot's party/state color modes.",["component","chart","legend","elections"]],
 ["src/pages/elections/ScatterPlot.tsx","scatterAxisLabel",50,61,true,"Returns a localized axis label for a scatter plot metric key.",["utility","i18n","elections"]],
 ["src/pages/elections/TimeSeriesChart.tsx","TimeSeriesChart",26,170,true,"Multi-party line chart plotting vote shares over election years with comparison overlays.",["component","chart","elections","time-series"]],
 ["src/pages/elections/electionUiUtils.tsx","selectCss",14,31,true,"Builds themed CSS for native select elements in the elections UI.",["utility","styling","elections"]],
 ["src/pages/elections/electionUiUtils.tsx","typeLabelT",33,48,true,"Returns a localized label for an election type via the translation function.",["utility","i18n","elections"]],
 ["src/pages/elections/electionUiUtils.tsx","sectionTitle",54,70,true,"Renders a styled section-title element for the elections layout.",["utility","ui-helpers","elections"]],
 ["src/pages/elections/mapColors.ts","turnoutColor",20,35,true,"Maps a turnout value within a range to a sequential fill color.",["utility","color","map"]],
 ["src/pages/elections/mapColors.ts","changeColor",41,57,true,"Maps a vote-change delta to a diverging fill color around a neutral midpoint.",["utility","color","map"]],
 ["src/pages/elections/mapColors.ts","mapFillColor",59,89,true,"Dispatches to the appropriate color scale based on the active map metric.",["utility","color","map"]],
 ["src/pages/elections/mapGeometry.ts","projectCoords",24,43,true,"Projects geographic coordinates into SVG pixel space within a bounding box.",["utility","geometry","map","svg"]],
 ["src/pages/elections/mapGeometry.ts","featureToPath",45,96,true,"Converts a GeoJSON feature's geometry into an SVG path data string.",["utility","geometry","map","svg"]],
 ["src/pages/elections/mapGeometry.ts","buildKreiseMap",105,133,true,"Builds a lookup map of district SVG path data and bounds from a GeoJSON collection.",["utility","geometry","map"]],
 ["src/pages/elections/normalizeWahlen.ts","resolveKreisDisplayName",24,48,true,"Resolves a district's display name from AGS code, name map, and API-provided name.",["utility","normalization","elections"]],
 ["src/pages/elections/normalizeWahlen.ts","normalizeMapRow",67,86,true,"Normalizes a raw API map row into a display-ready row with percentages and names.",["utility","data-transformation","elections"]],
 ["src/pages/elections/regionBarRows.ts","regionRowToSingleResultBars",14,25,true,"Transforms a region's election row into single-result bar-chart data.",["utility","data-transformation","elections"]],
];

for (const [p,name,s,e,exp,summary,tags] of fns){
  const id = "function:"+p+":"+name;
  addNode({id, type:"function", name, filePath:p, lineRange:[s,e], summary, tags, complexity:(e-s+1)>200?"complex":(e-s+1)>=50?"moderate":"simple"});
  addEdge({source:"file:"+p, target:id, type:"contains", direction:"forward", weight:1.0});
  if(exp) addEdge({source:"file:"+p, target:id, type:"exports", direction:"forward", weight:0.8});
}

// ---- Import edges (1:1 from batchImportData) ----
let importCount=0;
for (const [p, imps] of Object.entries(importData)){
  for (const tgt of imps){
    addEdge({source:"file:"+p, target:"file:"+tgt, type:"imports", direction:"forward", weight:0.7});
    importCount++;
  }
}

// ---- Selected cross-file calls (high confidence, to in-batch exported functions) ----
const calls = [
 // AdvancedAnalysis uses normalizeWahlen + ScatterPlot helpers
 ["src/pages/elections/AdvancedAnalysis.tsx","src/pages/elections/normalizeWahlen.ts","resolveKreisDisplayName"],
 ["src/pages/elections/AdvancedAnalysis.tsx","src/pages/elections/ScatterPlot.tsx","scatterAxisLabel"],
 // ChangeMap uses mapColors.changeColor + normalizeWahlen
 ["src/pages/elections/ChangeMap.tsx","src/pages/elections/mapColors.ts","changeColor"],
 ["src/pages/elections/ChangeMap.tsx","src/pages/elections/normalizeWahlen.ts","resolveKreisDisplayName"],
 // ChangeAnalysisCharts uses partyColors.statePrefixFromAgs
 // CompareMode uses normalizeWahlen + regionBarRows + KreisAutocomplete
 ["src/pages/elections/CompareMode.tsx","src/pages/elections/normalizeWahlen.ts","resolveKreisDisplayName"],
 ["src/pages/elections/CompareMode.tsx","src/pages/elections/regionBarRows.ts","regionRowToSingleResultBars"],
 ["src/pages/elections/CompareMode.tsx","src/pages/elections/KreisAutocomplete.tsx","filterKreiseSearchHits"],
 ["src/pages/elections/CompareMode.tsx","src/pages/elections/normalizeWahlen.ts","normalizeMapRow"],
 // ElectionMap uses mapColors.mapFillColor + mapGeometry + normalizeWahlen
 ["src/pages/elections/ElectionMap.tsx","src/pages/elections/mapColors.ts","mapFillColor"],
 ["src/pages/elections/ElectionMap.tsx","src/pages/elections/normalizeWahlen.ts","resolveKreisDisplayName"],
 // ChangeMap/ElectionMap/MapMode/AdvancedAnalysis use mapGeometry.buildKreiseMap
 ["src/pages/elections/MapMode.tsx","src/pages/elections/mapGeometry.ts","buildKreiseMap"],
 ["src/pages/elections/AdvancedAnalysis.tsx","src/pages/elections/mapGeometry.ts","buildKreiseMap"],
 ["src/pages/elections/ChangeMap.tsx","src/pages/elections/mapGeometry.ts","featureToPath"],
 // regionBarRows uses normalizeWahlen
 ["src/pages/elections/regionBarRows.ts","src/pages/elections/normalizeWahlen.ts","normalizeMapRow"],
 // mapColors uses nothing exported as fn from partyColors (constants). skip
 // RankingTable/ScatterPlot/etc use normalizeWahlen
 ["src/pages/elections/RankingTable.tsx","src/pages/elections/normalizeWahlen.ts","normalizeMapRow"],
 ["src/pages/elections/ScatterPlot.tsx","src/pages/elections/normalizeWahlen.ts","normalizeMapRow"],
 ["src/pages/elections/HistoricalTable.tsx","src/pages/elections/normalizeWahlen.ts","normalizeMapRow"],
 ["src/pages/elections/TimeSeriesChart.tsx","src/pages/elections/normalizeWahlen.ts","toDisplayPercent"],
 ["src/pages/elections/PartyBarChart.tsx","src/pages/elections/normalizeWahlen.ts","normalizeMapRow"],
 ["src/pages/elections/RadarCompare.tsx","src/pages/elections/normalizeWahlen.ts","toDisplayPercent"],
 // mapGeometry uses nothing exported-as-fn. partyColors imported as constants.
 ["src/pages/elections/MapMode.tsx","src/pages/elections/AdvancedAnalysis.tsx","AdvancedAnalysis"],
 ["src/pages/elections/MapMode.tsx","src/pages/elections/ElectionMap.tsx","ElectionMap"],
 ["src/pages/elections/MapMode.tsx","src/pages/elections/KreisAutocomplete.tsx","KreisAutocomplete"],
 ["src/pages/elections/AdvancedAnalysis.tsx","src/pages/elections/ChangeMap.tsx","ChangeMap"],
 ["src/pages/elections/AdvancedAnalysis.tsx","src/pages/elections/RankingTable.tsx","RankingTable"],
 ["src/pages/elections/AdvancedAnalysis.tsx","src/pages/elections/ScatterPlot.tsx","ScatterPlot"],
 ["src/pages/elections/AdvancedAnalysis.tsx","src/pages/elections/ChangeAnalysisCharts.tsx","ChangeGainsLossesBarCharts"],
 ["src/pages/elections/CompareMode.tsx","src/pages/elections/DifferenceTable.tsx","DifferenceTable"],
 ["src/pages/elections/CompareMode.tsx","src/pages/elections/PartyBarChart.tsx","PartyBarChart"],
 ["src/pages/elections/CompareMode.tsx","src/pages/elections/RadarCompare.tsx","RadarCompare"],
 ["src/pages/elections/CompareMode.tsx","src/pages/elections/PartyToggles.tsx","PartyToggles"],
 ["src/pages/elections/DistrictAnalysis.tsx","src/pages/elections/HistoricalTable.tsx","HistoricalTable"],
 ["src/pages/elections/DistrictAnalysis.tsx","src/pages/elections/PartyBarChart.tsx","PartyBarChart"],
 ["src/pages/elections/DistrictAnalysis.tsx","src/pages/elections/PartyToggles.tsx","PartyToggles"],
 ["src/pages/elections/DistrictAnalysis.tsx","src/pages/elections/KreisAutocomplete.tsx","KreisAutocomplete"],
 ["src/pages/elections/RegionPanel.tsx","src/pages/elections/PartyBarChart.tsx","PartyBarChart"],
 ["src/pages/elections/RegionPanel.tsx","src/pages/elections/TimeSeriesChart.tsx","TimeSeriesChart"],
];
for (const [src,tp,name] of calls){
  addEdge({source:"file:"+src, target:"function:"+tp+":"+name, type:"calls", direction:"forward", weight:0.8});
}

fs.writeFileSync(ROOT + '/.understand-anything/tmp/graph-2-full.json', JSON.stringify({nodes,edges},null,2));
console.log("nodes:",nodes.length,"edges:",edges.length,"importEdges:",importCount);
// edge type breakdown
const bt={}; for(const e of edges) bt[e.type]=(bt[e.type]||0)+1; console.log("edgeTypes:",JSON.stringify(bt));
