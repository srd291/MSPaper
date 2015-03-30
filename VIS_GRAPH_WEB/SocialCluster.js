// ============================================================================
// Social data manager
// --- It needs to access gridMapXZ defined at code.js for world map coordinates.
// --- It uses nebraskaMapYCoord defined at code.js at Nebraska Map related code.
// --- IT needs dataColumns defined at vertices.js.
// ============================================================================
var SocialDataManager = function() {
	this.socialData = [];
	this.tweetRepresentation = {};  // This keeps the center and radius for social data rendering
};

SocialDataManager.prototype.createSocialData = function(cluster, classification, gridIndex) {
	
	// GridMapPoint is a vec2
	var gridMapPoint = gridMapXZ[ gridIndex ];

	gridMapPoint = this.scatterCircle(gridMapPoint, this.tweetRepresentation[gridIndex].radius);

	var socialDataPoint = new SocialData(vec4(gridMapPoint[0], nebraskaMapYCoord, gridMapPoint[1], 1.0),
						                 cluster,
						                 classification,
						                 gridIndex);

	this.socialData.push(socialDataPoint);
};

SocialDataManager.prototype.createSocialDataFloat = function(coordX, coordZ, cluster, classification, gridIndex, secWeatherGroup, secClassification, thirdWeatherGroup, thirdClassification) { // Added by Jieting

	var socialDataPoint = new SocialData(vec4(coordX, nebraskaMapYCoord, coordZ, 1.0), // Added by Jieting
						                 cluster,                                      // Added by Jieting
						                 classification,                               // Added by Jieting
						                 gridIndex,									   // Added by Jieting
						                 secWeatherGroup,
						                 secClassification,
						                 thirdWeatherGroup,
						                 thirdClassification);                                   // Added by Jieting

	this.socialData.push(socialDataPoint);                                             // Added by Jieting
};

SocialDataManager.prototype.createSocialDataFromInput = function() {
	var nDataColumns = 9;

    var Width = mapWorldWidth - (-mapWorldWidth); //Added by Jieting
    var Height = mapWorldHeight - (-mapWorldHeight); //Added by Jieting
    
	var tweetCount = this.countTweets();
	this.socialRepresentation(tweetCount);
	for (var a = 0; a < rawData.datasetTweetData.length; a += nDataColumns) {
	
		var i = Math.round(rawData.datasetTweetData[a]); // Added by Jieting
		var j = Math.round(rawData.datasetTweetData[a+1]); //Added by Jieting

        var num_i = rawData.datasetTweetData[a]; // Added by Jieting
        var num_j = rawData.datasetTweetData[a + 1]; // Added by Jieting
        
        var coordX = Width * (num_j / 34) - mapWorldWidth; // Added by Jieting
        var coordZ = Height * (num_i / 24) - mapWorldHeight; // Added by Jieting
        
		var classification = rawData.datasetTweetData[a + 2];		
		var gridIndex = i * dataColumns + j;  // The index at the 24x34 array structure
		var cluster = rawData.datasetCA[gridIndex];  // dataColumns defined at vertices.js

        var secGridIndex = rawData.datasetTweetData[a+3] * dataColumns + rawData.datasetTweetData[a+4];
		var secCluster = rawData.datasetCA[secGridIndex];
		var secClassification = rawData.datasetTweetData[a+5];

		var thirdGridIndex = rawData.datasetTweetData[a+6] * dataColumns + rawData.datasetTweetData[a+7];
		var thirdCluster = rawData.datasetCA[thirdGridIndex];
		var thirdClassification = rawData.datasetTweetData[a+8];

		this.createSocialDataFloat(coordX, coordZ, cluster, classification, gridIndex, secCluster, secClassification, thirdCluster, thirdClassification); // Added by Jieting
//		this.createSocialData(cluster, classification, gridIndex);
	}
//    console.log(Width);
//    console.log(Height);
//    console.log(this.socialData);
};

//  This function returns an object in which every property is given by the key (i*dataColumns+j)
//  that is the corresponding index of the array that represents the grid of 24x34 regions. The value
//  of each property is the count of tweets for that specific region
SocialDataManager.prototype.countTweets = function() {
	var nDataColumns = 3;
	var tweetCount = {};
	
	//  Initialize each property (region) with the count of 0
	for(var a = 0; a < rawData.datasetTweetData.length; a += nDataColumns) {
        var i = Math.round(rawData.datasetTweetData[a]); // Added by Jieting
		var j = Math.round(rawData.datasetTweetData[a+1]); //Added by Jieting

        var num_i = rawData.datasetTweetData[a]; // Added by Jieting
        var num_j = rawData.datasetTweetData[a + 1]; // Added by Jieting
        
//		var i = rawData.datasetTweetData[a];
//		var j = rawData.datasetTweetData[a+1];
		tweetCount[i*dataColumns + j] = 0;		
	}
	//  Count the number of tweets
	for(var a = 0; a < rawData.datasetTweetData.length; a += nDataColumns) {
        var i = Math.round(rawData.datasetTweetData[a]); // Added by Jieting
		var j = Math.round(rawData.datasetTweetData[a+1]); //Added by Jieting

        var num_i = rawData.datasetTweetData[a]; // Added by Jieting
        var num_j = rawData.datasetTweetData[a + 1]; // Added by Jieting
//		var i = rawData.datasetTweetData[a];
//		var j = rawData.datasetTweetData[a+1];
		tweetCount[i*dataColumns + j] += 1;
	}
	
	return tweetCount;
};

/**
* This function populates the tweetRepresentation object with other objects to store data. Every property of the object is
* given by the key (i*dataColumns+j) that is the corresponding index of the array that represents the grid
* of 24x34 regions.
* @parameter - the tweet count returned by the countTweets function
* 
*/
SocialDataManager.prototype.socialRepresentation = function(tweetCount) {
	this.tweetRepresentation = {};
    
	for(var k in tweetCount) {
		var pos = gridMapXZ[ k ];
//        console.log(pos);
		this.tweetRepresentation[k] = {};  // Every tweetRepresentation's property itself is an object that will hold data
		this.tweetRepresentation[k].count = tweetCount[k];
		this.tweetRepresentation[k].center = vec4(pos[0], nebraskaMapYCoord+0.0001, pos[1], 1.0);
		this.tweetRepresentation[k].radius = Math.sqrt(tweetCount[k] / Math.PI) / 50.0;
	}
};


/**
* @return - it returns an object of objects that holds data. Each property of tweetRepresentation is again
*           the number of the index in the array of regions. And it will have the it has the positive edges
*           and negative edges for each social cluster
*/
SocialDataManager.prototype.clusterTweetData = function() {
	var clusteredTweets = {};
	
	for(var k in this.tweetRepresentation) {
		
		clusteredTweets[k] = {};
		clusteredTweets[k].positivePoints = [];
		clusteredTweets[k].negativePoints = [];

		for(var a = 0; a < this.socialData.length; ++a) {
			if(this.socialData[a].gridIndex == k) {
				if(this.socialData[a].classification === 0)
					clusteredTweets[k].negativePoints.push(this.socialData[a]);
				else
					clusteredTweets[k].positivePoints.push(this.socialData[a]);
			}
		}
	}
	return clusteredTweets;
};

/**
* @return - it returns an object of objects that holds data. Each property of tweetRepresentation is again
*           the number of the index in the array of regions. The property value will be an array containing
*           all the tweets related to that region, with no difference between good and bad classification
*/
SocialDataManager.prototype.clusterTweetDataNoClassification = function() {
	var clusteredTweets = {};
	
	for(var k in this.tweetRepresentation) {
		
		clusteredTweets[k] = {};
		clusteredTweets[k].points = [];

		for(var a = 0; a < this.socialData.length; ++a) {
			if(this.socialData[a].gridIndex == k) {
				clusteredTweets[k].points.push(this.socialData[a]);
			}
		}
	}
//	console.log(clusteredTweets);
	return clusteredTweets;
};

// center must be vec2.
SocialDataManager.prototype.scatterCircle = function(center, radius) {
	
	var radiusDirec = scalev(radius, vec2(2*Math.random() - 1, 2*Math.random() - 1));
	var radiusMagn = Math.random();

	var newPoint = add(center, scalev(radiusMagn, radiusDirec));

	return newPoint;
};

SocialDataManager.prototype.getSocialClustersRadius = function() {
	var ret = [];
	for(var k in this.tweetRepresentation) {
		ret.push(this.tweetRepresentation[k].radius);
	}
	return ret;
};

SocialDataManager.prototype.getSocialClustersCenters = function() {
	var ret = [];
	for(var k in this.tweetRepresentation) {
		ret.push(this.tweetRepresentation[k].center);
	}
	return ret;
};

// ============================================================================
// Social data class
// =========================is===================================================
var SocialData = function(position, weatherGroup, classification, gridIndex, secWeatherGroup, secClassification, thirdWeatherGroup, thirdClassification) {
	this.gridIndex = gridIndex;
	
	this.position = position; //  a vec4 with the world coordinates of this social data point
	this.mainWeathergroup = weatherGroup;  //  the closest weather group that this point is related to
	this.classification = classification;

	this.secWeatherGroup = secWeatherGroup;
	this.secClassification = secClassification;

	this.thirdWeatherGroup = thirdWeatherGroup;
	this.thirdClassification = thirdClassification;
};

SocialData.prototype.setPosition = function(position){
	this.position = position;
};

SocialData.prototype.setMainWeatherGroup = function(group) {
	this.mainWeathergroup = group;
};

SocialData.prototype.setClassification = function(classification) {
	this.classification = classification;
};