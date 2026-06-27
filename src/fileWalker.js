import { detectLanguage, SKIP_DIRS, SKIP_EXTENSIONS } from './languageDetector.js';

const MAX_FILE_SIZE = 500_000; // 500 KB

// ── Gitignore parser ─────────────────────────────────────────────────────────
// Returns an array of matcher functions. Each matcher(relPath, isDir) → bool.
// relPath must be relative to the directory containing the .gitignore,
// using forward slashes, with NO leading slash.
function parseGitignore(text) {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(pattern => {
      const dirOnly = pattern.endsWith('/');
      const raw = dirOnly ? pattern.slice(0, -1) : pattern;

      // A pattern is anchored (relative to .gitignore root) if it contains
      // a slash anywhere OTHER than a leading or trailing position.
      const anchored = raw.includes('/');

      // Convert glob syntax → RegExp body
      const body = raw
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials first
        .replace(/\*\*/g, '\x00')              // placeholder for **
        .replace(/\*/g, '[^/]*')               // * → anything except /
        .replace(/\?/g, '[^/]')                // ? → single non-/ char
        .replace(/\x00/g, '.*');               // ** → anything including /

      // anchored: must match from the start of the relative path
      // non-anchored: can match at any path segment boundary
      const prefix = anchored ? '^' : '(^|.*/)';

      // We append '/' to the test string (see isIgnored), so the suffix
      // just needs to accept a '/' after the matched portion.
      const re = new RegExp(prefix + body + '(/|$)');

      return (relPath, isDir) => {
        // dirOnly patterns only apply to directories (and to files inside them)
        // We still need to test files inside a dir-only pattern, so we check
        // whether the relPath *starts with* the pattern dir.
        const testStr = isDir ? relPath + '/' : relPath;
        if (dirOnly) {
          // match the dir itself OR anything inside it
          return re.test(testStr) || re.test(relPath + '/');
        }
        return re.test(testStr);
      };
    });
}

function isIgnored(matchers, relPath, isDir) {
  return matchers.some(m => m(relPath, isDir));
}

// ── Directory walk (File System Access API) ──────────────────────────────────
export async function walkDirectory(dirHandle, onProgress) {
  const files = [];
  const rootMatchers = await readGitignoreFromDir(dirHandle);
  await recurse(dirHandle, '', files, onProgress, rootMatchers);
  return files;
}

async function readGitignoreFromDir(dirHandle) {
  try {
    const h = await dirHandle.getFileHandle('.gitignore');
    const text = await (await h.getFile()).text();
    return parseGitignore(text);
  } catch (_) {
    return [];
  }
}

async function recurse(handle, path, files, onProgress, parentMatchers) {
  // Merge any .gitignore in this directory with the inherited matchers
  const localMatchers = await readGitignoreFromDir(handle);
  const matchers = [...parentMatchers, ...localMatchers];

  for await (const [name, entry] of handle.entries()) {
    const relPath = path ? `${path}/${name}` : name;

    if (entry.kind === 'directory') {
      if (SKIP_DIRS.has(name)) continue;
      if (isIgnored(matchers, relPath, true)) continue;
      await recurse(entry, relPath, files, onProgress, matchers);
    } else {
      if (name === '.gitignore') continue;

      const ext = '.' + name.split('.').pop().toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) continue;
      if (name.startsWith('.') && ext === '.' + name.slice(1)) continue;

      if (isIgnored(matchers, relPath, false)) continue;

      try {
        const file = await entry.getFile();
        if (file.size > MAX_FILE_SIZE) continue;

        const content = await file.text();
        const langInfo = detectLanguage(name);

        files.push({
          id: relPath,
          name,
          path: relPath,
          dir: path || '.',
          extension: ext,
          language: langInfo.name,
          shade: langInfo.shade,
          content,
          size: file.size,
          lineCount: content.split('\n').length,
          depth: relPath.split('/').length - 1,
        });

        if (onProgress) onProgress(files.length, name);
      } catch (_) { /* skip unreadable */ }
    }
  }
}

// ── Input fallback (webkitdirectory) ─────────────────────────────────────────
export async function walkFromInput(fileList, onProgress) {
  const files = [];

  // Pass 1: collect and parse every .gitignore, keyed by its directory path
  // (the full webkitRelativePath dir, e.g. "myproject/src")
  const gitignoreMap = {};
  for (const file of fileList) {
    if (file.name !== '.gitignore') continue;
    const dir = (file.webkitRelativePath || file.name)
      .split('/').slice(0, -1).join('/');
    try {
      gitignoreMap[dir] = parseGitignore(await file.text());
    } catch (_) { /* skip */ }
  }

  // Build matchers for a given repo-relative path by walking up the tree
  // and collecting all .gitignore files that govern it.
  // repoRelPath: path AFTER stripping the root folder name, e.g. "src/main.ts"
  // fullPathParts: the full split webkitRelativePath, e.g. ["myproject","src","main.ts"]
  function getMatchers(fullPathParts, repoRelPath) {
    const matchers = [];
    // root gitignore lives at fullPathParts[0] (the top folder)
    const rootDir = fullPathParts[0];
    if (gitignoreMap[rootDir]) matchers.push(...gitignoreMap[rootDir]);

    // nested gitignores: fullPathParts[0]/seg1, fullPathParts[0]/seg1/seg2 …
    const repoSegments = repoRelPath.split('/');
    for (let depth = 1; depth < repoSegments.length; depth++) {
      const dir = rootDir + '/' + repoSegments.slice(0, depth).join('/');
      if (gitignoreMap[dir]) matchers.push(...gitignoreMap[dir]);
    }
    return matchers;
  }

  // Pass 2: process source files
  for (const file of fileList) {
    if (file.name === '.gitignore') continue;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) continue;

    const parts = (file.webkitRelativePath || file.name).split('/');
    const name = parts[parts.length - 1];
    const path = file.webkitRelativePath || file.name;
    const dir = parts.slice(0, -1).join('/') || '.';

    if (parts.some(p => SKIP_DIRS.has(p))) continue;
    if (file.size > MAX_FILE_SIZE) continue;

    // repoRelPath: strip the leading project-root folder name
    const repoRelPath = parts.slice(1).join('/') || name;
    const matchers = getMatchers(parts, repoRelPath);
    if (isIgnored(matchers, repoRelPath, false)) continue;

    try {
      const content = await file.text();
      const langInfo = detectLanguage(name);
      files.push({
        id: path,
        name,
        path,
        dir,
        extension: ext,
        language: langInfo.name,
        shade: langInfo.shade,
        content,
        size: file.size,
        lineCount: content.split('\n').length,
        depth: parts.length - 2,
      });
      if (onProgress) onProgress(files.length, name);
    } catch (_) { /* skip */ }
  }

  return files;
}