// ============================================================================
// Edge manager - This class store all the edges in the same array, making no difference
//                of cluster, or classification
// =========================is===================================================
var EdgeManager = function() {
	this.edges = [];  // An array of world coordinates. {(x0,y0,z0,w0); (x1,y1,w1,w1);...}
					  // Each four consecutive inputs represent the same edge
    this.edgesColor = [];
};

EdgeManager.prototype.createEdges = function(weatherClusterManager, socialClusterManager) {
	this.edges = [];

	for(var a = 0; a < socialClusterManager.socialData.length; ++a) {
//    for(var a = 0; a < 1; ++a) {
		//  Get info about the current social data point
		var socialPoint = socialClusterManager.socialData[a].position;
		var weatherGroup = socialClusterManager.socialData[a].mainWeathergroup;
		var secWeatherGroup = socialClusterManager.socialData[a].secWeatherGroup;
		var thirdWeatherGroup = socialClusterManager.socialData[a].thirdWeatherGroup;

		var classification = socialClusterManager.socialData[a].classification;
		var secClassification = socialClusterManager.socialData[a].secClassification;
		var thirdClassification = socialClusterManager.socialData[a].thirdClassification;

		var b = findWeatherClusterIndex(weatherGroup);
		var c = findWeatherClusterIndex(secWeatherGroup);
		var d = findWeatherClusterIndex(thirdWeatherGroup);

		var weatherPoint = getWeatherPoint(classification, b);
		var secWeatherPoint = getWeatherPoint(secClassification, c);
		var thirdWeatherPoint = getWeatherPoint(thirdClassification, d);

		var color = calculateEdgeColor(socialPoint, weatherPoint, classification);
		var secColor = calculateEdgeColor(socialPoint, secWeatherPoint, secClassification);
		var thirdColor = calculateEdgeColor(socialPoint, thirdWeatherPoint, thirdClassification);     
		
		//  Primary edge
        this.edges.push(socialPoint);
        this.edges.push(weatherPoint);
        //  Secondary edge
        this.edges.push(socialPoint);
        this.edges.push(secWeatherPoint);
        //  Ternary edge
        this.edges.push(socialPoint);
        this.edges.push(thirdWeatherPoint);

        this.edgesColor.push(color);
        this.edgesColor.push(secColor);
        this.edgesColor.push(thirdColor);
	}
//    console.log(this.edges);
};

// ==============================================================================
// Bundle Edge Manager - The bundledEdeges is an array of arrays of the edges 
//                      taking into acount both the social cluster and the classific
//                     - The bundledEdgesNoClass doesn't take into acount the
//                      difference into the classification, and mput all edges from
//                      the same social cluster into a single array
// =========================is===================================================
var BundleEdgeManager = function() {
	this.bundledEdges = [];
    this.bundledEdgesColor = [];

    this.bundledEdgesNoClass = [];
    this.bundledEdgesNoClassColor = [];
};

BundleEdgeManager.prototype.createEdgeBundle = function(weatherClusterManager, key, clusteredTweets, classification) {
	var edges = [];
	//var colors = [];

	var socialDataPoints = [];
	if(classification === 1) {
		socialDataPoints = clusteredTweets[key].positivePoints;
	}
	else {
		socialDataPoints = clusteredTweets[key].negativePoints;
	}

	//  If there is no edges in the wanted classification in this cluster, just leave
	if(socialDataPoints.length === 0) return;

	var weatherGroup = socialDataPoints[0].mainWeathergroup;
	
	var b = findWeatherClusterIndex(weatherGroup);
	var weatherPoint = getWeatherPoint(classification, b);
	
	for(var a = 0; a < socialDataPoints.length; ++a) {
		var socialPoint = socialDataPoints[a].position;

		var secWeatherGroup = socialDataPoints[a].secWeatherGroup;
		var thirdWeatherGroup = socialDataPoints[a].thirdWeatherGroup;

		var secClassification = socialDataPoints[a].secClassification;
		var thirdClassification = socialDataPoints[a].thirdClassification; 

		var c = findWeatherClusterIndex(secWeatherGroup);
		var d = findWeatherClusterIndex(thirdWeatherGroup);
		
		var secWeatherPoint = getWeatherPoint(secClassification, c);
		var thirdWeatherPoint = getWeatherPoint(thirdClassification, d);
		
		var color = calculateEdgeColor(socialPoint, weatherPoint, classification);
		var secColor = calculateEdgeColor(socialPoint, secWeatherPoint, secClassification);
		var thirdColor = calculateEdgeColor(socialPoint, thirdWeatherPoint, thirdClassification);

		edges.push(socialPoint);
		edges.push(weatherPoint);

		edges.push(socialPoint);
		edges.push(secWeatherPoint);

		edges.push(socialPoint);
		edges.push(thirdWeatherPoint);

		this.bundledEdgesColor.push(color);
		this.bundledEdgesColor.push(secColor);
		this.bundledEdgesColor.push(thirdColor);
		//colors.push(color);
	}

	this.bundledEdges.push(edges);
	//this.bundledEdgesColor.push(colors);
};

BundleEdgeManager.prototype.createEdges = function(weatherClusterManager, socialDataManager) {
	var clusteredTweets = socialDataManager.clusterTweetData();

	for(var k in clusteredTweets) {
		//  Create the edge bundle at the kth region of the grid with respect to the bad classification
		this.createEdgeBundle(weatherClusterManager, k, clusteredTweets, 0);
		//  Now create the bundle with respect to the good classification
		this.createEdgeBundle(weatherClusterManager, k, clusteredTweets, 1);
	}
};

BundleEdgeManager.prototype.createEdgeBundleNoClassification = function(weatherClusterManager, key, clusteredTweets) {
	var edges = [];
    var dummyEdges = [];
    
	var socialDataPoints = [];
	socialDataPoints = clusteredTweets[key].points;
	
	//  If there is no edges, just leave
	if(socialDataPoints.length === 0) return;

	for(var a = 0; a < socialDataPoints.length; ++a) {
		var socialPoint = socialDataPoints[a].position;

		var weatherGroup = socialDataPoints[a].mainWeathergroup;
		var secWeatherGroup = socialDataPoints[a].secWeatherGroup;
		var thirdWeatherGroup = socialDataPoints[a].thirdWeatherGroup;

		//  Look for the matching weather cluster - main weather cluster
		var b = findWeatherClusterIndex(weatherGroup);
		var c = findWeatherClusterIndex(secWeatherGroup);
		var d = findWeatherClusterIndex(thirdWeatherGroup);
		
		var classification = socialDataPoints[a].classification;
		var secClassification = socialDataPoints[a].secClassification;
		var thirdClassification = socialDataPoints[a].thirdClassification;
		
		var weatherPoint = getWeatherPoint(classification, b);
		var secWeatherPoint = getWeatherPoint(secClassification, c);
		var thirdWeatherPoint = getWeatherPoint(thirdClassification, d);

		var color = calculateEdgeColor(socialPoint, weatherPoint, classification);
		var secColor = calculateEdgeColor(socialPoint, secWeatherPoint, secClassification);
		var thirdColor = calculateEdgeColor(socialPoint, thirdWeatherPoint, thirdClassification);
		
        var dummyPoint = getDummyPoint(classification, b);
        var secDummyPoint = getDummyPoint(secClassification, c);
        var thirdDummyPoint = getDummyPoint(thirdClassification, d);
	
		var dummyColor = vec4(0.0, 0.0, 0.0, 0.0);   

        // sentiment edge
        edges.push(socialPoint);
		edges.push(weatherPoint);
		edges.push(socialPoint);
		edges.push(dummyPoint);

		edges.push(socialPoint);
		edges.push(secWeatherPoint);
		edges.push(socialPoint);
		edges.push(secDummyPoint);

		edges.push(socialPoint);
		edges.push(thirdWeatherPoint);
		edges.push(socialPoint);
		edges.push(thirdDummyPoint);

		this.bundledEdgesNoClassColor.push(color);
		this.bundledEdgesNoClassColor.push(dummyColor);
		this.bundledEdgesNoClassColor.push(secColor);
		this.bundledEdgesNoClassColor.push(dummyColor);
		this.bundledEdgesNoClassColor.push(thirdColor);
		this.bundledEdgesNoClassColor.push(dummyColor);
        
        
        //dummy edge
//      dummyEdges.push(socialDataPoints[a].position);
//		dummyEdges.push(dummyPoint);
        
                                              
	}                                                 
	this.bundledEdgesNoClass.push(edges);
//    this.bundledEdgesNoClass.push(dummyEdges);
};

BundleEdgeManager.prototype.createEdgesNoClassification = function(weatherClusterManager, socialDataManager) {
	var clusteredTweets = socialDataManager.clusterTweetDataNoClassification();
	for(var k in clusteredTweets) {
		this.createEdgeBundleNoClassification(weatherClusterManager, k, clusteredTweets);
	}

	console.log(this.bundledEdgesNoClass);
};

////////////////////////////////////////////////////////////////////////////

//  Look for the matching weather cluster
function findWeatherClusterIndex (cluster) {
	var b = 0;
	while(b < weatherClusterManager.clusters.length) {
		if(weatherClusterManager.clusters[b].cluster === cluster)
			break;
		++b;
	}

	return b;
}

function getWeatherPoint(classification, clusterIndex) {
	var weatherPoint;
	if(classification === 1) {
		weatherPoint = weatherClusterManager.clusters[clusterIndex].positivePoint;
	}
	else {
		weatherPoint = weatherClusterManager.clusters[clusterIndex].negativePoint;
	}
	return weatherPoint;
}

function getDummyPoint(classification, clusterIndex) {
	if(classification === 1) { 
        return weatherClusterManager.clusters[clusterIndex].negativePoint;   //Added by Jieting
	} 
	else {
        return weatherClusterManager.clusters[clusterIndex].positivePoint;   //Added by Jieting
	} 
}

function calculateEdgeColor(socialPoint, weatherPoint, classification) {
    
    var alpha;      //Added by Jieting
    var length;     //Added by Jieting
    var max;
    var min;
    var vmax;
    var vmin;	

    max = 3.64; //Added by Jieting
//  max = 5.0; //Added by Jieting
    min = 1.0; //Added by Jieting
    vmax = 1.0; //Added by Jieting
    vmin = 0.4; //Added by Jieting
    length = CalcDistance(socialPoint, weatherPoint); //Added by Jieting

    if (length > max) { //Added by Jieting
        length = max;   //Added by Jieting
    }                   //Added by Jieting
    
    alpha = (length - min) * (-vmax + vmin) / (max - min) + vmin;   //Added by Jieting
    
    if(alpha < 0.6)
    alpha = 0.6;

     var positive = vec4(0.0, 1.0, 0.0, alpha);                     //Added by Jieting
     var negative = vec4(1.0, 0.0, 0.0, alpha);                      //Added by Jieting
	
	// var positive = vec4(0.0, 0.392, 0.698, alpha);
 //    var negative = vec4(0.698, 0.423, 0.0, alpha);

    if(classification === 1) {   //Added by Jieting
        return positive;
	}                                                               //Added by Jieting
	else {                                                          //Added by Jieting
        return negative;
	}                                                               //Added by Jieting

}

function CalcDistance(p1, p2)
{
    var x = p1[0] - p2[0];
    var y = p1[1] - p2[1];
    var z = p1[2] - p2[2];
    return Math.sqrt(x * x + y * y + z * z);
}