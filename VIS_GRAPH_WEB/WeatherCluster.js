// ============================================================================
// Weather cluster manager
// --- It needs to access gridMapXZ defined at vertices.js for world map coordinates
// --- IT needs dataColumns defined at vertices.js.
// --- It uses weatherMapYCoord defined at code.js.
// ============================================================================
var WeatherClusterManager = function () {
	this.clusters = []; 
};

//  Get positive negativeIndices are i,j matrices coordinates. Need to convert them in world coordinates
WeatherClusterManager.prototype.createWeatherCluster = function(positiveIndices, negativeIndices, cluster, group) {
	
	// GridMapPoint is a vec2 // dataColumns is defined at vetices.js
	var gridMapPointPositive = gridMapXZ[positiveIndices[0] * dataColumns + positiveIndices[1]];
	var gridMapPointNegative = gridMapXZ[negativeIndices[0] * dataColumns + negativeIndices[1]];

	var cluster = new WeatherCluster(vec4(gridMapPointPositive[0], weatherMapYCoord, gridMapPointPositive[1], 1.0),
	                                 vec4(gridMapPointNegative[0], weatherMapYCoord, gridMapPointNegative[1], 1.0),
	                                 cluster,
	                                 group);
	this.clusters.push(cluster);
};

WeatherClusterManager.prototype.createWeatherClustersFromInput = function() {

	var nColumns = 6;  // This is the number of columns defined at the edgeN.txt

	for(var a = 0; a < rawData.datasetEdges.length; a += nColumns) {
		this.createWeatherCluster(vec2(rawData.datasetEdges[a+1], rawData.datasetEdges[a+2]),
							 vec2(rawData.datasetEdges[a+3], rawData.datasetEdges[a+4]),
							 rawData.datasetEdges[a+5],
							 rawData.datasetEdges[a]);
	}
};

// ============================================================================
// Weather cluster class
// ============================================================================
var WeatherCluster = function (positivePoint, negativePoint, cluster, group) {
	this.positivePoint = positivePoint;  // A vec4 with world coordinates for the point
	this.negativePoint = negativePoint;
	this.cluster = cluster;
	this.clusterGroup = group;
};

WeatherCluster.prototype.setClusterValue = function(cluster) {
	this.cluster = cluster;
};

WeatherCluster.prototype.setClusterGroup = function(group) {
	this.clusterGroup = group;
};

WeatherCluster.prototype.setPositivePoint = function(point) {
	this.positivePoint.push(point);
};

WeatherCluster.prototype.setNegativePoint = function(point) {
	this.negativePoint.push(point);
};

// ============================================================================