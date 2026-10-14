
/* Margin and chart dimensions */

const margin = { top: 40, right: 40, bottom: 80, left: 70 };

const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const DATA_PATH = "./data/arrests_by_district.csv";
const YEAR_DATA_PATH = "./data/arrests_by_year_district.csv";

let arrestsByDistrict = [];
let arrestsByYearDistrict = [];
let filteredData = [];

let xScale, yScale;

// Create one SVG to display either chart
const svg = d3
  .select("#vis")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);


/* Display a message inside the chart */

function showMessage(msg) {
  svg.selectAll("*").remove();

  svg
    .append("text")
    .attr("class", "message")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .style("fill", "crimson")
    .text(msg);
}


/* Load the CSV files and initialize the visualization */

function init() {
  Promise.all([
    // Load total arrests by district
    d3.csv(DATA_PATH, (d) => ({
      district: String(d.district).trim(),
      arrests: +d.arrests
    })),

    // Load arrests by year and district
    d3.csv(YEAR_DATA_PATH, (d) => ({
      year: +d.year,
      district: String(d.district).trim(),
      arrests: +d.arrests
    }))
  ])
    .then(([districtData, yearlyData]) => {

      // Clean the total-arrests data
      const cleanedData = districtData.filter(
        (d) =>
          d.district !== "" &&
          Number.isFinite(d.arrests) &&
          d.arrests >= 0
      );

      // Combine duplicate rows for the same district
      const districtMap = new Map();

      cleanedData.forEach((d) => {
        districtMap.set(
          d.district,
          (districtMap.get(d.district) || 0) + d.arrests
        );
      });

      arrestsByDistrict = Array.from(
        districtMap,
        ([district, arrests]) => ({
          district,
          arrests
        })
      ).sort(
        (a, b) => Number(a.district) - Number(b.district)
      );

      // Clean and sort the yearly data
      arrestsByYearDistrict = yearlyData
        .filter(
          (d) =>
            d.district !== "" &&
            Number.isFinite(d.year) &&
            Number.isFinite(d.arrests) &&
            d.arrests >= 0
        )
        .sort(
          (a, b) =>
            Number(a.district) - Number(b.district) ||
            a.year - b.year
        );

      // Check that both files contain usable data
      if (arrestsByDistrict.length === 0) {
        throw new Error("No usable district data was found.");
      }

      if (arrestsByYearDistrict.length === 0) {
        throw new Error("No usable yearly data was found.");
      }

      // Minimum-arrests filter
      d3.select("#minArrests")
        .on("input", () => {
          showBarChart();
        });

      // Reset the minimum-arrests filter
      d3.select("#resetFilters")
        .on("click", () => {
          d3.select("#minArrests").property("value", 0);
          showBarChart();
        });

      // Return from the line graph to the bar chart
      d3.select("#backButton")
        .on("click", () => {
          showBarChart();
        });

      // Display the initial bar chart
      showBarChart();
    })
    .catch((error) => {
      console.error("CSV loading failed:", error);

    });
}


/* Display the bar chart */

function showBarChart() {
  // Hide the Back button
  d3.select("#backButton").style("display", "none");

  // Read the minimum-arrests filter
  const minArrests = Math.max(
    0,
    Number(d3.select("#minArrests").property("value")) || 0
  );

  // Filter districts by their total arrest counts
  filteredData = arrestsByDistrict.filter(
    (d) => d.arrests >= minArrests
  );

  // Update the status text
  d3.select("#filterStatus").text(
    `Showing ${filteredData.length} of ${arrestsByDistrict.length} districts`
  );

  // Remove the previous chart
  svg.selectAll("*").remove();

  // Handle cases where no districts match the filter
  if (filteredData.length === 0) {
    showMessage("No districts match these filters.");
    return;
  }

  // Draw the axes and bars
  updateAxes();
  updateVis();
}


/* Set up the axes for the bar chart */

function updateAxes() {
  // X scale: police districts
  xScale = d3
    .scaleBand()
    .domain(filteredData.map((d) => d.district))
    .range([0, width])
    .padding(0.15);

  // Find the largest arrest count
  const maxArrests = d3.max(
    filteredData,
    (d) => d.arrests
  ) || 1;

  // Logarithmic Y scale
  yScale = d3
    .scaleLog()
    .domain([1, Math.max(10, maxArrests)])
    .range([height, 0])
    .nice();

  // X axis
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  // Y-axis tick values
  const tickValues = [
    1, 10, 100, 1000, 10000, 100000
  ].filter(
    (value) => value <= Math.max(10, maxArrests)
  );

  // Y axis
  svg
    .append("g")
    .attr("class", "axis")
    .call(
      d3.axisLeft(yScale)
        .tickValues(tickValues)
        .tickFormat(d3.format(","))
    );

  // X-axis label
  svg
    .append("text")
    .attr("class", "labels")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .attr("text-anchor", "middle")
    .text("Police District");

  // Y-axis label
  svg
    .append("text")
    .attr("class", "labels")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .text("Total Arrests (Log Scale)");
}


/* Draw the bars and make them clickable */

function updateVis() {
  const bars = svg
    .selectAll(".bar")
    .data(filteredData, (d) => d.district)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (d) => xScale(d.district))
    .attr("y", (d) => yScale(Math.max(1, d.arrests)))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) =>
      height - yScale(Math.max(1, d.arrests))
    )
    .style("fill", "steelblue")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      // Replace the bar chart with this district's yearly graph
      showTrendChart(d.district);
    });

  // Add tooltips showing each district's total arrests
  bars
    .selectAll("title")
    .data((d) => [d])
    .join("title")
    .text(
      (d) =>
        `District ${d.district}: ${d.arrests.toLocaleString()} arrests`
    );
}


/* Replace the bar chart with a yearly line graph */

function showTrendChart(district) {
  // Show the Back button
  d3.select("#backButton").style("display", "inline-block");

  // Update the status text
  d3.select("#filterStatus").text(
    `Viewing yearly arrests for District ${district}`
  );

  // Remove the bar chart and its axes
  svg.selectAll("*").remove();

  // Get yearly arrest counts for the selected district
  const trendData = arrestsByYearDistrict
    .filter((d) => d.district === district)
    .sort((a, b) => a.year - b.year);

  // Handle missing yearly data
  if (trendData.length === 0) {
    showMessage(
      `No yearly data found for District ${district}.`
    );
    return;
  }

  // X scale: year
  const yearExtent = d3.extent(
    trendData,
    (d) => d.year
  );

  // Avoid a zero-width domain if there is only one year
  if (yearExtent[0] === yearExtent[1]) {
    yearExtent[0] -= 1;
    yearExtent[1] += 1;
  }

  const trendX = d3
    .scaleLinear()
    .domain(yearExtent)
    .range([0, width]);

  // Y scale: number of arrests per year
  const maxYearlyArrests = d3.max(
    trendData,
    (d) => d.arrests
  ) || 1;

  const trendY = d3
    .scaleLinear()
    .domain([0, maxYearlyArrests])
    .nice()
    .range([height, 0]);

  // X axis
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3.axisBottom(trendX)
        .ticks(Math.min(10, trendData.length))
        .tickFormat(d3.format("d"))
    );

  // Y axis
  svg
    .append("g")
    .attr("class", "axis")
    .call(
      d3.axisLeft(trendY)
        .tickFormat(d3.format(","))
    );

  // Create the line using each year's arrest count
  const line = d3
    .line()
    .x((d) => trendX(d.year))
    .y((d) => trendY(d.arrests));

  // Draw the yearly trend line
  svg
    .append("path")
    .datum(trendData)
    .attr("fill", "none")
    .attr("stroke", "#e76f51")
    .attr("stroke-width", 2.5)
    .attr("d", line);

  // Draw a point for every year
  const points = svg
    .selectAll(".trend-point")
    .data(trendData)
    .join("circle")
    .attr("class", "trend-point")
    .attr("cx", (d) => trendX(d.year))
    .attr("cy", (d) => trendY(d.arrests))
    .attr("r", 4)
    .attr("fill", "#e76f51");

  // Tooltip for each yearly point
  points
    .append("title")
    .text(
      (d) =>
        `${d.year}: ${d.arrests.toLocaleString()} arrests`
    );

  // Chart title
  svg
    .append("text")
    .attr("class", "labels")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text(`Yearly Arrests — District ${district}`);

  // X-axis label
  svg
    .append("text")
    .attr("class", "labels")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .attr("text-anchor", "middle")
    .text("Year");

  // Y-axis label
  svg
    .append("text")
    .attr("class", "labels")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .text("Number of Arrests");
}


// Start the visualization when the page loads
window.addEventListener("load", init);










