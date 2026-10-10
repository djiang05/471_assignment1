console.log('D3 Version:', d3.version);

const margin = {top: 80, right: 60, bottom: 60, left: 100};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = []
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
            // Besides converting the types, we also simpilify the variable names here. 
            country: d.country,
            continent: d.continent,
            year: +d.year, // using + to convert to numbers; same below
            lifeExp: +d.life_expectancy, 
            income: +d.income_per_person, 
            gdp: +d.gdp_per_capita, 
            childDeaths: +d.number_of_child_deaths,
            // Your turn: 
            population: +d.population // convert d.population, and assign it to population
        }
    })
    .then(data => {
            // console.log(data)
            allData = data
            setupSelector()
            
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