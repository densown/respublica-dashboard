import fs from 'fs';
const ROOT='/root/respublica-dashboard';
const {nodes,edges}=JSON.parse(fs.readFileSync(ROOT+'/.understand-anything/tmp/graph-2-full.json','utf8'));

// alphabetical file list
const files = nodes.filter(n=>n.type==='file').map(n=>n.filePath).sort();
const parts=4, chunk=Math.ceil(files.length/parts);
const groups=[];
for(let i=0;i<parts;i++) groups.push(new Set(files.slice(i*chunk,(i+1)*chunk)));

function fileOf(node){ return node.filePath; }
function fileOfId(id){
  // file:path | function:path:name | class:path:name
  if(id.startsWith('file:')) return id.slice(5);
  const m=id.match(/^(?:function|class):(.+):[^:]+$/);
  return m?m[1]:null;
}

for(let i=0;i<parts;i++){
  const g=groups[i];
  const pnodes=nodes.filter(n=>g.has(fileOf(n)));
  const nodeIds=new Set(pnodes.map(n=>n.id));
  // edges whose source belongs to this part (source file in group)
  const pedges=edges.filter(e=>{
    const f=fileOfId(e.source);
    return f && g.has(f);
  });
  const out={nodes:pnodes,edges:pedges};
  const path=ROOT+`/.understand-anything/intermediate/batch-2-part-${i+1}.json`;
  fs.writeFileSync(path, JSON.stringify(out,null,2));
  console.log(`part ${i+1}: files=${g.size} nodes=${pnodes.length} edges=${pedges.length}`);
}
// totals check
let tn=0,te=0;
for(let i=0;i<parts;i++){const j=JSON.parse(fs.readFileSync(ROOT+`/.understand-anything/intermediate/batch-2-part-${i+1}.json`));tn+=j.nodes.length;te+=j.edges.length;}
console.log("TOTAL nodes:",tn,"edges:",te);
