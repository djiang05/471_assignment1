console.log('D3 Version:', d3.version);

const margin = {top: 80, right: 60, bottom: 60, left: 100};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = []
let xVar = 'income', yVar = 'lifeExp', sizeVar = 'population', targetYear = 2000
let xScale, yScale, sizeScale
const t = 1000; // 1000ms = 1 second

var mapProjection = d3.geoMercator()
let zoom = d3.zoom()
    .on('zoom', handleZoom);


// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
function init(){
    d3.csv('./data/Crimes_-_2001_to_Present_20261007.csv', 
        function(d){
            const myToDatetime = d3.timeParse("%m/%d/%Y %I:%M:%S %p")
            return {
                id: +d.ID, 
                // caseNumber: d["Case Number"],
                date: myToDatetime(d.Date),
                // block: d.Block,
                // iucr: d.IUCR,
                primaryType: d["Primary Type"],
                description: d.Description,
                locationDescription: d["Location Description"],
                arrest: Boolean(d.Arrest),
                domestic: Boolean(d.Domestic),
                // beat: d.Beat,
                // district: d.district,
                // ward: +d.Ward,
                // communityArea: +d["Community Area"],
                fbiCode: d["FBI Code"],
                xCoordinate: d["X Coordinate"],
                yCoordinate: d["Y Coordinate"],
                year: +d.Year,
                // updatedOn: myToDatetime(d["Updated On"]),
                latitude: +d.Latitude,
                longitude: +d.Longitude,
                // location: d.Location
            }
    })
    .then(data => {
            allData = data.filter(d => d.year != 0) // Filter out data without a valid year
            setupSelector()
            
            // Initial rendering steps:
            updateAxes()
            updateVis()
            addLegend()
        })
    .catch(error => console.error('Error loading data:', error));
}



// Here’s what each function is responsible for:

// Zooming adapted from: https://www.d3indepth.com/zoom-and-pan/
function handleZoom(e) {
    // Map zooming function
    
    // Pan and zoom the map
    d3.select('.map g')
        .attr('transform', e.transform);
    
    // Keep points a constant size
    d3.selectAll('.mapPoints')
        .attr('r', 5 / e.transform.k);
}
function initZoom() {
    d3.select('.map')
    .call(zoom);
}


function setupSelector(){
  // Handles UI changes (sliders, dropdowns)
  // Anytime the user tweaks something, this function reacts.
  // May need to call updateAxes() and updateVis() here when needed!

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
    minSideLen = 500
    mWidth = bounds[1][0] - bounds[0][0];
    mHeight = bounds[1][1] - bounds[0][1];
    
    var mScale = 500 / Math.min(mWidth, mHeight);
    mWidth *= mScale;
    mHeight *= mScale;

    mapProjection.fitExtent([[0, 0], [mWidth, mHeight]], json);
    
    // Create SVG element
    var svg = d3.select(".map")
                .attr("width", mWidth)
                .attr("height", mHeight)

    // Create a g within the svg so we can zoom and pan it
    var g = svg.append('g');

    //Bind data and create one path per GeoJSON feature
    g.selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "zipcode")
        .style("fill", "none")
        .style("stroke", "black")
        .style("stroke-width", "1px");;

    var center = d3.geoCentroid(json);

    g.selectAll('.mapPoints')
        .data([center])
        .enter()
        .append('circle')
            .attr('class', 'mapPoints')
            .attr('cx', d => mapProjection(d)[0])
            .attr('cy', d => mapProjection(d)[1])
            .attr('r', 5)
            .style('fill', 'red');

    initZoom();
})
.catch(function(error) {
    console.error("Failed to load GeoJSON:", error);
});;

// window.addEventListener('load', init);