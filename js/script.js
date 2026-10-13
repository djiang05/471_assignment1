console.log('D3 Version:', d3.version);

const margin = {top: 80, right: 60, bottom: 60, left: 100};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = []
let filteredData = []
let selectedYearRange = null
let xVar = 'income', yVar = 'lifeExp', sizeVar = 'population', targetYear = 2000
let xScale, yScale, sizeScale
const t = 1000; // 1000ms = 1 second

// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Here’s what each function is responsible for:

function setupSelector(){
  const dropdown = d3.select("#crime-type-filter")
  const primaryTypes = new Set()

  allData.forEach(d => {
    // some entries were empty so don't want to include them as primary types
    if (d.primaryType && d.primaryType.trim() !== "") {
      primaryTypes.add(d.primaryType)
    }
  })

  const options = ["All", ...[...primaryTypes].sort()]

  dropdown.selectAll("option")
    .data(options)
    .enter()
    .append('option')
    .text(d => d)
    .attr("value", d => d) 

  dropdown.on("change", updateFilteredData)

  d3.select("#arrest-filter")
    .on("change", updateFilteredData)

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
      .range([0, brushWidth])

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
    .extent([[0, 0], [brushWidth, brushHeight]])
    .on("end", function(event) {
      if (event.selection === null) {
        selectedYearRange = null
        updateFilteredData()
        d3.select("#selected-year-range")
          .text(`All years`)
        return;
      }

      const [startPixel, endPixel] = event.selection

      const startYear = Math.floor(xScale.invert(startPixel))
      const endYear = Math.ceil(xScale.invert(endPixel)) - 1

      selectedYearRange = [startYear, endYear]
      updateFilteredData()
      d3.select("#selected-year-range")
          .text(`${startYear} - ${endYear}`)
    })

  svg.append('g')
      .attr('class', 'brush')
      .call(brush)

  // resetting filter values
  d3.select("#reset-filters")
    .on("click", function() {
      d3.select("#crime-type-filter")
        .property("value", "All")
      
      d3.select("#arrest-filter")
        .property("value", "All")

      svg.select(".brush")
        .call(brush.move, null)
    })
}

function updateFilteredData() {
  const selectedType = d3.select("#crime-type-filter").property("value")
  const selectedArrest = d3.select("#arrest-filter").property("value")

  if (selectedType === "All") {
    filteredData = allData
  } else {
    filteredData = allData.filter(d => d.primaryType === selectedType)
  }

  if (selectedArrest !== "All"){
    filteredData = filteredData.filter(d => String(d.arrest) === selectedArrest)
  }

  if (selectedYearRange !== null) {
    const [start, end] = selectedYearRange
    filteredData = filteredData.filter(d => d.year >= start && d.year <= end)
  }

  console.log("Filtered records:", filteredData.length)

  // TODO: Once the bar chart and map are finished,
  // call their update functions here using filteredData.
  // Both visualizations should reflect the current filters.
}

function updateAxes(){
  // Draws the x-axis and y-axis
  // Adds ticks, labels, and makes sure everything lines up nicely
    
}

function updateVis(){
  // Draws (or updates) the bubbles
  // Filter data for the current year
    
}

function addLegend(){
 // Adds a legend so users can decode colors

}

// Map
// Taken from https://d3og.com/cjhin/27e01c636dcc0bfa256c7a225971354d/ and modified


/* Original comments in this block:
data comes from: https://github.com/smartchicago/chicago-atlas/blob/master/db/import/zipcodes.geojson
lots of help from https://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
*/
//Load in GeoJSON data
d3.json("./data/zipcodes.geojson")
.then(function(json) {
    //Width and height
    var width = 900;
    var height = 450;
    // create a first guess for the projection
    var center = d3.geoCentroid(json)
    var scale = 150;
    var projection = d3.geoMercator().scale(scale).center(center);
    //Define path generator
    var path = d3.geoPath()
                    .projection(projection);

    // using the path determine the bounds of the current map and use
    // these to determine better values for the scale and translation
    var bounds = path.bounds(json);
    var hscale = scale * width / (bounds[1][0] - bounds[0][0]);
    var vscale = scale * height / (bounds[1][1] - bounds[0][1]);
    var scale = (hscale < vscale) ? hscale : vscale;
    var offset = [width - (bounds[0][0] + bounds[1][0]) / 2,
                        height - (bounds[0][1] + bounds[1][1]) / 2];

    // new projection
    projection = d3.geoMercator().center(center)
        .scale(scale * 0.9).translate(offset);
    path = path.projection(projection);

    //Create SVG element
    var svg = d3.select(".chart")
                .attr("width", width)
                .attr("height", height)

    //Bind data and create one path per GeoJSON feature
    svg.selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "zipcode")
        .style("fill", "none")
        .style("stroke", "black")
        .style("stroke-width", "1px");;

})
.catch(function(error) {
    console.error("Failed to load GeoJSON:", error);
});;


function init(){
    d3.csv('./data/Crimes_-_2001_to_Present_20261007.csv', 
        function(d){
            return {  
              year: d.Year.trim() === "" ? null : +d.Year,
              primaryType: d["Primary Type"],
              // making sure "true" and "True" are treated the same and same with "false" and "False"
              arrest: String(d.Arrest).toLowerCase() === "true",
              communityArea: d["Community Area"],
              // some records have empty locations, this handles empty values to be null instead of a location 0
              latitude: d.Latitude === "" ? null : +d.Latitude,
              longitude: d.Longitude === "" ? null : +d.Longitude
            }
    })
    .then(data => {
            allData = data
            filteredData = allData
            console.log("Total records: ", allData.length)
            console.log("First record: ", allData[0])
            setupSelector()
            setupYearBrush()
            
            // Initial rendering steps:
            // P.S. You could move these into setupSelector(), 
            // but calling them separately makes the flow clearer.
            updateAxes()
            updateVis()
            addLegend()
        })
    .catch(error => console.error('Error loading data:', error));
}



window.addEventListener('load', init);