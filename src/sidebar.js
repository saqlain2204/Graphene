export class Sidebar {
  constructor(treeElId, langElId) {
    this.treeEl = document.getElementById(treeElId);
    this.langEl = document.getElementById(langElId);
    this._allFiles = [];
    this._selectedIndex = -1;
    this._visibleFiles = [];
  }

  render(files, languages) {
    this._allFiles = files;
    this.renderTree(files);
    this.renderLanguages(languages);
  }

  renderTree(files) {
    this.treeEl.innerHTML = '';
    // Build tree structure
    const root = {};
    files.forEach(f => {
      const parts = f.path.split('/');
      let curr = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!curr[p]) curr[p] = {};
        curr = curr[p];
      }
      curr[parts[parts.length - 1]] = f;
    });

    const buildHTML = (node, depth = 0) => {
      let html = '';
      // Sort: directories first, then files alphabetically
      const entries = Object.entries(node).sort(([ka, va], [kb, vb]) => {
        const aIsFile = !!va.id, bIsFile = !!vb.id;
        if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
        return ka.localeCompare(kb);
      });
      for (const [key, val] of entries) {
        // Base: 20px left gutter + 14px per depth level
        const basePad = 20 + depth * 14;
        if (val.id) { // is file
          html += `<div class="tree-file" data-id="${val.id}" style="padding-left:${basePad}px">
            <span class="tree-icon" style="opacity:.6">▸</span> <span class="tree-name">${key}</span>
          </div>`;
        } else { // is dir
          html += `<div class="tree-dir" style="padding-left:${basePad}px">
            <span class="tree-icon">▾</span> <span class="tree-name">${key}/</span>
          </div>
          <div class="tree-children" style="display:none">${buildHTML(val, depth + 1)}</div>`;
        }
      }
      return html;
    };

    this.treeEl.innerHTML = buildHTML(root);

    // Event listeners
    this.treeEl.addEventListener('click', e => {
      const dir = e.target.closest('.tree-dir');
      if (dir) {
        const children = dir.nextElementSibling;
        children.style.display = children.style.display === 'none' ? 'block' : 'none';
        const icon = dir.querySelector('.tree-icon');
        if (icon) icon.textContent = children.style.display === 'none' ? '▾' : '▾';
        return;
      }

      const file = e.target.closest('.tree-file');
      if (file) {
        this.treeEl.querySelectorAll('.tree-file').forEach(el => el.classList.remove('active'));
        file.classList.add('active');
        if (this.onFileSelect) this.onFileSelect(file.dataset.id);
      }
    });
  }

  renderLanguages(languages) {
    this.langEl.innerHTML = languages.map(l => `
      <label class="lang-item" data-lang="${l.name}">
        <input type="checkbox" class="lang-checkbox" checked style="margin-right: 6px;">
        <div class="lang-dot" style="background-color: ${l.shade}; border-color: ${l.shade}"></div>
        <span>${l.name}</span>
        <span class="lang-count">${l.count}</span>
      </label>
    `).join('');
  }

  setupSearch(onSearchCallback) {
    const input = document.getElementById('search-input');
    if (!input) return;

    const wrap = input.closest('.search-wrap');

    // Inject match count badge and clear button (only once)
    if (wrap && !wrap.querySelector('.search-count')) {
      const countEl = document.createElement('span');
      countEl.className = 'search-count';
      countEl.style.cssText = 'font-size:10px;color:var(--accent2);white-space:nowrap;flex-shrink:0;';

      const clearBtn = document.createElement('button');
      clearBtn.className = 'search-clear';
      clearBtn.innerHTML = '&times;';
      clearBtn.title = 'Clear (Esc)';
      clearBtn.style.cssText = [
        'background:none;border:none;color:var(--muted);cursor:pointer;',
        'font-size:14px;line-height:1;padding:0 2px;display:none;',
        'flex-shrink:0;transition:color .1s;'
      ].join('');
      clearBtn.addEventListener('mouseenter', () => clearBtn.style.color = 'var(--text)');
      clearBtn.addEventListener('mouseleave', () => clearBtn.style.color = 'var(--muted)');
      clearBtn.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
      });

      // Insert before the shortcut badge if it exists
      const shortcut = wrap.querySelector('.search-shortcut');
      if (shortcut) {
        wrap.insertBefore(countEl, shortcut);
        wrap.insertBefore(clearBtn, shortcut);
      } else {
        wrap.appendChild(countEl);
        wrap.appendChild(clearBtn);
      }
    }

    const doSearch = () => {
      const raw = input.value;
      const term = raw.toLowerCase().trim();
      const countEl = wrap?.querySelector('.search-count');
      const clearBtn = wrap?.querySelector('.search-clear');
      this._selectedIndex = -1;
      this._visibleFiles = [];

      // Reset all tree visibility
      this.treeEl.querySelectorAll('.tree-file').forEach(f => {
        f.style.display = 'flex';
        f.classList.remove('search-nav-active');
      });
      this.treeEl.querySelectorAll('.tree-dir').forEach(d => d.style.display = 'flex');
      this.treeEl.querySelectorAll('.tree-children').forEach(c => {
        c.style.display = term ? 'block' : 'none';
      });
      // Remove all highlights
      this.treeEl.querySelectorAll('.tree-name mark').forEach(m => {
        const p = m.parentElement;
        if (p) p.textContent = p.textContent;
      });

      if (term) {
        let matchCount = 0;

        this.treeEl.querySelectorAll('.tree-file').forEach(file => {
          const nameEl = file.querySelector('.tree-name');
          const original = nameEl.textContent;
          const lower = original.toLowerCase();
          const idx = lower.indexOf(term);
          const matches = idx >= 0;

          file.style.display = matches ? 'flex' : 'none';

          if (matches) {
            matchCount++;
            this._visibleFiles.push(file);
            // Highlight the matched portion
            nameEl.innerHTML =
              escapeHTML(original.slice(0, idx)) +
              `<mark style="background:rgba(167,139,250,.35);color:var(--accent2);border-radius:2px;padding:0 1px">${escapeHTML(original.slice(idx, idx + term.length))}</mark>` +
              escapeHTML(original.slice(idx + term.length));

            // Ensure parent dirs are visible
            let parent = file.closest('.tree-children');
            while (parent) {
              parent.style.display = 'block';
              parent = parent.parentElement?.closest('.tree-children');
            }
          }
        });

        // Hide dirs with no visible children
        this.treeEl.querySelectorAll('.tree-dir').forEach(dir => {
          const children = dir.nextElementSibling;
          if (children?.classList.contains('tree-children')) {
            const hasVisible = Array.from(children.querySelectorAll('.tree-file')).some(f => f.style.display !== 'none');
            dir.style.display = hasVisible ? 'flex' : 'none';
          }
        });

        if (countEl) countEl.textContent = matchCount > 0 ? `${matchCount}` : '0';
        if (clearBtn) clearBtn.style.display = 'inline';

        // Auto-highlight first result
        if (this._visibleFiles.length > 0) {
          this._selectedIndex = 0;
          this._visibleFiles[0].classList.add('search-nav-active');
          this._visibleFiles[0].scrollIntoView({ block: 'nearest' });
        }
      } else {
        if (countEl) countEl.textContent = '';
        if (clearBtn) clearBtn.style.display = 'none';
      }

      if (onSearchCallback) onSearchCallback(term);
    };

    input.addEventListener('input', doSearch);

    // VS Code-like keyboard navigation
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (this._visibleFiles.length === 0) return;

        // Remove current highlight
        this._visibleFiles.forEach(f => f.classList.remove('search-nav-active'));

        if (e.key === 'ArrowDown') {
          this._selectedIndex = Math.min(this._selectedIndex + 1, this._visibleFiles.length - 1);
        } else {
          this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
        }

        const sel = this._visibleFiles[this._selectedIndex];
        if (sel) {
          sel.classList.add('search-nav-active');
          sel.scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = this._visibleFiles[this._selectedIndex];
        if (sel && this.onFileSelect) {
          this.treeEl.querySelectorAll('.tree-file').forEach(el => el.classList.remove('active'));
          sel.classList.add('active');
          this.onFileSelect(sel.dataset.id);
        }
      } else if (e.key === 'Escape') {
        input.value = '';
        doSearch();
        input.blur();
      }
    });
  }
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
