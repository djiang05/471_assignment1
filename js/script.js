
/* Margin and chart dimensions */

const margin = { top: 40, right: 40, bottom: 80, left: 70 };

const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const DATA_PATH = "./data/arrests_by_district.csv";
const YEAR_DATA_PATH = "./data/arrests_by_year_district.csv";

let arrestsByDistrict = [];
let arrestsByYearDistrict = [];
let filteredData = [];
let brushedData = [];

let xScale, yScale;

// Individual crime records used for dynamic filtering and brushing
let allData = [];
let filteredCrimes = [];
let selectedYearRange = null;

let filteredDistrictArrests = null;
let filteredYearlyDistrictArrests = null;

// Global variables for map
const mapsvg = d3.select(".map");
const mapg = mapsvg.append('g');
const pointSize = 3;
const pathWidth = 1;
let mapReady = false;
let currentMapZoom = 1;
let mapWidth = 0;
let mapHeight = 0;
const mapProjection = d3.geoMercator();
const zoom = d3.zoom()
    .on('zoom', handleZoom);


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


function setupSelector() {
  const dropdown = d3.select("#crime-type-filter")
  const primaryTypes = new Set()

  allData.forEach(d => {
    // Some records have empty crime types
    if (d.primaryType && d.primaryType.trim() !== "") {
      primaryTypes.add(d.primaryType)
    }
  })

  const options = ["All", ...[...primaryTypes].sort()]

  dropdown.selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d)

  dropdown.on("change", updateFilteredData)

  d3.select("#arrest-filter")
    .on("change", updateFilteredData)
}


function updateFilteredData() {
  const selectedType = d3.select("#crime-type-filter").property("value")
  const selectedArrest = d3.select("#arrest-filter").property("value")

  // Filter by crime type
  if (selectedType === "All") {
    filteredCrimes = allData
  } else {
    filteredCrimes = allData.filter(d => d.primaryType === selectedType)
  }

  // Filter by arrest status
  if (selectedArrest !== "All") {
    filteredCrimes = filteredCrimes.filter(d => String(d.arrest) === selectedArrest)
  }

  // Filter by the selected year range
  if (selectedYearRange !== null) {
    const [start, end] = selectedYearRange
    filteredCrimes = filteredCrimes.filter(d => d.year >= start && d.year <= end)
  }

  const filtersActive = selectedType !== "All" || selectedArrest !== "All" || selectedYearRange !== null

  if (filtersActive) {
    filteredDistrictArrests = aggregateArrestsByDistrict(filteredCrimes)
    filteredYearlyDistrictArrests = aggregateArrestsByYearDistrict(filteredCrimes)
  } else {
    filteredDistrictArrests = null
    filteredYearlyDistrictArrests = null
  }

  // only update the bar chart once loaded
  if (arrestsByDistrict.length > 0) {
    showBarChart()
  }

  updateMap();
}

function aggregateArrestsByDistrict(data) {
  const arrestedCrimes = data.filter(d => d.arrest === true && Number(d.district) > 0 && Number.isFinite(d.year))

  // Group by district and count arrests
  const totals = d3.rollups(
    arrestedCrimes,
    values => values.length,
    d => String(Number(d.district))
  )

  // Convert grouped pairs to objects and sort numerically
  const districtData = totals.map(([district, count]) => ({
    district: district,
    arrests: count
  })).sort((a, b) => Number(a.district) - Number(b.district))

  return districtData
}

function aggregateArrestsByYearDistrict(data) {
  const arrestedCrimes = data.filter(
    d => d.arrest === true &&
    Number(d.district) > 0 &&
    Number.isFinite(d.year)
  )
  const totals = d3.rollups(
    arrestedCrimes,
    values => values.length,
    d => String(Number(d.district)),
    d => d.year
  )

  const yearlyData = totals.flatMap(([district, years]) => {
    // TODO: Use years.map() to convert each
    // [year, arrests] pair into an object containing:
    // district, year, arrests
    return years.map(([year, count]) => ({
      district: district,
      year: year,
      arrests: count
    }))

  })

  // Sort by district first, then by year
  yearlyData.sort((a, b) =>
    Number(a.district) - Number(b.district) || a.year - b.year
  )

  return yearlyData
}

// help and documentation from https://d3js.org/d3-brush
function setupYearBrush() {
  const brushWidth = 700
  const brushHeight = 40

  // Find the earliest and latest years in the dataset
  const [minYear, maxYear] = d3.extent(
      allData,
      d => Number.isFinite(d.year) && d.year >= 2001 ? d.year : undefined
  )

  const xScale = d3.scaleLinear()
      .domain([minYear, maxYear + 1])
      .range([15, brushWidth-15]) // Adjusting range to fit tick labels

  const svg = d3.select("#year-brush")
      .append("svg")
      .attr("width", brushWidth)
      .attr("height", brushHeight + 35)

  svg.append("g")
      .attr("transform", `translate(0, ${brushHeight})`)
      .call(d3.axisBottom(xScale)
          .ticks(8)
          .tickFormat(d3.format("d")))

  const brush = d3.brushX()
    .extent([[15, 0], [brushWidth - 15, brushHeight]])
    .on("end", function(event) {
      if (event.selection === null) {
        selectedYearRange = null
        updateFilteredData()
        d3.select("#selected-year-range")
          .text(`All years`)
        return;
      }

      const [startPixel, endPixel] = event.selection

      const startYear = Math.max(
        minYear,
        Math.min(maxYear, Math.floor(xScale.invert(startPixel)))
      );
      const endYear = Math.max(
        startYear,
        Math.min(maxYear, Math.ceil(xScale.invert(endPixel)) - 1)
      );

      selectedYearRange = [startYear, endYear]
      updateFilteredData()
      d3.select("#selected-year-range")
          .text(`${startYear} - ${endYear}`)
    })

  svg.append('g')
      .attr('class', 'brush')
      .call(brush)

  // resetting filter values
  d3.select("#resetFilters")
    .on("click", function() {
      d3.select("#minArrests").property("value", 0);

      d3.select("#crime-type-filter")
        .property("value", "All")

      d3.select("#arrest-filter")
        .property("value", "All")

      svg.select(".brush")
        .call(brush.move, null)
      })
    }


function initCrimeData() {
  d3.csv('./data/data_subset.csv',
    function(d) {
      return {
        year: d.Year.trim() === "" ? null : +d.Year,
        primaryType: d["Primary Type"],
        // making sure "true" and "True" are treated the same and same with "false" and "False"
        arrest: String(d.Arrest).toLowerCase() === "true",
        communityArea: String(+d["Community Area"]).trim(),
        // some records have empty locations, this handles empty values to be null instead of a location 0
        latitude: d.Latitude === "" ? null : +d.Latitude,
        longitude: d.Longitude === "" ? null : +d.Longitude,
        district: String(+d.District).trim()
      }
    })
    .then(data => {
      allData = data.filter(d =>  // Filtering out invalid points on the map
        d.latitude != null && d.longitude != null
      )
      filteredCrimes = allData

      setupSelector()
      setupYearBrush()
      initMap()

      console.log("Crime records loaded:", allData.length)
    })
    .catch(error => console.error("Error loading crime data:", error))
}

// Zooming adapted from: https://www.d3indepth.com/zoom-and-pan/
function handleZoom(e) {
    // Map zooming function
  
    // Record zoom level
    currentMapZoom = e.transform.k
    
    // Pan and zoom the map
    mapg.attr('transform', e.transform);
    
    // Keep features a constant size
    mapg.selectAll('.mapPoints')
        .attr('r', d => d.radius / currentMapZoom)
        .style('stroke-width', `${pathWidth / currentMapZoom}px`);
    mapg.selectAll('.zipcode')
        .style("stroke-width", `${pathWidth / currentMapZoom}px`);
}
function initZoom() {
  mapsvg.call(
    zoom.filter(e =>
      e.type === "wheel" ||
      (!(e.metaKey || e.ctrlKey) && e.button === 0)
    )
  );
}

// Referenced from https://d3-graph-gallery.com/graph/interactivity_brush.html
function initMapBrush() {
  const brush = d3.brush()
  .extent([[0, 0], [mapWidth, mapHeight]])
  .filter(e => e.metaKey || e.ctrlKey)
  .on("brush", e => {
    const extent = e.selection;

    // Ignore the event if there is no selection
    if (!extent) return;
    let [[x0, y0], [x1, y1]] = extent;
    const transform = d3.zoomTransform(mapsvg.node());

    x0 = transform.invertX(x0);
    y0 = transform.invertY(y0);
    x1 = transform.invertX(x1);
    y1 = transform.invertY(y1);

    mapg.selectAll(".mapPoints")
      .classed("brushed", d =>
        d.x >= x0 && d.x <= x1 &&
        d.y >= y0 && d.y <= y1
      )
      .style("fill", d =>
        d.x >= x0 && d.x <= x1 &&
        d.y >= y0 && d.y <= y1
          ? (d.arrest ? "blue" : "none")
          : (d.arrest ? "red" : "none")
      )
      .style("stroke", d =>
        d.x >= x0 && d.x <= x1 &&
        d.y >= y0 && d.y <= y1
          ? (d.arrest ? "blue" : "red")
          : "red"
      );
  })
  .on("end", e => {
    if (!e.selection) return;
    let [[x0, y0], [x1, y1]] = e.selection;
    const transform = d3.zoomTransform(mapsvg.node());

    x0 = transform.invertX(x0);
    y0 = transform.invertY(y0);
    x1 = transform.invertX(x1);
    y1 = transform.invertY(y1);

    let brushedCrimes = filteredCrimes.filter(d => {
      const point = mapProjection([
        d.longitude,
        d.latitude
      ]);

      return point &&
        point[0] >= x0 && point[0] <= x1 &&
        point[1] >= y0 && point[1] <= y1;
    });

    brushedData = aggregateArrestsByDistrict(brushedCrimes);

    brushLayer.call(brush.move, null);
    updateVis();
  });

  const brushLayer = mapsvg.append("g")
    .call(brush);

  const overlay = brushLayer.select(".overlay");
  overlay.style("pointer-events", "none");

  function updateOverlay(e) {
    overlay.style(
      "pointer-events",
      e.ctrlKey || e.metaKey ? "all" : "none"
    );
  }

  window.addEventListener("keydown", updateOverlay);
  window.addEventListener("keyup", updateOverlay);
  
  // Make the drag cursor clear
  brushLayer.select(".overlay")
    .style("cursor", "crosshair");

  // Make the selection visible while dragging
  brushLayer.selectAll(".selection")
    .attr("fill", "gray")
    .attr("fill-opacity", 0.1)
    .attr("stroke", "gray")
    .attr("stroke-width", 1);
}
function initMap(){
    // Chicago map taken from https://d3og.com/cjhin/27e01c636dcc0bfa256c7a225971354d/ and modified

    /* Original comments in this block:
    data comes from: https://github.com/smartchicago/chicago-atlas/blob/master/db/import/zipcodes.geojson
    lots of help from https://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
    */
    //Load in GeoJSON data
    d3.json("./data/zipcodes.geojson")
    .then(function(json) {
        // create an initial projection
        
        //Define path generator
        var path = d3.geoPath().projection(mapProjection);
        var bounds = path.bounds(json);
        
        // Find aspect ratio of map and scale it up to desired dimensions
        let mWidth = bounds[1][0] - bounds[0][0];
        let mHeight = bounds[1][1] - bounds[0][1];
        
        const mScale = 500 / Math.min(mWidth, mHeight);
        mWidth *= mScale;
        mHeight *= mScale;

        mapWidth = mWidth;
        mapHeight = mHeight;

        mapProjection.fitExtent([[10, 50], [mWidth-10, mHeight-10]], json);
        
        // Set map svg dimensions
        mapsvg
          .attr("width", mWidth)
          .attr("height", mHeight)

        //Bind data and create one path per GeoJSON feature
        mapg.selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "zipcode")
            .style("fill", "none")
            .style("stroke", "black")
            .style("stroke-width", `${pathWidth}px`);;

        mapsvg
          .append("text")
          .attr("class", "labels")
          .attr("x", 10)
          .attr("y", mapHeight - 10)
          .style("font-size", "0.75rem")
          .text("Use ctrl+click or cmd+click to brush.");
        
        mapReady = true;
        initMapBrush();
        initZoom();
        addMapLegend();
        updateMap();
    })
    .catch(function(error) {
        console.error("Failed to load GeoJSON:", error);
    });;
    
}
function addMapLegend(){
  let legendDotSize = 5;
  let betweenSpacing = 100;
  let offset = 150;
  let legendInfo = [['Arrested', 'red'], ['Not Arrested', 'none']]
  mapsvg.selectAll('legendDot')
      .data(legendInfo)
      .enter()
      .append("circle")
      .attr("cy", margin.top/2)
      .attr("cx", (d, i) => i * (legendDotSize + betweenSpacing) + offset)
      .attr('r', legendDotSize)
      .style("fill", d => d[1])
      .style('stroke', 'red')
      .style('stroke-width', `${pathWidth}px`);
        
    mapsvg.selectAll("legendName")
        .data(legendInfo)
        .enter()
        .append("text")
        .attr("y", margin.top/2 + legendDotSize) 
        .attr("x", (d, i) => i * (legendDotSize + betweenSpacing) + offset + 20)  
        .style("fill", "black")  
        .text(d => d[0]) 
        .attr("text-anchor", "left")
        .style('font-size', '13px')
} 
function updateMap() {
  if (!mapReady) {
    return;
  }

  const MAX_POINTS = 10000;
  const GRID_SIZE = 9;
  const useGrid = filteredCrimes.length > MAX_POINTS;

  const marks = [];
  const cells = new Map();

  for (const crime of filteredCrimes) {
    // Skip records without valid coordinates
    if (!Number.isFinite(crime.latitude) ||
        !Number.isFinite(crime.longitude)) {
      continue;
    }

    const projected = mapProjection([
      crime.longitude,
      crime.latitude
    ]);

    if (!projected || !projected.every(Number.isFinite)) {
      continue;
    }

    const [x, y] = projected;

    if (x < 0 || x > mapWidth ||
        y < 0 || y > mapHeight) {
      continue;
    }

    // Small selections: show individual incidents
    if (!useGrid) {
      marks.push({
        id: `point-${marks.length}`,
        x: x,
        y: y,
        arrest: crime.arrest,
        count: 1,
        radius: pointSize,
        primaryType: crime.primaryType,
        year: crime.year,
        communityArea: crime.communityArea,
        district: crime.district
      });
      continue;
    }

    // Large selections: group nearby incidents
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    const id = `cell-${gridX}-${gridY}-${crime.arrest}`;

    if (!cells.has(id)) {
      cells.set(id, {
        id: id,
        totalX: 0,
        totalY: 0,
        arrest: crime.arrest,
        count: 0
      });
    }

    const cell = cells.get(id);
    cell.totalX += x;
    cell.totalY += y;
    cell.count++;
  }

  if (useGrid) {
    for (const cell of cells.values()) {
      marks.push({
        id: cell.id,
        x: cell.totalX / cell.count,
        y: cell.totalY / cell.count,
        arrest: cell.arrest,
        count: cell.count,
        radius: Math.min(12, 2.5 + Math.sqrt(cell.count))
      });
    }
  }

  // Update existing AND new circle positions
  const circles = mapg.selectAll(".mapPoints")
    .data(marks, d => d.id)
    .join("circle")
    .attr("class", "mapPoints")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", d => d.radius / currentMapZoom)
    .style("opacity", 0.5)
    .style("fill", d => d.arrest ? "red" : "none")
    .style("stroke", "red")
    .style("stroke-width", `${pathWidth / currentMapZoom}px`);
  
  circles
  .on('mouseover', function (event, d) {
      // console.log(d) // See the data point in the console for debugging
      d3.select('#tooltip')
          // if you change opacity to hide it, you should also change opacity here
          .style("display", 'block') // Make the tooltip visible
          .html( // Change the html content of the <div> directly
          `<strong>${d.primaryType}</strong><br/>
          Community Area: ${d.communityArea}<br/>
          District: ${d.district}
          `)
          .style("left", (event.pageX + 20) + "px")
          .style("top", (event.pageY - 28) + "px");
        d3.select(this) // Refers to the hovered circle
          .attr('r', 1.5 * pointSize / currentMapZoom)
          .style('stroke', 'black')
          .style('stroke-width', `${4 / currentMapZoom}px`)
  })
  .on("mouseout", function (event, d) {
      d3.select('#tooltip')
      .style('display', 'none') // Hide tooltip when cursor leaves
      d3.select(this) // Refers to the hovered circle
          .attr('r', pointSize / currentMapZoom)
          .style('stroke', function() {
            return d3.select(this).classed('brushed') ? 'blue' : 'red'; // revert stroke to correct color based on brushed or not 
          })
          .style('stroke-width', `${pathWidth / currentMapZoom}px`);
  })

  d3.select("#mapStatus").text(
    `${marks.length.toLocaleString()} map markers displayed` +
    (useGrid ? " (nearby incidents grouped)" : "")
  );
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

      // Return from the line graph to the bar chart
      d3.select("#backButton")
        .on("click", () => {
          filteredCrimes = allData;
          updateMap();
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

  const chartData = filteredDistrictArrests === null ? arrestsByDistrict : filteredDistrictArrests;

  // Filter districts by their total arrest counts
  filteredData = chartData.filter(
    (d) => d.arrests >= minArrests
  );

  // Update the status text
  d3.select("#filterStatus").text(
    `Showing ${filteredData.length} of ${chartData.length} districts`
  );

  // Remove the previous chart
  svg.selectAll("*").remove();

  if (d3.select("#arrest-filter").property("value") === "false") {
    d3.select("#filterStatus").text(
      "Not Arrested is selected. This chart counts only incidents marked as arrested. The map still shows matching incidents."
    );

    showMessage("No arrests to display. See the map.");
    return;
  }

  // Handle cases where no districts match the filter
  if (filteredData.length === 0) {
    showMessage("No districts match these filters.");
    return;
  }

  svg
    .append("text")
    .attr("class", "labels")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text(`Number of Arrests in Each District`);

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
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      // Replace the bar chart with this district's yearly graph
      showTrendChart(d.district);
    });

  const linkedbars = svg
    .selectAll(".linkedbar")
    .data(brushedData, (d) => d.district)
    .join("rect")
    .style('fill', 'gold')
    .attr("class", "linkedbar")
    .attr("x", (d) => xScale(d.district))
    .attr("y", (d) => yScale(Math.max(1, d.arrests)))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) =>
      height - yScale(Math.max(1, d.arrests))
    )
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      // Replace the bar chart with this district's yearly graph
      showTrendChart(d.district);
    });
  brushedData = [];

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

  const yearlyChartData = filteredYearlyDistrictArrests === null
    ? arrestsByYearDistrict
    : filteredYearlyDistrictArrests;
  
  const districtTrend = yearlyChartData
    .filter(d => d.district === district)
    .sort((a, b) => a.year - b.year);

  const referenceData = filteredYearlyDistrictArrests === null
    ? arrestsByYearDistrict
    : allData;

  // All years represented in the selected dataset
  const availableYears = [...new Set(
  referenceData
    .map(d => d.year)
    .filter(Number.isFinite)
  )]
  .filter(year =>
    selectedYearRange === null ||
    (year >= selectedYearRange[0] &&
    year <= selectedYearRange[1])
  )
  .sort((a, b) => a - b);

  // Find each year's arrests for this district
  const countsByYear = new Map(
    districtTrend.map(d => [d.year, d.arrests])
  );

  // Include years with zero matching arrests
  const trendData = availableYears.map(year => ({
    district: district,
    year: year,
    arrests: countsByYear.get(year) ?? 0
  }));


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

  // Filter crimes data to current district so that changes will be reflected on the map
  filteredCrimes = filteredCrimes.filter(d => Number(d.district) == district)
  updateMap();
}


// Start the visualization when the page loads
window.addEventListener("load", init);
window.addEventListener("load", initCrimeData);
