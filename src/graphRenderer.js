export class GraphRenderer {
  constructor(svgElementId, onNodeClick) {
    this.svgId = svgElementId;
    this.svg = d3.select(svgElementId);
    this.width = this.svg.node().clientWidth || 800;
    this.height = this.svg.node().clientHeight || 600;
    this.onNodeClick = onNodeClick;

    this.zoom = d3.zoom().scaleExtent([0.1, 5]).on('zoom', (e) => this.zoomed(e));
    this.svg.call(this.zoom);

    this.g = this.svg.select('#graph-root');
    this.edgesLayer = this.svg.select('#edges-layer');
    this.nodesLayer = this.svg.select('#nodes-layer');
    this.labelsLayer = this.svg.select('#labels-layer');

    // Track bidirectional edge pairs
    this.biDirPairs = new Set();
  }

  render(nodesData, edgesData) {
    this.nodes = nodesData;
    this.edges = edgesData;

    // Detect bidirectional pairs: if A→B and B→A both exist, mark them
    this.biDirPairs = new Set();
    const edgeIndex = new Set(edgesData.map(e => `${e.source?.id || e.source}__${e.target?.id || e.target}`));
    edgesData.forEach(e => {
      const src = e.source?.id || e.source;
      const tgt = e.target?.id || e.target;
      if (edgeIndex.has(`${tgt}__${src}`)) {
        // Store both directions as a canonical sorted key
        this.biDirPairs.add([src, tgt].sort().join('__'));
      }
    });

    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.edges)
        .id(d => d.id)
        .distance(d => 220 / Math.max(0.4, d.weight))   // much more spacing
        .strength(0.12))                                   // looser links
      .force('charge', d3.forceManyBody()
        .strength(-1200)                                   // strong repulsion
        .distanceMax(900))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => d.size + 50)                         // wide personal space
        .iterations(5))
      .force('x', d3.forceX(this.width / 2).strength(0.03))
      .force('y', d3.forceY(this.height / 2).strength(0.03))
      .alphaDecay(0.012)                                   // longer settle time
      .on('tick', () => this.ticked());

    // Edges
    this.link = this.edgesLayer.selectAll('.edge')
      .data(this.edges)
      .join('path')
      .attr('class', d => `edge edge-${d.type}`)
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Nodes
    this.node = this.nodesLayer.selectAll('.node')
      .data(this.nodes, d => d.id)
      .join('g')
      .attr('class', 'node')
      .call(this.drag(this.simulation))
      .on('click', (e, d) => this.onNodeClick(d))
      .on('mouseover', (e, d) => this.handleMouseOver(d))
      .on('mouseout', (e, d) => this.handleMouseOut(d));

    this.node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.shade)
      .attr('stroke', d => d.isEntry ? '#ffd700' : '#ffffff')
      .attr('stroke-width', d => d.isEntry ? 3 : 1.5)
      .attr('opacity', 1);
  }

  isBiDirectional(d) {
    const src = d.source?.id || d.source;
    const tgt = d.target?.id || d.target;
    return this.biDirPairs.has([src, tgt].sort().join('__'));
  }

  setFilters(types, activeLangs) {
    this.node.style('display', d => activeLangs.includes(d.language) ? 'inline' : 'none');
    this.link.style('display', d => {
      if (!activeLangs.includes(d.source.language) || !activeLangs.includes(d.target.language)) return 'none';
      return types.includes(d.type) ? 'inline' : 'none';
    });
  }

  ticked() {
    this.link.attr('d', d => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance === 0) return '';

      const targetRadius = d.target.size + 6;
      const sourceRadius = d.source.size + 1;

      const targetX = d.target.x - (dx * targetRadius) / distance;
      const targetY = d.target.y - (dy * targetRadius) / distance;
      const sourceX = d.source.x + (dx * sourceRadius) / distance;
      const sourceY = d.source.y + (dy * sourceRadius) / distance;

      // Curve only bidirectional edges, keep everything else straight
      if (this.isBiDirectional(d)) {
        const curvature = 0.3;
        // Perpendicular offset so A→B and B→A arc on opposite sides
        const mx = (sourceX + targetX) / 2 - (dy * curvature);
        const my = (sourceY + targetY) / 2 + (dx * curvature);
        return `M${sourceX},${sourceY} Q${mx},${my} ${targetX},${targetY}`;
      }

      return `M${sourceX},${sourceY}L${targetX},${targetY}`;
    });

    this.node.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  zoomed(event) {
    this.g.attr('transform', event.transform);
  }

  drag(simulation) {
    return d3.drag()
      .on('start', (e, d) => {
        if (!e.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => {
        if (!e.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
  }

  handleMouseOver(d) {
    const neighbors = new Set([d.id]);
    this.link.classed('faded', true).classed('highlighted', false);
    this.node.classed('faded', true);

    this.link.filter(l => l.source.id === d.id || l.target.id === d.id)
      .classed('faded', false)
      .classed('highlighted', true)
      .each(l => {
        neighbors.add(l.source.id);
        neighbors.add(l.target.id);
      });

    this.node.filter(n => neighbors.has(n.id))
      .classed('faded', false);
  }

  handleMouseOut(d) {
    this.link.classed('faded', false).classed('highlighted', false);
    this.node.classed('faded', false);
  }
}