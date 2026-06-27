import { walkDirectory, walkFromInput } from './fileWalker.js';
import { getUniqueLanguages } from './languageDetector.js';
import { parseAllFiles } from './parsers/index.js';
import { resolveDependencies } from './dependencyResolver.js';
import { buildGraph } from './graphBuilder.js';
import { GraphRenderer } from './graphRenderer.js';
import { Sidebar } from './sidebar.js';
import { DetailPanel } from './detailPanel.js';

let graphRenderer = null;
let detailPanel = null;
let sidebar = null;

let state = {
  files: [],
  edges: [],
  nodes: []
};

async function init() {
  sidebar = new Sidebar('file-tree', 'lang-filter');

  detailPanel = new DetailPanel('detail-panel', () => {
    d3.selectAll('.node').classed('selected', false);
    sidebar.treeEl.querySelectorAll('.tree-file').forEach(el => el.classList.remove('active'));
    if (graphRenderer) graphRenderer.handleMouseOut();
  });

  graphRenderer = new GraphRenderer('#graph-svg', (nodeData) => {
    d3.selectAll('.node').classed('selected', n => n.id === nodeData.id);
    detailPanel.open(nodeData, state.edges);

    sidebar.treeEl.querySelectorAll('.tree-file').forEach(el => el.classList.remove('active'));
    const fileEl = sidebar.treeEl.querySelector(`.tree-file[data-id="${CSS.escape(nodeData.id)}"]`);
    if (fileEl) {
      fileEl.classList.add('active');
      fileEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  sidebar.onFileSelect = (fileId) => {
    const nodeData = state.nodes.find(n => n.id === fileId);
    if (nodeData) {
      d3.selectAll('.node').classed('selected', n => n.id === nodeData.id);
      graphRenderer.handleMouseOver(nodeData);
      detailPanel.open(nodeData, state.edges);

      const transform = d3.zoomIdentity
        .translate(graphRenderer.width / 2, graphRenderer.height / 2)
        .scale(1.5)
        .translate(-nodeData.x, -nodeData.y);
      graphRenderer.svg.transition().duration(500).call(graphRenderer.zoom.transform, transform);
    }
  };

  setupUploadHandlers();
  setupToolbar();
  setupFilters();
  setupUIInteractions();
}

function setupFilters() {
  const updateGraph = () => {
    const types = [];
    if (document.getElementById('toggle-imports').checked) types.push('imports');
    if (document.getElementById('toggle-extends').checked) types.push('extends');
    if (document.getElementById('toggle-calls').checked) types.push('calls');

    const activeLangs = Array.from(document.querySelectorAll('.lang-checkbox'))
      .filter(cb => cb.checked)
      .map(cb => cb.closest('.lang-item').dataset.lang);

    if (graphRenderer) graphRenderer.setFilters(types, activeLangs);
  };

  document.getElementById('toggle-imports').addEventListener('change', updateGraph);
  document.getElementById('toggle-extends').addEventListener('change', updateGraph);
  document.getElementById('toggle-calls').addEventListener('change', updateGraph);

  document.getElementById('lang-filter').addEventListener('change', (e) => {
    if (e.target.classList.contains('lang-checkbox')) updateGraph();
  });
}

function setupUploadHandlers() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('folder-input');

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

  dropZone.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const item = e.dataTransfer.items[0];
    if (item && item.getAsFileSystemHandle) {
      const handle = await item.getAsFileSystemHandle();
      if (handle && handle.kind === 'directory') {
        startProcessing(handle);
        return;
      }
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) startProcessingFallback(files);
  });

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) startProcessingFallback(e.target.files);
  });
}

async function startProcessing(dirHandle) {
  showLoading();
  const files = await walkDirectory(dirHandle, (c, n) => setStage(1, `Read ${c} files`));
  await processFiles(files);
}

async function startProcessingFallback(fileList) {
  showLoading();
  const files = await walkFromInput(fileList, (c, n) => setStage(1, `Read ${c} files`));
  await processFiles(files);
}

async function processFiles(files) {
  state.files = files;

  setStage(2, 'Detecting languages');
  const languages = getUniqueLanguages(files);
  sidebar.renderLanguages(languages);

  setStage(3, 'Extracting symbols');
  parseAllFiles(files);

  setStage(4, 'Resolving dependencies');
  state.edges = resolveDependencies(files);

  setStage(5, 'Building graph');
  const graph = buildGraph(files, state.edges);
  state.nodes = graph.nodes;

  sidebar.renderTree(files);
  graphRenderer.render(state.nodes, state.edges);

  // Wire up search now that tree is populated
  sidebar.setupSearch((term) => {
    if (term.length < 2) return;
    // Highlight matching nodes on graph
    if (graphRenderer && graphRenderer.node) {
      graphRenderer.node.classed('faded', d => !d.label.toLowerCase().includes(term));
    }
  });

  // Ctrl+F focuses search (VS Code style)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    if (e.key === 'Escape') {
      const inp = document.getElementById('search-input');
      if (document.activeElement === inp) {
        inp.value = '';
        inp.dispatchEvent(new Event('input'));
        inp.blur();
        if (graphRenderer && graphRenderer.node) graphRenderer.node.classed('faded', false);
      }
    }
  }, { once: false });

  updateStats();
  hideLoading();
}

function showLoading() {
  document.getElementById('upload-overlay').style.display = 'none';
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('header-stats').classList.add('visible');
}

function setStage(num, msg) {
  const c = document.getElementById('loading-stages');
  if (!c.querySelector(`#s${num}`)) {
    const el = document.createElement('div');
    el.id = `s${num}`;
    el.className = 'load-stage active';
    el.innerText = `[Stage ${num}] ${msg}`;
    c.appendChild(el);
  } else {
    c.querySelector(`#s${num}`).innerText = `[Stage ${num}] ${msg}`;
  }
}

function updateStats() {
  document.getElementById('stat-files').innerText = `${state.files.length} files`;
  document.getElementById('stat-edges').innerText = `${state.edges.length} edges`;
  document.getElementById('stat-langs').innerText = `${getUniqueLanguages(state.files).length} languages`;
}

function setupToolbar() {
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    graphRenderer.svg.transition().call(graphRenderer.zoom.scaleBy, 1.3);
  });
  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    graphRenderer.svg.transition().call(graphRenderer.zoom.scaleBy, 0.7);
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    graphRenderer.svg.transition().call(graphRenderer.zoom.transform, d3.zoomIdentity);
  });
}

function setupUIInteractions() {
  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'node-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: rgba(20, 20, 30, 0.92);
    color: #fff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-family: monospace;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.1);
    z-index: 9999;
    max-width: 320px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  document.body.appendChild(tooltip);

  // Hook into graphRenderer mouse events
  const originalMouseOver = graphRenderer.handleMouseOver.bind(graphRenderer);
  const originalMouseOut = graphRenderer.handleMouseOut.bind(graphRenderer);

  graphRenderer.handleMouseOver = (d) => {
    originalMouseOver(d);
    tooltip.textContent = d.fullPath || d.label;
    tooltip.style.opacity = '1';
  };

  graphRenderer.handleMouseOut = (d) => {
    originalMouseOut(d);
    tooltip.style.opacity = '0';
  };

  // Collapsible sidebar/panel sections
  document.querySelectorAll('.sb-label, .panel-section-label').forEach(label => {
    label.addEventListener('click', (e) => {
      const parent = e.target.closest('.sb-section, .panel-section');
      if (parent) parent.classList.toggle('collapsed');
    });
  });
}

document.addEventListener('DOMContentLoaded', init);