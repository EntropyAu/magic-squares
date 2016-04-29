class MagicSquareAnnealer {
  constructor(n) {

    d3.select(".magic-square-container").selectAll("*").remove();
    this.svg = d3.select(".magic-square-container")
                 .append("svg")
                 .attr("width", 500)
                 .attr("height", 500)
                 .attr("preserveaspectratio", "none")
                 .attr("viewBox", `-1 -1 ${n + 1} ${n + 1}`)

    this.n = n;
    this.cells = [];
    this.error = null;
    this.frame = 0;
    this.temperature = 1;
    this.coolingFraction = 0.99;
    this.boltzmannsConstant = 0.01;
    this.iterationsPerTick = 1000;
    this.iterationsWithoutImprovement = 0;
    this.maxIterationsWithoutImprovement = 500 * n * n;
    this.mutationCount = 0;

    for (let i = 0; i < this.n * this.n; i++) this.cells.push(i + 1);
  }

  anneal() {
    this.error = this.error || this.calculateError(this.cells);

    this.temperature *= this.coolingFraction;

    for (let i = 0; i < this.iterationsPerTick; i++) {
      let mutation = this.mutate(this.cells);
      this.mutationCount++;
      let mutationError = this.calculateError(mutation);
      let mutateAnyway = Math.exp((this.error.total - mutationError.total) /
                         (this.boltzmannsConstant * this.temperature)) > Math.random();
      if (mutationError < this.error.total || mutateAnyway) {
        this.cells = mutation;
        this.error = mutationError;
        if (mutationError.total < this.error.total) this.iterationsWithoutImprovement = 0;
      } else {
        this.iterationsWithoutImprovement++;
        if (this.iterationsWithoutImprovement > this.maxIterationsWithoutImprovement) {
          this.reheat();
          this.iterationsWithoutImprovement = 0;
        }
      }
      if (mutationError.total === 0) break;
    }
  }

  mutate(solution) {
    const mutated = [].concat(solution);
    const randN = () => Math.floor(Math.random() * this.n);
    const c1 = randN(),
          c2 = randN(),
          r1 = randN(),
          r2 = randN();
    mutated[r1 * this.n + c1] = solution[r2 * this.n + c2];
    mutated[r2 * this.n + c2] = solution[r1 * this.n + c1];
    return mutated;
  }

  reheat() {
    for (let i = 0; i < this.n / 2; i++) {
      this.cells = this.mutate(this.cells);
    }
    this.temperature = 1;
    this.error = this.calculateError(this.cells);
  }

  calculateM(n) {
    return n * (n * n + 1) / 2;
  }

  calculateError(solution) {
    let m = this.calculateM(this.n);
    let cols = Array(this.n).fill(0);
    let rows = Array(this.n).fill(0);
    let diagSE = 0;
    let diagNE = 0;
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        cols[i] += solution[j * this.n + i];
        rows[j] += solution[j * this.n + i];
      }
      diagSE += solution[i * (this.n + 1)];
      diagNE += solution[(this.n - i - 1) * this.n + i];
    }
    for (let i = 0; i < this.n; i++) {
      cols[i] = Math.abs(cols[i] - m);
      rows[i] = Math.abs(rows[i] - m);
    }
    diagSE = Math.abs(diagSE - m);
    diagNE = Math.abs(diagNE - m);

    let total = diagSE + diagNE;
    for (let i = 0; i < this.n; i++) {
      total += cols[i] + rows[i];
    }
    return { cols, rows, diagSE, diagNE, total }
  }

  render() {
    const numbers = this.svg.selectAll('text').data(this.cells, (d, i) => d)
    numbers.enter()
           .append("text")
           .style("text-anchor", "middle")
           .style("font-family", "Arial")
           .style("font-size", 0.3)
           .text((d, i) => d)
           .attr("y", 0.12)
           .attr("transform", (d, i) => `translate(${i % this.n}, ${Math.floor(i / this.n)})`);
    numbers.transition()
           .duration(300)
           .attr("transform", (d, i) => `translate(${i % this.n}, ${Math.floor(i / this.n)})`);

    const rows = this.svg.selectAll('.error-path.row').data(Array(this.n));
    rows.enter()
        .append("path")
        .classed("error-path", true)
        .classed("row", true)
        .attr("d", (d, i) => `M0,${i} L${this.n - 1},${i}`)
    rows.style("stroke", (d, i) => this.error.rows[i] > 0 ? "#FF0000" : "#66FF66")

    const cols = this.svg.selectAll('.error-path.col').data(Array(this.n));
    cols.enter()
        .append("path")
        .classed("error-path", true)
        .classed("col", true)
        .attr("d", (d, i) => `M${i},0 L${i},${this.n - 1}`)
    cols.style("stroke", (d, i) => this.error.cols[i] > 0 ? "#FF0000" : "#66FF66")

    const diagNE = this.svg.selectAll('.error-path.diagNE').data([this.n]);
    diagNE.enter()
          .append("path")
          .classed("error-path", true)
          .classed("diagNE", true)
          .attr("d", (d, i) => `M0,${d - 1} L${d - 1},0`)
    diagNE.style("stroke", (d, i) => this.error.diagNE > 0 ? "#FF0000" : "#66FF66")

    const diagSE = this.svg.selectAll('.error-path.diagSE').data([this.n]);
    diagSE.enter()
          .append("path")
          .classed("error-path", true)
          .classed("diagSE", true)
          .attr("d", (d, i) => `M0,0 L${d - 1},${d - 1}`)
    diagSE.style("stroke", (d, i) => this.error.diagSE > 0 ? "#FF0000" : "#66FF66")



    d3.select("#error-total-value").text(this.error.total);
    d3.select("#mutation-count-value").text(this.mutationCount);
  }

  tick() {
    this.frame++;
    this.anneal();
    if (this.frame % 20 === 0) {
      this.render();
    }
    if (this.error.total > 0) {
      requestAnimationFrame(this.tick.bind(this));
    } else {
      this.render();
    }
  }
}
