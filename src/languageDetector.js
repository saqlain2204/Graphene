// ─── LANGUAGE DEFINITIONS ───────────────────────────────────────────
// Grayscale shades for nodes; lighter = more common/prominent language
export const LANGUAGES = {
  // Web
  '.js':    { name: 'JavaScript',  shade: '#e0e0e0', shape: 'circle' },
  '.jsx':   { name: 'JavaScript',  shade: '#e0e0e0', shape: 'circle' },
  '.mjs':   { name: 'JavaScript',  shade: '#e0e0e0', shape: 'circle' },
  '.ts':    { name: 'TypeScript',  shade: '#c8c8c8', shape: 'circle' },
  '.tsx':   { name: 'TypeScript',  shade: '#c8c8c8', shape: 'circle' },
  '.html':  { name: 'HTML',        shade: '#b0b0b0', shape: 'circle' },
  '.htm':   { name: 'HTML',        shade: '#b0b0b0', shape: 'circle' },
  '.css':   { name: 'CSS',         shade: '#989898', shape: 'circle' },
  '.scss':  { name: 'SCSS',        shade: '#989898', shape: 'circle' },
  '.sass':  { name: 'SCSS',        shade: '#989898', shape: 'circle' },
  '.less':  { name: 'Less',        shade: '#989898', shape: 'circle' },
  // Systems
  '.py':    { name: 'Python',      shade: '#d8d8d8', shape: 'circle' },
  '.pyw':   { name: 'Python',      shade: '#d8d8d8', shape: 'circle' },
  '.java':  { name: 'Java',        shade: '#b8b8b8', shape: 'circle' },
  '.cpp':   { name: 'C++',         shade: '#a0a0a0', shape: 'circle' },
  '.cc':    { name: 'C++',         shade: '#a0a0a0', shape: 'circle' },
  '.cxx':   { name: 'C++',         shade: '#a0a0a0', shape: 'circle' },
  '.hpp':   { name: 'C++',         shade: '#a0a0a0', shape: 'circle' },
  '.c':     { name: 'C',           shade: '#909090', shape: 'circle' },
  '.h':     { name: 'C/C++ Header',shade: '#808080', shape: 'circle' },
  '.go':    { name: 'Go',          shade: '#d0d0d0', shape: 'circle' },
  '.rs':    { name: 'Rust',        shade: '#c0c0c0', shape: 'circle' },
  '.rb':    { name: 'Ruby',        shade: '#a8a8a8', shape: 'circle' },
  '.php':   { name: 'PHP',         shade: '#b8b8b8', shape: 'circle' },
  '.cs':    { name: 'C#',          shade: '#c0c0c0', shape: 'circle' },
  '.swift': { name: 'Swift',       shade: '#d0d0d0', shape: 'circle' },
  '.kt':    { name: 'Kotlin',      shade: '#b0b0b0', shape: 'circle' },
  '.kts':   { name: 'Kotlin',      shade: '#b0b0b0', shape: 'circle' },
  // Data / Config
  '.json':  { name: 'JSON',        shade: '#606060', shape: 'circle' },
  '.yaml':  { name: 'YAML',        shade: '#585858', shape: 'circle' },
  '.yml':   { name: 'YAML',        shade: '#585858', shape: 'circle' },
  '.toml':  { name: 'TOML',        shade: '#585858', shape: 'circle' },
  '.xml':   { name: 'XML',         shade: '#606060', shape: 'circle' },
  '.env':   { name: 'Env',         shade: '#484848', shape: 'circle' },
  // Docs / Script
  '.md':    { name: 'Markdown',    shade: '#686868', shape: 'circle' },
  '.mdx':   { name: 'Markdown',    shade: '#686868', shape: 'circle' },
  '.sql':   { name: 'SQL',         shade: '#707070', shape: 'circle' },
  '.sh':    { name: 'Shell',       shade: '#787878', shape: 'circle' },
  '.bash':  { name: 'Shell',       shade: '#787878', shape: 'circle' },
  '.zsh':   { name: 'Shell',       shade: '#787878', shape: 'circle' },
  '.ps1':   { name: 'PowerShell',  shade: '#707070', shape: 'circle' },
  '.lua':   { name: 'Lua',         shade: '#989898', shape: 'circle' },
  '.r':     { name: 'R',           shade: '#808080', shape: 'circle' },
};

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '__pycache__', 'dist', 'build',
  '.next', 'venv', '.venv', 'env', 'target', 'out',
  '.svelte-kit', '.nuxt', 'coverage', '.nyc_output',
  '__mocks__', 'vendor', '.cache',
]);

export const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.mp4', '.mp3', '.wav', '.ogg', '.avi', '.mov',
  '.ttf', '.woff', '.woff2', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.pyc',
  '.lock', '.sum', '.mod',
]);

export function detectLanguage(filename) {
  const ext = ('.' + filename.split('.').pop()).toLowerCase();
  return LANGUAGES[ext] || { name: 'Other', shade: '#3a3a3a', shape: 'circle' };
}

export function getUniqueLanguages(files) {
  const map = new Map();
  for (const f of files) {
    const lang = f.language;
    if (!map.has(lang)) map.set(lang, { name: lang, shade: f.shade, count: 0 });
    map.get(lang).count++;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
