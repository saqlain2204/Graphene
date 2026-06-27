// generic parser using regexes
export function parseFile(file) {
  const content = file.content;
  const lang = file.language;
  const symbols = {
    functions: [],
    classes: [],
    imports: [],
    exports: [],
    variables: []
  };

  const lines = content.split('\n');

  if (lang === 'JavaScript' || lang === 'TypeScript') {
    // Basic regex for imports
    const importRegex = /import\s+(?:{([^}]+)}|([a-zA-Z0-9_]+)|\*\s+as\s+([a-zA-Z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /(?:const|let|var)\s+(?:{([^}]+)}|([a-zA-Z0-9_]+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*([a-zA-Z0-9_]+)?/g;
    const classRegex = /class\s+([a-zA-Z0-9_]+)(?:\s+extends\s+([a-zA-Z0-9_]+))?/g;
    const fnRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
    const arrowRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?(?:\(([^)]*)\)|[a-zA-Z0-9_]+)\s*=>/g;

    lines.forEach((line, i) => {
      let m;
      while ((m = importRegex.exec(line)) !== null) {
        symbols.imports.push({ name: m[1] || m[2] || m[3], source: m[4], line: i + 1 });
      }
      while ((m = requireRegex.exec(line)) !== null) {
        symbols.imports.push({ name: m[1] || m[2], source: m[3], line: i + 1 });
      }
      while ((m = classRegex.exec(line)) !== null) {
        symbols.classes.push({ name: m[1], extends: m[2], line: i + 1 });
      }
      while ((m = fnRegex.exec(line)) !== null) {
        symbols.functions.push({ name: m[1], params: m[2], line: i + 1 });
      }
      while ((m = arrowRegex.exec(line)) !== null) {
        symbols.functions.push({ name: m[1], params: m[2] || '', line: i + 1 });
      }
      while ((m = exportRegex.exec(line)) !== null) {
        if(m[1]) symbols.exports.push({ name: m[1], line: i + 1 });
      }
    });
  } else if (lang === 'Python') {
    const importRegex = /^(?:from\s+([a-zA-Z0-9_.]+)\s+)?import\s+(.+)$/g;
    const classRegex = /^class\s+([a-zA-Z0-9_]+)(?:\(([^)]*)\))?:/g;
    const fnRegex = /^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;

    lines.forEach((line, i) => {
      let m;
      while ((m = importRegex.exec(line)) !== null) {
        symbols.imports.push({ name: m[2], source: m[1] || m[2], line: i + 1 });
      }
      while ((m = classRegex.exec(line)) !== null) {
        symbols.classes.push({ name: m[1], extends: m[2], line: i + 1 });
      }
      while ((m = fnRegex.exec(line)) !== null) {
        symbols.functions.push({ name: m[1], params: m[2], line: i + 1 });
      }
    });
  } else {
    // Generic fallback (C, Java, Go, etc.)
    const classRegex = /(?:class|struct)\s+([a-zA-Z0-9_]+)/g;
    const fnRegex = /(?:[a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:\{|:)/g;

    lines.forEach((line, i) => {
      let m;
      while ((m = classRegex.exec(line)) !== null) {
        symbols.classes.push({ name: m[1], extends: null, line: i + 1 });
      }
      while ((m = fnRegex.exec(line)) !== null) {
        symbols.functions.push({ name: m[1], params: m[2], line: i + 1 });
      }
    });
  }

  file.symbols = symbols;
  return symbols;
}

export function parseAllFiles(files) {
  for (const file of files) {
    parseFile(file);
  }
}
