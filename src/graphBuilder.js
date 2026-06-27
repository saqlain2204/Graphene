export function buildGraph(files, edges) {
  const inDegree = {};
  const outDegree = {};
  files.forEach(f => { inDegree[f.path] = 0; outDegree[f.path] = 0; });
  
  edges.forEach(e => {
    if (e.type === 'imports' || e.type === 'calls') {
      outDegree[e.source] = (outDegree[e.source] || 0) + 1;
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    }
  });

  const nodes = files.map(f => {
    // node size based on symbol count and line count
    const symbolCount = f.symbols.classes.length + f.symbols.functions.length + f.symbols.imports.length + f.symbols.exports.length;
    const baseSize = 8;
    const size = Math.min(Math.max(baseSize, baseSize + Math.sqrt(symbolCount) * 2 + Math.sqrt(f.lineCount) * 0.5), 40);

    const isEntry = (inDegree[f.path] === 0 && outDegree[f.path] > 0) || /^(main|index|app)\./i.test(f.name);

    return {
      id: f.path,
      label: f.name,
      fullPath: f.path,
      language: f.language,
      shade: f.shade,
      size: size,
      depth: f.depth,
      symbols: f.symbols,
      content: f.content,
      group: f.dir,
      file: f,
      isEntry: isEntry
    };
  });

  return { nodes, edges };
}
