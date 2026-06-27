// Languages that can actually call functions / import modules
const CODE_LANGUAGES = new Set([
  'JavaScript','TypeScript','Python','Java','C++','C','Go','Rust',
  'Ruby','PHP','C#','Swift','Kotlin','Lua','R','PowerShell','Shell'
]);

// Languages that should NEVER be the source of dependency edges
const NON_CODE_LANGUAGES = new Set([
  'Markdown','JSON','YAML','TOML','XML','Env','SQL','HTML','CSS','SCSS','Less','Other'
]);

// Deduplicate edges: same source+target+type = one edge
function edgeKey(src, tgt, type) { return `${src}||${tgt}||${type}`; }

export function resolveDependencies(files) {
  const edges = [];
  const seen = new Set();
  const addEdge = (e) => {
    const k = edgeKey(e.source, e.target, e.type);
    if (!seen.has(k)) { seen.add(k); edges.push(e); }
  };

  // Only index code files for symbol resolution
  const codeFiles = files.filter(f => CODE_LANGUAGES.has(f.language));

  const classIndex = new Map();
  const fnIndex    = new Map();
  const exportIndex = new Map();

  codeFiles.forEach(f => {
    f.symbols.classes.forEach(c  => { if (!classIndex.has(c.name))  classIndex.set(c.name, f); });
    f.symbols.functions.forEach(fn => { if (!fnIndex.has(fn.name))    fnIndex.set(fn.name, f); });
    f.symbols.exports.forEach(e  => { if (!exportIndex.has(e.name)) exportIndex.set(e.name, f); });
  });

  // Resolve edges — only for code files as SOURCE
  codeFiles.forEach(sourceFile => {
    // 1. Imports
    sourceFile.symbols.imports.forEach(imp => {
      if (!imp.source) return;
      const srcStr = imp.source.replace(/['"]/g, '').replace(/^\.\/|^\.\.\//,'');
      if (!srcStr) return;

      // Try exact path match first, then partial
      let targetFile = codeFiles.find(f =>
        f.path.endsWith(srcStr + '.js') ||
        f.path.endsWith(srcStr + '.ts') ||
        f.path.endsWith(srcStr + '.py') ||
        f.path.endsWith(srcStr + '.java') ||
        f.path.endsWith(srcStr + '/index.js') ||
        f.path.endsWith(srcStr + '/index.ts') ||
        f.path === srcStr
      );

      if (!targetFile) {
        targetFile = codeFiles.find(f => f.name === srcStr || f.path.includes('/' + srcStr + '.'));
      }
      if (!targetFile && imp.name && exportIndex.has(imp.name)) {
        targetFile = exportIndex.get(imp.name);
      }

      if (targetFile && targetFile !== sourceFile) {
        addEdge({ source: sourceFile.path, target: targetFile.path, type: 'imports', weight: 3, meta: `Imports ${imp.name || srcStr}` });
      }
    });

    // 2. Extends (class inheritance)
    sourceFile.symbols.classes.forEach(cls => {
      if (!cls.extends) return;
      const targetFile = classIndex.get(cls.extends);
      if (targetFile && targetFile !== sourceFile) {
        addEdge({ source: sourceFile.path, target: targetFile.path, type: 'extends', weight: 5, meta: `Class ${cls.name} extends ${cls.extends}` });
      }
    });

    // 3. Calls — only match long, specific function names (>=6 chars) to reduce false positives
    //    Skip if source is a non-code file (Markdown, JSON, etc.)
    if (NON_CODE_LANGUAGES.has(sourceFile.language)) return;

    const GENERIC_NAMES = new Set([
      'print','write','close','open','read','send','load','save','get','set',
      'add','run','main','init','start','stop','reset','clear','update','render',
      'fetch','parse','build','check','test','next','move','show','hide','create',
      'delete','remove','insert','push','pop','shift','map','filter','reduce'
    ]);

    fnIndex.forEach((targetFile, fnName) => {
      if (targetFile === sourceFile) return;
      if (fnName.length < 6) return; // skip short/generic names
      if (GENERIC_NAMES.has(fnName.toLowerCase())) return;
      try {
        const regex = new RegExp(`\\b${fnName}\\s*\\(`, 'g');
        if (regex.test(sourceFile.content)) {
          addEdge({ source: sourceFile.path, target: targetFile.path, type: 'calls', weight: 1, meta: `Calls ${fnName}()` });
        }
      } catch (_) {}
    });
  });

  return edges;
}
