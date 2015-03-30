var dataRows = 24;
var dataColumns = 34;

function gridCoordinates(vertexA, vertexB, vertexC, yCoord) {
	var mapGridCoordinates = [];

	var coordinatesZ = splitLine(vertexA[2], vertexB[2], dataRows);
	var coordinatesX = splitLine(vertexB[0], vertexC[0], dataColumns);
	
	for(var z = 0; z < coordinatesZ.length; ++z) {
		for(var x = 0; x < coordinatesX.length; ++x) {
			//mapGridCoordinates ith index will correspond to the grid position of  [z+x*coordinatesX.length]
			mapGridCoordinates.push(vec4(coordinatesX[x], yCoord, coordinatesZ[z], 1.0));
		}
	}
	return mapGridCoordinates;
}

function gridCoordinatesXZ(vertexA, vertexB, vertexC) {
	var mapGridCoordinates = [];

	var coordinatesZ = splitLine(vertexA[2], vertexB[2], dataRows);
	var coordinatesX = splitLine(vertexB[0], vertexC[0], dataColumns);
	
	for(var z = 0; z < coordinatesZ.length; ++z) {
		for(var x = 0; x < coordinatesX.length; ++x) {
			//mapGridCoordinates ith index will correspond to the grid position of  [z+x*coordinatesX.length]
			mapGridCoordinates.push(vec2(coordinatesX[x], coordinatesZ[z]));
		}
	}
	return mapGridCoordinates;
}

function splitLine(A, B, nRegions) {
	
	var coordinates = [];
	var minCoord, maxCoord;
	if(A < B) {
		minCoord = A;
		maxCoord = B;
	}
	else {
		minCoord = B;
		maxCoord = A;
	}
	
	var lineMagnitude = maxCoord - minCoord;
	var stepSize = lineMagnitude / nRegions;
	
	for(var i = 0; i < nRegions; ++i) 
		coordinates.push(minCoord + (0.5 + i)*stepSize);
	
	return coordinates;
}