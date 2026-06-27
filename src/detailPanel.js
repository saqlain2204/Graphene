export class DetailPanel {
  constructor(panelId, onClose) {
    this.panel = document.getElementById(panelId);
    this.closeBtn = document.getElementById('panel-close');
    this.closeBtn.addEventListener('click', () => this.close());
    this.onClose = onClose;
  }

  open(node, edges) {
    this.panel.classList.add('panel-open');
    this.panel.classList.remove('panel-closed');
    this.render(node, edges);
  }

  close() {
    this.panel.classList.remove('panel-open');
    this.panel.classList.add('panel-closed');
    if (this.onClose) this.onClose();
  }

  render(node, allEdges) {
    document.getElementById('panel-filename').innerText = node.label;
    document.getElementById('panel-filepath').innerText = node.fullPath;
    document.getElementById('panel-badges').innerHTML = `
      <span class="badge badge-lang" style="border-color:${node.shade}">${node.language}</span>
      <span class="badge">${node.size.toFixed(0)} size</span>
    `;

    const sym = node.symbols;
    document.getElementById('panel-stats-row').innerHTML = `
      <div class="stat-cell"><span class="stat-cell-num">${sym.functions.length}</span>Funcs</div>
      <div class="stat-cell"><span class="stat-cell-num">${sym.classes.length}</span>Classes</div>
      <div class="stat-cell"><span class="stat-cell-num">${sym.imports.length}</span>Imports</div>
      <div class="stat-cell"><span class="stat-cell-num">${sym.exports.length}</span>Exports</div>
    `;

    // Code — reset hljs state so it re-highlights on every open
    const codeEl = document.getElementById('panel-code-content');
    codeEl.removeAttribute('data-highlighted'); // hljs v11+
    codeEl.classList.remove('hljs');            // fallback for older hljs
    codeEl.className = `language-${node.language.toLowerCase()}`;
    codeEl.textContent = node.content;
    if (window.hljs) hljs.highlightElement(codeEl);

    // Symbols List
    document.getElementById('panel-symbols').innerHTML = `
      ${this.renderSymbolGroup('Functions', sym.functions)}
      ${this.renderSymbolGroup('Classes', sym.classes)}
    `;

    // Connections
    const connectedEdges = allEdges.filter(e => e.source.id === node.id || e.target.id === node.id);
    document.getElementById('panel-connections').innerHTML = connectedEdges.map(e => {
      const isSrc = e.source.id === node.id;
      const other = isSrc ? e.target : e.source;
      const dir = isSrc ? '→' : '←';
      return `<div class="conn-item"><span class="conn-edge-type">${e.type}</span> ${dir} ${other.label}</div>`;
    }).join('');

    // Why connected
    document.getElementById('panel-why').innerHTML = connectedEdges.map(e => {
      let explanation = '';
      if (e.type === 'imports') {
        const symbol = (e.meta || '').replace('Imports ', '');
        explanation = `<code>${e.source.label}</code> imports <b>${symbol}</b> from <code>${e.target.label}</code>`;
      } else if (e.type === 'extends') {
        const parts = (e.meta || '').split(' extends ');
        const clsName = parts[0] ? parts[0].replace('Class ', '') : 'Class';
        const parentName = parts[1] || 'Parent';
        explanation = `<code>${e.source.label}</code> has class <b>${clsName}</b> which extends <b>${parentName}</b> from <code>${e.target.label}</code>`;
      } else if (e.type === 'calls') {
        const fnName = (e.meta || '').replace('Calls ', '');
        explanation = `<code>${e.source.label}</code> calls <b>${fnName}</b> defined in <code>${e.target.label}</code>`;
      } else {
        explanation = `<code>${e.source.label}</code> is connected to <code>${e.target.label}</code>`;
      }
      return `<div class="why-item">${explanation}</div>`;
    }).join('');
  }

  renderSymbolGroup(title, items) {
    if (!items || items.length === 0) return '';
    return `
      <div class="sym-group">
        <div class="sym-group-header" onclick="this.nextElementSibling.classList.toggle('expanded')">
          <span>${title}</span>
          <span class="sym-count">${items.length}</span>
        </div>
        <div class="sym-items expanded">
          ${items.map(i => `
            <div class="sym-item">
              <span class="sym-item-name">${i.name}</span>
              <span class="sym-item-line">L${i.line}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}