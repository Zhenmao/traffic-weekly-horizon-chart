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
		.sort((a, b) => b.sum - a.sum);

	console.log(data);

	////////////////////////////////////////////////////////////
	//// Setup /////////////////////////////////////////////////
	////////////////////////////////////////////////////////////
	const svg = d3.select(".chart");
	const margin = { top: 10, right: 10, bottom: 30, left: 120 };
	const svgWidth = svg.node().clientWidth;
	const step = 30;
});
