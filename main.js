d3.csv("traffic_weekly.csv").then(csv => {
	////////////////////////////////////////////////////////////
	//// Process Data //////////////////////////////////////////
	////////////////////////////////////////////////////////////
	const csvTransformed = csv.map(d => ({
		name: d.name,
		date: d.date * 1000,
		value: +d.total_1 + +d.total_2
	}));

	const data = d3
		.nest()
		.key(d => d.name)
		.sortValues((a, b) => a.date - b.date)
		.entries(csvTransformed)
		.map(d => ((d.sum = d3.sum(d.values, d => d.value)), d))
		.sort((a, b) => a.sum - b.sum);

	////////////////////////////////////////////////////////////
	//// Setup /////////////////////////////////////////////////
	////////////////////////////////////////////////////////////
	const svg = d3.select(".chart");
	const scheme = "schemeOrRd";
	const overlap = 5;
	const step = 15;
	const margin = {
		top: 0,
		right: 16,
		bottom: 32,
		left: 112
	};
	const svgWidth = svg.node().clientWidth;
	const width = svgWidth - margin.left - margin.right;
	const height = data.length * (step + 1);
	const svgHeight = height + margin.top + margin.bottom;

	// Scale
	const x = d3
		.scaleUtc()
		.domain([
			data[0].values[0].date,
			data[0].values[data[0].values.length - 1].date
		])
		.range([0, width]);

	const y = d3
		.scaleLinear()
		.domain([0, d3.max(data, d => d3.max(d.values, d => d.value))])
		.range([0, -overlap * step]);

	const color = i =>
		d3[scheme][Math.max(3, overlap)][i + Math.max(0, 3 - overlap)];

	// Axis
	const xAxis = g =>
		g
			.attr("transform", `translate(0,${height})`)
			.call(
				d3
					.axisBottom(x)
					.ticks(width / 80)
					.tickSizeOuter(0)
			)
			.call(g => g.select(".domain").remove());

	// Path generator
	const area = d3
		.area()
		.curve(d3.curveBasis)
		.defined(d => !isNaN(d.value))
		.x(d => x(d.date))
		.y0(0)
		.y1(d => y(d.value));

	const line = area.lineY1();

	// Containers
	svg.attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
	const g = svg
		.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`);

	const gBackLayer = g.append("g");
	const gFrontLayer = g.append("g");

	////////////////////////////////////////////////////////////
	//// Render Static /////////////////////////////////////////
	////////////////////////////////////////////////////////////
	// Render axis
	gFrontLayer.append("g").call(xAxis);

	gFrontLayer
		.append("g")
		.selectAll("text")
		.data(data)
		.join("text")
		.attr("x", -4)
		.attr("y", (d, i) => `${i * (step + 1) + step / 2}`)
		.attr("dy", "0.35em")
		.attr("text-anchor", "end")
		.text(d => d.key);

	////////////////////////////////////////////////////////////
	//// Render ////////////////////////////////////////////////
	////////////////////////////////////////////////////////////
	gBackLayer
		.append("defs")
		.append("rect")
		.attr("width", width)
		.attr("height", step)
		.attr("id", "clip");

	const group = gBackLayer
		.append("g")
		.selectAll("g")
		.data(data)
		.join("g")
		.attr("transform", (d, i) => `translate(0,${(i + 1) * (step + 1)})`);

	const defs = group.append("defs").each((d, i) => (d.clip = `clip-${i}`));

	const clipPathRect = defs
		.selectAll("clipPath")
		.data(d => new Array(overlap).fill(d))
		.join("clipPath")
		.attr("id", (d, i) => `${d.clip}-${i}`)
		.append("use")
		.attr("xlink:href", d => `#clip`)
		.attr("transform", (d, i) => `translate(0,${-step * (i + 1)})`);

	defs
		.append("path")
		.attr("id", (d, i) => (d.path = `path-${i}`))
		.attr("d", d => area(d.values));

	// Ridgeline plot area
	const ridgeArea = group
		.append("use")
		.attr("fill", "#fff")
		.attr("xlink:href", d => `#${d.path}`);

	// Horizon plot
	const horizonGroup = group.append("g");

	const horizonBand = horizonGroup
		.selectAll("g")
		.data(d => new Array(overlap).fill(d))
		.join("g")
		.attr("clip-path", (d, i) => `url(#${d.clip}-${i})`);

	const horizonBandPath = horizonBand
		.append("use")
		.attr("fill", (d, i) => color(i))
		.attr("fill-opacity", 0)
		.attr("xlink:href", d => `#${d.path}`);

	// Ridgeline plot area
	const ridgeLine = group
		.append("path")
		.attr("fill", "none")
		.attr("stroke", "black")
		.attr("d", d => line(d.values))
		.each(function(d) {
			d.totalLength = this.getTotalLength();
		})
		.attr("stroke-dasharray", d => d.totalLength);

	////////////////////////////////////////////////////////////
	//// Animation /////////////////////////////////////////////
	////////////////////////////////////////////////////////////
	// Show band
	horizonBandPath
		.transition()
		.duration(2000)
		.attr("fill-opacity", 1)
		.end()
		.then(() => {
			// Hide ridegplot
			ridgeLine
				.transition()
				.duration(2000)
				.delay(1000)
				.ease(d3.easeLinear)
				.attr("stroke-dashoffset", d => -d.totalLength)
				.remove()
				.end()
				.then(() => {
					ridgeArea.remove();
					// Adjust horizon
					clipPathRect
						.transition()
						.duration(2000)
						.attr("transform", (d, i) => `translate(0,${-step})`);
					horizonBandPath
						.transition()
						.duration(2000)
						.attr("transform", (d, i) => `translate(0,${i * step})`);
				});
		});
});
