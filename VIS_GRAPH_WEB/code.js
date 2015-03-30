var gl;
var canvas;


// ============================================================================
// Global objects to be used mainly to read all the input files, manage the
// social and weather data and generate the edges
// ============================================================================
var rawData = new RawData();
var edgeManager = new EdgeManager();
var bundleEdgeManager = new BundleEdgeManager();
var weatherClusterManager = new WeatherClusterManager();
var socialDataManager = new SocialDataManager();

// ============================================================================
// This is an array of vec4. It contains all world coordinates of the grid that
// represents the regions. The grid (matrix) indices i,j are mapped to the array
// as: gridMapXZ[i*dataColumns + j], where dataColumns is defined at vertices.js
// ============================================================================
var gridMapXZ;

// ============================================================================
// Projection and modelview related data structures and functions
// ============================================================================
// Projection transformation parameters
var	theFovy = 45.0;  		// Field-of-view in Y direction angle (in degrees)
var theAspect = 1.0;       // Viewport aspect ratio
var theZNear = 0.1;
var theZFar = 15000.0;

// Rotation parameters
var theAngle = 0.0;
var theAxis = [];

var theTrackingMove = false;
var theScalingMove = false;

var	theLastPos = [];
var	theCurtX, theCurtY;
var	theStartX, theStartY;
var	theCurtQuat = [1, 0, 0, 0];
var	theScale = 1.0;
var theInit = true;

function getMousePos(e, canvas)
{
	var event = e || window.event;
	var client_x_r = event.clientX - canvas.offsetLeft;
	var client_y_r = event.clientY - canvas.offsetTop;
	var clip_x = -1 + 2 * client_x_r / canvas.width;
	var clip_y = -1 + 2 * (canvas.height - client_y_r) / canvas.height;
	var t = vec2(clip_x, clip_y);
	
	return t;
}

function startMotion(x, y)
{
	theTrackingMove = true;
	theStartX = x;
	theStartY = y;
	theCurtX = x;
	theCurtY = y;
	trackball_ptov(x, y, theLastPos);
}


function stopMotion(x, y)
{
    theTrackingMove = false;
	
	/* check if position has changed */
    if (theStartX == x && theStartY == y) {
	     theAngle = 0.0;
    }
}

function startScale(x, y)
{
	theScalingMove = true;
	theCurtX = x;
	theCurtY = y;
}

function stopScale(x, y)
{
    theScalingMove = false;
}

// ============================================================================
// Nebraska texture initialization
// ============================================================================
var nebraskaTexture;
var texWidth = 793;
var texHeight = 553;

var mapWorldWidth = texWidth/texHeight;
var mapWorldHeight = texHeight/texHeight;

function loadNebraskaTexture() {
    var image = new Image();
    image.onload = function() { 
        configureNebraskaTexture(image);
    }
//    image.src = "mapNECountys.png";
    image.src = "map_color.png";
}

function configureNebraskaTexture(image) {
    nebraskaTexture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, nebraskaTexture );
	
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
}

function useTexture(theProgram, texture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(theProgram, "texture"), 0);
}	

// ============================================================================
// Nebraska map related data structures and functions
// ============================================================================
var theMapVBOPoints;
var theTexVBOPoints;
var theMapProgram;
var theMapPoints = [];
var nebraskaMapYCoord = -0.5;
var theMapVertices = [
	vec4(-mapWorldWidth, nebraskaMapYCoord, mapWorldHeight, 1.0),
	vec4(mapWorldWidth, nebraskaMapYCoord, mapWorldHeight, 1.0),
	vec4(mapWorldWidth, nebraskaMapYCoord, -mapWorldHeight, 1.0),
	vec4(-mapWorldWidth, nebraskaMapYCoord, -mapWorldHeight, 1.0)
	];
var theTexCoord = [
	vec2(0.0,0.0),
	vec2(1.0,0,0),
	vec2(1.0,1.0),
	vec2(0.0,1.0)
	];

function mapQuad(a,b,c,d) {
	theMapPoints.push(theMapVertices[a]);
	theMapPoints.push(theMapVertices[b]);
	theMapPoints.push(theMapVertices[c]);
	theMapPoints.push(theMapVertices[d]);
}
	
function initMap()
{	
	mapQuad(0,1,2,3);

	// Load shaders and initialize attribute buffers
	theMapProgram = initShaders(gl, "nebraska-vertex-shader", "nebraska-fragment-shader");
    gl.useProgram(theMapProgram);
    
    // Create VBOs and load the data into the VBOs
    theMapVBOPoints = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, theMapVBOPoints);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(theMapPoints), gl.STATIC_DRAW);
	
	theTexVBOPoints = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, theTexVBOPoints);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(theTexCoord), gl.STATIC_DRAW);
}

function drawNebraskaMap(theProgram, p, mv) 
{
	gl.useProgram(theProgram);
	useTexture(theProgram, nebraskaTexture);
	
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "projectionMatrix"),false, flatten(p));
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "modelViewMatrix"),false, flatten(mv));
	
    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation(theProgram, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, theMapVBOPoints);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
	var vTexCoord = gl.getAttribLocation(theProgram, "vTexCoord");
	gl.bindBuffer(gl.ARRAY_BUFFER, theTexVBOPoints);
	gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vTexCoord);
	
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

// ============================================================================
// Social circles related data structures and functions
// ============================================================================
var theSocialCircleVBOPoints;
var theSocialCircleProgram;
var theCircleCenters = [];
var theCircleRadius = [];
	
function initCircleProgram()
{	
	// Load shaders and initialize attribute buffers
	theSocialCircleProgram = initShaders(gl, "socialcircle-vertex-shader", "socialcircle-fragment-shader");
    
    // Create VBOs
    theSocialCircleVBOPoints = gl.createBuffer();

    updateSocialCircles();
}

function updateSocialCircles() {
	theCircleCenters = socialDataManager.getSocialClustersCenters();
	theCircleRadius = socialDataManager.getSocialClustersRadius();
}

function drawSocialCircles(theProgram, p, mv) 
{
	gl.useProgram(theProgram);
	
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "projectionMatrix"),false, flatten(p));
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "modelViewMatrix"),false, flatten(mv));

	for(var a = 0; a < theCircleCenters.length; ++a) {
		gl.uniform1f( gl.getUniformLocation(theSocialCircleProgram, "radius"), theCircleRadius[a]);	
		gl.uniform4fv( gl.getUniformLocation(theProgram, "center"), flatten(theCircleCenters[a]));

		var thePoints = [];

		var displace = 0.04;

		thePoints.push(add(theCircleCenters[a], vec4(-displace, 0.0, -displace, 0.0)));
		thePoints.push(add(theCircleCenters[a], vec4(displace, 0.0, -displace, 0.0)));
		thePoints.push(add(theCircleCenters[a], vec4(displace, 0.0, displace, 0.0)));
		thePoints.push(add(theCircleCenters[a], vec4(-displace, 0.0, displace, 0.0)));

		// Load data in VBOs
		gl.bindBuffer(gl.ARRAY_BUFFER, theSocialCircleVBOPoints);
    	gl.bufferData(gl.ARRAY_BUFFER, flatten(thePoints), gl.STATIC_DRAW);	

    	// Associate out shader variables with our data buffer
    	var vPosition = gl.getAttribLocation(theProgram, "vPosition");
    	gl.bindBuffer(gl.ARRAY_BUFFER, theSocialCircleVBOPoints);
    	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    	gl.enableVertexAttribArray(vPosition);
	
    	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}
}

// ============================================================================
// Cluster texture creation
//  It must make use of the datasetClusters variable declared at readFile.js
// ============================================================================
var clusterTexture;
var clustersAlpha = 255;
var clusterColors = [
	vec4(255, 255, 255, 0),   // cluster 0 - no meaning actually
	vec4(255, 0, 0, clustersAlpha), // cluster 1
	vec4(0, 255, 0, clustersAlpha), // cluster 2
	vec4(0, 0, 255, clustersAlpha), // cluster 3
	vec4(128, 128, 0, clustersAlpha),// cluster 4
	vec4(64, 64, 64, clustersAlpha)  // cluster 5
];

var texMultiply = 10;
var clusterTexWidth = dataColumns * texMultiply;
var clusterTexHeight = dataRows * texMultiply;

function createClustersTexture() {

	clusterTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, clusterTexture);

	var clusterTexels = createClustersTexData();

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, clusterTexWidth, clusterTexHeight, 0, gl.RGBA,
				  gl.UNSIGNED_BYTE, clusterTexels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
}

function createClustersTexData() {

	var texels = new Uint8Array(4*clusterTexHeight*clusterTexWidth);  // dataRows and dataColumns are 
		   															  // created at vertices.js
	
	for(var i = 0; i < clusterTexHeight; ++i) {
		for(var j = 0; j < clusterTexWidth; ++j) {
		
			var clusterValue = rawData.datasetClusters[Math.floor(i/texMultiply)*dataColumns + Math.floor(j/(texMultiply))]; 
			
			texels[4*i*clusterTexWidth + 4*j]     = clusterColors[clusterValue][0];
			texels[4*i*clusterTexWidth + 4*j + 1] = clusterColors[clusterValue][1];
			texels[4*i*clusterTexWidth + 4*j + 2] = clusterColors[clusterValue][2];
			texels[4*i*clusterTexWidth + 4*j + 3] = clusterColors[clusterValue][3];
		
		}
	}

	return texels;
}

// ============================================================================
// Weather map related data structures and functions
// ============================================================================
var theWeatherMapVBOPoints;
var theWeatherTexVBOPoints;
var theWeatherMapProgram;
var theWeatherMapPoints = [];
var weatherMapYCoord = -nebraskaMapYCoord;
var theWeatherMapVertices = [
	vec4(-mapWorldWidth, weatherMapYCoord, mapWorldHeight, 1.0),
	vec4(mapWorldWidth, weatherMapYCoord, mapWorldHeight, 1.0),
	vec4(mapWorldWidth, weatherMapYCoord, -mapWorldHeight, 1.0),
	vec4(-mapWorldWidth, weatherMapYCoord, -mapWorldHeight, 1.0)
	];
var theWeatherTexCoord = [
	vec2(0.0,0.0),
	vec2(1.0,0,0),
	vec2(1.0,1.0),
	vec2(0.0,1.0)
	];

function weatherMapQuad(a,b,c,d) {
	theWeatherMapPoints.push(theWeatherMapVertices[a]);
	theWeatherMapPoints.push(theWeatherMapVertices[b]);
	theWeatherMapPoints.push(theWeatherMapVertices[c]);
	theWeatherMapPoints.push(theWeatherMapVertices[d]);
}
	
function initWeatherMap()
{	
	weatherMapQuad(0,1,2,3);

	// Load shaders and initialize attribute buffers
	theWeatherMapProgram = initShaders(gl, "weathermap-vertex-shader", "weathermap-fragment-shader");
    gl.useProgram(theWeatherMapProgram);
    
    // Create VBOs and load the data into the VBOs
    theWeatherMapVBOPoints = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, theWeatherMapVBOPoints);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(theWeatherMapPoints), gl.STATIC_DRAW);
	
	theWeatherTexVBOPoints = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, theWeatherTexVBOPoints);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(theWeatherTexCoord), gl.STATIC_DRAW);
}

function drawWeatherMap(theProgram, p, mv) 
{
	gl.useProgram(theProgram);
	useTexture(theProgram, clusterTexture);
	
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "projectionMatrix"),false, flatten(p));
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "modelViewMatrix"),false, flatten(mv));
	gl.uniform1f( gl.getUniformLocation(theProgram, "texWidth"), texWidth);
	gl.uniform1f( gl.getUniformLocation(theProgram, "texHeight"), texHeight);
	
    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation(theProgram, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, theWeatherMapVBOPoints);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
	var vTexCoord = gl.getAttribLocation(theProgram, "vTexCoord");
	gl.bindBuffer(gl.ARRAY_BUFFER, theWeatherTexVBOPoints);
	gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vTexCoord);
	
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}


// ============================================================================
// Grid map points
// ============================================================================
var theGridMapVBOPoints;
var theClusterClassVBOPoints;
var thePointProgram;
var theGridMapPoints;
var theClusterClass;
var pointSize = 6.0;
var pointColor = vec4(1.0, 0.0, 0.0, 1.0);

function initGrid()
{	
//    console.log(mapWorldWidth);
//    console.log(mapWorldHeight);
//    console.log(theMapVertices);
	theGridMapPoints = gridCoordinates(theMapVertices[0], theMapVertices[3], theMapVertices[2], nebraskaMapYCoord);
	gridMapXZ = gridCoordinatesXZ(theMapVertices[0], theMapVertices[3], theMapVertices[2]);

	//  This initialization is made with the purpose of debugging the mapping between i,j indices and 
	//  the array gridMapXZ indices
	theClusterClass = [];
	theClusterClass.push(1.0);
	theClusterClass.push(2.0);
	theClusterClass.push(3.0);
	for(var n = 3; n < dataColumns*dataRows; ++n) {
		if(n == 11*dataColumns + 16)
			theClusterClass.push(3.0);
		else
			theClusterClass.push(1.0);
	}


	// Load shaders and initialize attribute buffers
	thePointProgram = initShaders(gl, "point-vertex-shader", "point-fragment-shader");
    gl.useProgram(thePointProgram);
    
    // Create VBOs and load the data into the VBOs
    theGridMapVBOPoints = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, theGridMapVBOPoints);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(theGridMapPoints), gl.STATIC_DRAW);

    theClusterClassVBOPoints = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, theClusterClassVBOPoints);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(theClusterClass), gl.STATIC_DRAW);
}

function drawGridPoints(theProgram, p, mv) 
{
	if(theGridMapPoints.length !== theClusterClass.length) {
		console.log("Number of grid map and cluster points doesn't match");
		return;
	}

	gl.useProgram(thePointProgram);
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "projectionMatrix"),false, flatten(p));
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "modelViewMatrix"),false, flatten(mv));
	gl.uniform1f( gl.getUniformLocation(theProgram, "pointSize"), pointSize);
	gl.uniform4fv( gl.getUniformLocation(theProgram, "pointColor"), flatten(pointColor));
	
    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation(theProgram, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, theGridMapVBOPoints);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var vCluster = gl.getAttribLocation(theProgram, "vCluster");
    gl.bindBuffer(gl.ARRAY_BUFFER, theClusterClassVBOPoints);
    gl.vertexAttribPointer(vCluster, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vCluster);
	
	gl.drawArrays(gl.POINTS, 0, theGridMapPoints.length);
}

// ============================================================================
// Weather-Social links related data structures and functions
// ============================================================================
var theLinkVBOPoints;
var theLinkVBOColors;
var theLinkProgram;
var theLinkPoints = [];
var theLinkColors = [];

function CalcDistance(p1, p2)
{
    var x = p1[0] - p2[0];
    var y = p1[1] - p2[1];
    var z = p1[2] - p2[2];
    return Math.sqrt(x * x + y * y + z * z);
}

function norVector(n)
{
    var length = Math.sqrt((n[0] * n[0]) + (n[1] * n[1]) + (n[2] * n[2]));
    n[0] = n[0] / length;
    n[1] = n[1] / length;
    n[2] = n[2] / length;
    
    return n;
}

// creat a new 3D line where the center is (x, y, z) and the radius
function new_line(p1, p2, sgm, width) 
{
    var line = new Object();
    
    var subLength = CalcDistance(p1, p2) / (P_initial + 1);
    
    line.m_nSegment     = P_initial + 1;
    line.m_fWidth       = width;
    line.m_pEdge        = [];
    line.m_pSource      = [];
    line.m_pSink        = [];
    line.m_pSegment     = [];
    line.m_pForce       = [];
    line.m_pLeftBound   = [];
    line.m_pRightBound  = [];
    line.m_pNormal      = [];
    line.m_pAttr        = [];
    line.vtr            = [];
    line.length         = CalcDistance(p1, p2);
    line.kp             = ATTRACTION / line.length;
    
    if (p1[1] <= p2[1]) {
        line.m_pSource = vec3(p1[0], p1[1], p1[2]);
        line.m_pSink   = vec3(p2[0], p2[1], p2[2]);
    } else {
        line.m_pSource = vec3(p2[0], p2[1], p2[2]);
        line.m_pSink   = vec3(p1[0], p1[1], p1[2]);
    }
    
    line.m_pSegment[0] = line.m_pSource[0];
    line.m_pSegment[1] = line.m_pSource[1];
    line.m_pSegment[2] = line.m_pSource[2];
    
    line.m_pForce[0] = 0.0;
    line.m_pForce[1] = 0.0;
    line.m_pForce[2] = 0.0;
    
    line.vtr[0] = line.m_pSink[0] - line.m_pSource[0]; 
    line.vtr[1] = line.m_pSink[1] - line.m_pSource[1]; 
    line.vtr[2] = line.m_pSink[2] - line.m_pSource[2];
    
    var vtr = line.vtr;
    vtr = norVector(vtr);
    
    vtr[0] = vtr[0] * subLength;
    vtr[1] = vtr[1] * subLength;
    vtr[2] = vtr[2] * subLength;
    
    var x, y, z;
    var tmp = [];
    tmp[0] = line.m_pSource[0];
    tmp[1] = line.m_pSource[1];
    tmp[2] = line.m_pSource[2];
    for (var i = 1; i < line.m_nSegment; i++) {
        tmp[0] += vtr[0];
        tmp[1] += vtr[1];
        tmp[2] += vtr[2];
        
        x = tmp[0];
        y = tmp[1];
        z = tmp[2];
        line.m_pSegment[i * 3 + 0] = x;
        line.m_pSegment[i * 3 + 1] = y;
        line.m_pSegment[i * 3 + 2] = z;
        
        line.m_pForce[i * 3 + 0] = 0.0;
        line.m_pForce[i * 3 + 1] = 0.0;
        line.m_pForce[i * 3 + 2] = 0.0;
    }
    line.m_pSegment[line.m_nSegment * 3 + 0] = line.m_pSink[0];
    line.m_pSegment[line.m_nSegment * 3 + 1] = line.m_pSink[1];
    line.m_pSegment[line.m_nSegment * 3 + 2] = line.m_pSink[2];
    
    line.m_pForce[line.m_nSegment * 3 + 0] = 0.0;
    line.m_pForce[line.m_nSegment * 3 + 1] = 0.0;
    line.m_pForce[line.m_nSegment * 3 + 2] = 0.0;
    
    for (var i = 0; i <= line.m_nSegment; i++) {
        line.m_pAttr[i] = 1.0;
    }
    
    return line;
}

function resetNormal()
{
    var tmp_eye = [];
    var tan     = [];
    var side    = [];
    var n       = [];

    /*
     * the vector of the mid subpoints
     */
    for (var i = 0; i < m_vLines.length; i++) {
        for (var j = 0; j < n_Segment; j++) {
            tan[0] = m_vLines[i].m_pSegment[(j + 1) * 3 + 0] - m_vLines[i].m_pSegment[j * 3 + 0];
            tan[1] = m_vLines[i].m_pSegment[(j + 1) * 3 + 1] - m_vLines[i].m_pSegment[j * 3 + 1];
            tan[2] = m_vLines[i].m_pSegment[(j + 1) * 3 + 2] - m_vLines[i].m_pSegment[j * 3 + 2];

            tmp_eye[0] = eye[0];
            tmp_eye[1] = eye[1];
            tmp_eye[2] = eye[2];

            side[0] = tmp_eye[1] * tan[2] - tmp_eye[2] * tan[1];
            side[1] = tmp_eye[2] * tan[0] - tmp_eye[0] * tan[2];
            side[2] = tmp_eye[0] * tan[1] - tmp_eye[1] * tan[0];

            side = norVector(side);
            m_vLines[i].m_pLeftBound[j * 3 + 0] = side[0] * m_vLines[i].m_fWidth + m_vLines[i].m_pSegment[j * 3 + 0];
            m_vLines[i].m_pLeftBound[j * 3 + 1] = side[1] * m_vLines[i].m_fWidth + m_vLines[i].m_pSegment[j * 3 + 1];
            m_vLines[i].m_pLeftBound[j * 3 + 2] = side[2] * m_vLines[i].m_fWidth + m_vLines[i].m_pSegment[j * 3 + 2];
            m_vLines[i].m_pRightBound[j * 3 + 0] = -side[0] * m_vLines[i].m_fWidth + m_vLines[i].m_pSegment[j * 3 + 0];
            m_vLines[i].m_pRightBound[j * 3 + 1] = -side[1] * m_vLines[i].m_fWidth + m_vLines[i].m_pSegment[j * 3 + 1];
            m_vLines[i].m_pRightBound[j * 3 + 2] = -side[2] * m_vLines[i].m_fWidth + m_vLines[i].m_pSegment[j * 3 + 2];
        }

        /*
         * the vector of the last subpoint
         */
        tan[0] = m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 0]
               - m_vLines[i].m_pSegment[(m_vLines[i].m_nSegment - 1) * 3 + 0];
        tan[1] = m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 1]
               - m_vLines[i].m_pSegment[(m_vLines[i].m_nSegment - 1) * 3 + 1];
        tan[2] = m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 2]
               - m_vLines[i].m_pSegment[(m_vLines[i].m_nSegment - 1) * 3 + 2];

        tmp_eye[0] = eye[0];
        tmp_eye[1] = eye[1];
        tmp_eye[2] = eye[2];

        side[0] = tmp_eye[1] * tan[2] - tmp_eye[2] * tan[1];
        side[1] = tmp_eye[2] * tan[0] - tmp_eye[0] * tan[2];
        side[2] = tmp_eye[0] * tan[1] - tmp_eye[1] * tan[0];

        side = norVector(side);
        m_vLines[i].m_pLeftBound[m_vLines[i].m_nSegment * 3 + 0] = side[0] * m_vLines[i].m_fWidth
                               + m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 0];
        m_vLines[i].m_pLeftBound[m_vLines[i].m_nSegment * 3 + 1] = side[1] * m_vLines[i].m_fWidth
                               + m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 1];
        m_vLines[i].m_pLeftBound[m_vLines[i].m_nSegment * 3 + 2] = side[2] * m_vLines[i].m_fWidth
                               + m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 2];
        m_vLines[i].m_pRightBound[m_vLines[i].m_nSegment * 3 + 0] = -side[0] * m_vLines[i].m_fWidth
                               + m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 0];
        m_vLines[i].m_pRightBound[m_vLines[i].m_nSegment * 3 + 1] = -side[1] * m_vLines[i].m_fWidth
                               + m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 1];
        m_vLines[i].m_pRightBound[m_vLines[i].m_nSegment * 3 + 2] = -side[2] * m_vLines[i].m_fWidth
                               + m_vLines[i].m_pSegment[m_vLines[i].m_nSegment * 3 + 2];
    }
}

/*
 *calculate the attraction force
 */
function calAttraction(A, B, springLength, kp) {
    var balance = springLength - 0.0;
    
    // Hooke's Law: F = -kx
    var force = kp * balance;
    var v_force = vec3(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    var n_force = norVector(v_force);
    
    var Force;
//    if (springLength <= MINDIS) {
//        Force = vec3(0.0, 0.0, 0.0);
//    } else {
        Force = vec3(force * n_force[0], force * n_force[1], force * n_force[2]); 
//    }
    
    return Force;
}

/*
 *calculate the repulsive force
 */
function calRepulsion(A, B, particleLength) {
    // Coulomb's Law: F = k(Qq/r^2)
    var force = (REPULSION / particleLength);
    var v_force = vec3(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    var n_force = norVector(v_force);
    
    var Force;
    if (particleLength <= MINDIS || particleLength >= MAXDIS) {
        Force = vec3(0.0, 0.0, 0.0);
    } else {
        Force = vec3(force * n_force[0], force * n_force[1], force * n_force[2]);
    }
    return Force;
}

function addForce(A, B) {
    var xForce = A[0] + B[0];
    var yForce = A[1] + B[1];
    var zForce = A[2] + B[2];
    var Force = vec3(xForce, yForce, zForce);
    return Force;
}

function edge_midpoint(p1, p2){
        var vtr = vec3(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
        var length = CalcDistance(p1, p2);
        vtr = normalize(vtr);
        vtr[0] = vtr[0] * (length / 2);
        vtr[1] = vtr[1] * (length / 2);
        vtr[2] = vtr[2] * (length / 2);
        var middle   = vec3(p1[0] + vtr[0], 
                            p1[1] + vtr[1], 
                            p1[2] + vtr[2]);
        return middle;
}

/*** Edge Division Calculation Methods ***/
function update_edge_divisions(P) {
    console.log("Execute " + P);
    for (var j = 0; j < m_vLines.length; j++) {
        for (var k = 0; k < m_vLines[j].length; k++) {
            if ( P == 1 ) {
                var new_subdivision_points = [];
                var midPoint               = [];
                new_subdivision_points.push(m_vLines[j][k].m_pSource[0]); // source
                new_subdivision_points.push(m_vLines[j][k].m_pSource[1]);
                new_subdivision_points.push(m_vLines[j][k].m_pSource[2]);
                midPoint = edge_midpoint(m_vLines[j][k].m_pSource, m_vLines[j][k].m_pSink);
                new_subdivision_points.push(midPoint[0]); // mid point
                new_subdivision_points.push(midPoint[1]);
                new_subdivision_points.push(midPoint[2]);
                new_subdivision_points.push(m_vLines[j][k].m_pSink[0]); // target
                new_subdivision_points.push(m_vLines[j][k].m_pSink[1]);
                new_subdivision_points.push(m_vLines[j][k].m_pSink[2]);
                m_vLines[j][k].m_pSegment = new_subdivision_points;
            } else {
                var divided_edge_length = m_vLines[j][k].length;
                var segment_length  	= divided_edge_length / (P+1);
                var current_segment_length = segment_length;
                var new_subdivision_points = [];
                new_subdivision_points.push(m_vLines[j][k].m_pSource[0]); //source
                new_subdivision_points.push(m_vLines[j][k].m_pSource[1]);
                new_subdivision_points.push(m_vLines[j][k].m_pSource[2]);

                for (var i = 1; i <= P + 1; i++) {
                    var source = [];
                    var sink   = [];
                    source[0]  = m_vLines[j][k].m_pSegment[i * 3 + 0];
                    source[1]  = m_vLines[j][k].m_pSegment[i * 3 + 1];
                    source[2]  = m_vLines[j][k].m_pSegment[i * 3 + 2];
                    sink[0]    = m_vLines[j][k].m_pSegment[(i - 1) * 3 + 0];
                    sink[1]    = m_vLines[j][k].m_pSegment[(i - 1) * 3 + 1];
                    sink[2]    = m_vLines[j][k].m_pSegment[(i - 1) * 3 + 2];
                    var old_segment_length = CalcDistance(source, sink);

                    while (old_segment_length > current_segment_length) {
                        var percent_position = current_segment_length / old_segment_length;
                        var new_subdivision_point_x = m_vLines[j][k].m_pSegment[(i - 1) * 3 + 0];
                        var new_subdivision_point_y = m_vLines[j][k].m_pSegment[(i - 1) * 3 + 1];
                        var new_subdivision_point_z = m_vLines[j][k].m_pSegment[(i - 1) * 3 + 2];

                        new_subdivision_point_x += percent_position*(m_vLines[j][k].m_pSegment[i * 3 + 0] - m_vLines[j][k].m_pSegment[(i - 1) * 3 + 0]);
                        new_subdivision_point_y += percent_position*(m_vLines[j][k].m_pSegment[i * 3 + 1] - m_vLines[j][k].m_pSegment[(i - 1) * 3 + 1]);
                        new_subdivision_point_z += percent_position*(m_vLines[j][k].m_pSegment[i * 3 + 2] - m_vLines[j][k].m_pSegment[(i - 1) * 3 + 2]);
                        new_subdivision_points.push(new_subdivision_point_x);
                        new_subdivision_points.push(new_subdivision_point_y);
                        new_subdivision_points.push(new_subdivision_point_z);

                        old_segment_length     -= current_segment_length;
                        current_segment_length 	= segment_length;
                    }
                    current_segment_length -= old_segment_length;
                }
                new_subdivision_points.push(m_vLines[j][k].m_pSink[0]); //target
                new_subdivision_points.push(m_vLines[j][k].m_pSink[1]);
                new_subdivision_points.push(m_vLines[j][k].m_pSink[2]);
                m_vLines[j][k].m_pSegment = new_subdivision_points;
            }
        }
    }
}

function UpdateForce(P)
{
    var attr_0_force = [];
    var attr_1_force = [];
    var repul;
    var repul_force  = [];
    var tmp1;
    var tmp1_force   = [];
    var tmp2         = [];
    var tmp2_force   = [];
    
    tmp2[0] = 0.0;
    tmp2[1] = 0.0;
    tmp2[2] = 0.0;
    tmp2_force[0] = 0.0;
    tmp2_force[1] = 0.0;
    tmp2_force[2] = 0.0;
    
    for (var i = 0; i < m_vLines.length; i++) {
        for (var k = 0; k < m_vLines[i].length; k++) {
            for (var j = 1; j < P + 1; j++) {
                var attr_0 = [];
                var attr_1 = [];
                attr_0[0] = m_vLines[i][k].m_pSegment[j * 3 + 0];
                attr_0[1] = m_vLines[i][k].m_pSegment[j * 3 + 1];
                attr_0[2] = m_vLines[i][k].m_pSegment[j * 3 + 2];

                attr_1[0] = m_vLines[i][k].m_pSegment[(j - 1) * 3 + 0];
                attr_1[1] = m_vLines[i][k].m_pSegment[(j - 1) * 3 + 1];
                attr_1[2] = m_vLines[i][k].m_pSegment[(j - 1) * 3 + 2];

                attr_0_force = calAttraction(attr_0,
                                             attr_1,
                                CalcDistance(attr_0,
                                             attr_1), 
                                m_vLines[i][k].kp);

                var attr_2 = [];
                var attr_3 = [];
                attr_2[0] = m_vLines[i][k].m_pSegment[j * 3 + 0];
                attr_2[1] = m_vLines[i][k].m_pSegment[j * 3 + 1];
                attr_2[2] = m_vLines[i][k].m_pSegment[j * 3 + 2];

                attr_3[0] = m_vLines[i][k].m_pSegment[(j + 1) * 3 + 0];
                attr_3[1] = m_vLines[i][k].m_pSegment[(j + 1) * 3 + 1];
                attr_3[2] = m_vLines[i][k].m_pSegment[(j + 1) * 3 + 2];

                attr_1_force = calAttraction(attr_2,
                                             attr_3,
                                CalcDistance(attr_2,
                                             attr_3),
                                m_vLines[i][k].kp);

                tmp1_force = addForce(attr_0_force, attr_1_force);

                tmp2[0] = 0.0;
                tmp2[1] = 0.0;
                tmp2[2] = 0.0;
                for (var m = 0; m < m_vLines[i].length; m++) {
                    if (k != m) {
                        var attr_4 = [];
                        var attr_5 = [];
                        attr_4[0] = m_vLines[i][k].m_pSegment[j * 3 + 0];
                        attr_4[1] = m_vLines[i][k].m_pSegment[j * 3 + 1];
                        attr_4[2] = m_vLines[i][k].m_pSegment[j * 3 + 2];

                        attr_5[0] = m_vLines[i][m].m_pSegment[j * 3 + 0];
                        attr_5[1] = m_vLines[i][m].m_pSegment[j * 3 + 1];
                        attr_5[2] = m_vLines[i][m].m_pSegment[j * 3 + 2];


                        repul_force = calRepulsion(attr_4,
                                                   attr_5,
                                      CalcDistance(attr_4,
                                                   attr_5));

                        tmp2_force  = addForce(repul_force, tmp2);
                        tmp2        = tmp2_force;
                    }
                }

                var total = [];
                total[0] = 0.0;
                total[1] = 0.0;
                total[2] = 0.0;

                total = addForce(tmp1_force, tmp2_force);

                m_vLines[i][k].m_pForce[j * 3 + 0] = total[0];
                m_vLines[i][k].m_pForce[j * 3 + 1] = total[1];
                m_vLines[i][k].m_pForce[j * 3 + 2] = total[2];

            }
        }
    }
}
function UpdateLength(P)
{
    var length;
    for (var i = 0; i < m_vLines.length; i++) {
        for (var k = 0; k < m_vLines[i].length; k++) {
            length = 0;
            for (var j = 1; j <= P + 1; j++) {
                var source = [];
                var sink   = [];
                source[0] = m_vLines[i][k].m_pSegment[j * 3 + 0];
                source[1] = m_vLines[i][k].m_pSegment[j * 3 + 1];
                source[2] = m_vLines[i][k].m_pSegment[j * 3 + 2];
                sink[0]   = m_vLines[i][k].m_pSegment[(j - 1) * 3 + 0];
                sink[1]   = m_vLines[i][k].m_pSegment[(j - 1) * 3 + 1];
                sink[2]   = m_vLines[i][k].m_pSegment[(j - 1) * 3 + 2];
                var segment_length;
                segment_length = CalcDistance(source, sink);
                length += segment_length;
            }
            m_vLines[i][k].length = length;
            m_vLines[i][k].kp = ATTRACTION / m_vLines[i][k].length;
        }
    }
}

var ATTRACTION = 0.1;
var REPULSION =  0.001;

var INTERVAL = 0.1;

var MINFORCE = 1.0e-6;
var MINDIS = 0.03;
var MAXDIS = 0.8;

var SEGMENT = 1;
var LINEWIDTH = 0.05;

var n_LineNum = 0;
var n_Segment = SEGMENT;

var m_vLines = [];

var S_initial = 0.1;		// init. distance to move points
var	P_initial = 1; 			// init. subdivision number
var	P_rate    = 2;			// subdivision rate increase
var	C         = 6; 			// number of cycles to perform
var	I_initial = 50; 		// init. number of iterations for cycle
var	I_rate    = 0.6666667;  // rate at which iteration number decreases i.e. 2/3

// update the vertex, line, polygon buffer
function UpdateBuffer()
{   
    var S = S_initial;
    var I = I_initial;
    var P = P_initial;
    var INTERVAL = S_initial;
    var current_P;
    update_edge_divisions(P);
    for (var cycle = 0; cycle < C; cycle++) {
        for (var c = 0; c < I; c++) {
            UpdateForce(P);
            for (var i = 0; i < m_vLines.length; i++) {
                for(var k = 0; k < m_vLines[i].length; k++) {
                    for (var j = 1; j < P + 1; j++) {
                        m_vLines[i][k].m_pSegment[j * 3 + 0] += INTERVAL * m_vLines[i][k].m_pForce[j * 3 + 0];
                        m_vLines[i][k].m_pSegment[j * 3 + 1] += INTERVAL * m_vLines[i][k].m_pForce[j * 3 + 1];
                        m_vLines[i][k].m_pSegment[j * 3 + 2] += INTERVAL * m_vLines[i][k].m_pForce[j * 3 + 2];
                    }
                }
            }
            UpdateLength(P);
        }
        //prepare for next cycle
        current_P = P;
        S = S / 2;
        INTERVAL = INTERVAL / 2;
        P = P * P_rate;
        I = I_rate * I;
        update_edge_divisions(P);
    }
    n_Segment = P + 1;
}

function initWeatherSocialLink()
{	
    n_Segment = P_initial + 1;
	///////////////////////////////////////////////////////////////////////////////////////
	//  Use this if you want to see no distinction over the different clusters at all.
	//
	edgeManager.createEdges(weatherClusterManager, socialDataManager);
	var theEdges = edgeManager.edges;
    var theColors = edgeManager.edgesColor;
	m_vLines[0] = [];
    for (var i = 0; i < edgeManager.edges.length - 1; i = i + 2) {
        var line = new_line(edgeManager.edges[i], edgeManager.edges[i + 1], n_Segment, LINEWIDTH);
        m_vLines[0].push(line);
    }
	///////////////////////////////////////////////////////////////////////////////////////
	
	///////////////////////////////////////////////////////////////////////////////////////
	//  Use this if there should be no interaction between the positive and negatives 
	//  edges of a same social cluster. The for used here is the same as used 15 lines below
	//
	// bundleEdgeManager.createEdges(weatherClusterManager, socialDataManager);
	// var theEdges = bundleEdgeManager.bundledEdges;
	// var theColors = bundleEdgeManager.bundledEdgesColor;
	// for (var i = 0; i < theEdges.length; i++) {
 //  		m_vLines[i] = [];
 //      for (var j = 0; j < theEdges[i].length - 1; j = j + 2) {
 //          var line = new_line(theEdges[i][j], theEdges[i][j + 1], n_Segment, LINEWIDTH);
 //          m_vLines[i].push(line);
 //      }
 //  	}
   	/////////////////////////////////////////////////////////////////////////////////////

   	///////////////////////////////////////////////////////////////////////////////////////
	//  Use this one if you want to see both the positive and negative edges of a specific
	//  data cluster to interact with one another in the bundling process.
    //
	// bundleEdgeManager.createEdgesNoClassification(weatherClusterManager, socialDataManager);
	// var theEdges = bundleEdgeManager.bundledEdgesNoClass;
 //    var theColors = bundleEdgeManager.bundledEdgesNoClassColor;
	// for (var i = 0; i < theEdges.length; i++) {
 //  		m_vLines[i] = [];
 //      for (var j = 0; j < theEdges[i].length - 1; j = j + 2) {
 //          var line = new_line(theEdges[i][j], theEdges[i][j + 1], n_Segment, LINEWIDTH);
 //          m_vLines[i].push(line);
 //      }
 //  	}
   	///////////////////////////////////////////////////////////////////////////////////////

//    for(var index = 0; index < m_vLines.length; index++)
//    	UpdateBuffer(index);
    UpdateBuffer();

    var size0 = 0;
    var size1 = 0;
    var lineCount = 0;             
    console.log(m_vLines);  
    console.log(m_vLines.length);  
    for (var i = 0; i < m_vLines.length; i++) {                         
    	for(var k = 0; k < m_vLines[i].length; k++) {
        	for (var j = 0; j < n_Segment; j++) {
	            theLinkPoints[size0++] = m_vLines[i][k].m_pSegment[j * 3 + 0];
	            theLinkPoints[size0++] = m_vLines[i][k].m_pSegment[j * 3 + 1];
	            theLinkPoints[size0++] = m_vLines[i][k].m_pSegment[j * 3 + 2];
	            theLinkPoints[size0++] = 1;
	            theLinkPoints[size0++] = m_vLines[i][k].m_pSegment[(j + 1) * 3 + 0];
	            theLinkPoints[size0++] = m_vLines[i][k].m_pSegment[(j + 1) * 3 + 1];
	            theLinkPoints[size0++] = m_vLines[i][k].m_pSegment[(j + 1) * 3 + 2];
	            theLinkPoints[size0++] = 1;

	            theLinkColors[size1++] = theColors[lineCount][0];
	            theLinkColors[size1++] = theColors[lineCount][1];
	            theLinkColors[size1++] = theColors[lineCount][2];
	            theLinkColors[size1++] = theColors[lineCount][3];
				theLinkColors[size1++] = theColors[lineCount][0];
	            theLinkColors[size1++] = theColors[lineCount][1];
	            theLinkColors[size1++] = theColors[lineCount][2];
	            theLinkColors[size1++] = theColors[lineCount][3];
	        }
	        ++lineCount;
    	}
    }
    
//    console.log(theLinkPoints);
    
	// Load shaders and initialize attribute buffers
	theLinkProgram = initShaders(gl, "weathersociallink-vertex-shader", "weathersociallink-fragment-shader");
    gl.useProgram(theLinkProgram);
    
    // Create VBOs and load the data into the VBOs
    theLinkVBOPoints = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, theLinkVBOPoints);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(theLinkPoints), gl.STATIC_DRAW);
    
    theLinkVBOColors = gl.createBuffer();                                           //Added by Jieting
    gl.bindBuffer(gl.ARRAY_BUFFER, theLinkVBOColors);                               //Added by Jieting
    gl.bufferData(gl.ARRAY_BUFFER, flatten(theLinkColors), gl.STATIC_DRAW);         //Added by Jieting
}

function drawWeatherSocialLinks(theProgram, p, mv) 
{
	gl.useProgram(theProgram);
	
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "projectionMatrix"),false, flatten(p));
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "modelViewMatrix"),false, flatten(mv));
	
	// Associate out shader variables with our data buffer
	var vPosition = gl.getAttribLocation(theProgram, "vPosition");
	gl.bindBuffer(gl.ARRAY_BUFFER, theLinkVBOPoints);
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);	
    
    var vColor = gl.getAttribLocation(theProgram, "vColor");       //Added by Jieting
	gl.bindBuffer(gl.ARRAY_BUFFER, theLinkVBOColors);              //Added by Jieting
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);      //Added by Jieting
	gl.enableVertexAttribArray(vColor);	                           //Added by Jieting

	var count = 0;
	for(var i = 0; i < m_vLines.length; ++i)
		for(var o in m_vLines[i])
			++count;
    console.log(count);
    gl.lineWidth(1.5);
    gl.drawArrays(gl.LINES, 0, n_Segment * count * 2);    
}

var theSocialPoints = [];
var theSocialProgram;
var theSocialVBOPoints;
var index = [];
var theSphereIndex;

function initSocialPoint()
{
    socialPoint = socialDataManager.socialData;
    index.push(0.0);
    index.push(1.0);
    index.push(2.0);
    index.push(3.0);
    console.log(socialPoint);
    console.log(socialPoint.length);
    
    var size0 = 0;
    for (var i = 0; i < socialPoint.length; i++) {
        theSocialPoints[size0++] = socialPoint[i].position[0];
        theSocialPoints[size0++] = socialPoint[i].position[1];
        theSocialPoints[size0++] = socialPoint[i].position[2];
        theSocialPoints[size0++] = socialPoint[i].position[3];
    }
    
    console.log(theSocialPoints);
    
    // Load shaders and initialize attribute buffers
	theSocialProgram = initShaders(gl, "socialpoint-vertex-shader", "socialpoint-fragment-shader");
    gl.useProgram(theSocialProgram);
    
    // Create VBOs and load the data into the VBOs
    theSocialVBOPoints = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, theSocialVBOPoints);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(theSocialPoints), gl.STATIC_DRAW);
    
//    theSphereIndex = gl.createBuffer();
//    gl.bindBuffer(gl.ARRAY_BUFFER, theSphereIndex);
//    gl.bufferData(gl.ARRAY_BUFFER, flatten(index), gl.STATIC_DRAW);
}

function drawSocialPoint(theProgram, p, mv)
{
    gl.useProgram(theProgram);
	
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "projectionMatrix"),false, flatten(p));
	gl.uniformMatrix4fv( gl.getUniformLocation(theProgram, "modelViewMatrix"),false, flatten(mv));
	
	// Associate out shader variables with our data buffer
	var vPosition = gl.getAttribLocation(theProgram, "vPosition");
	gl.bindBuffer(gl.ARRAY_BUFFER, theSocialVBOPoints);
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);	
    
//    var nIndex = gl.getAttribLocation(theProgram, "nIndex");
//    gl.bindBuffer(gl.ARRAY_BUFFER, theSphereIndex);  
//    gl.vertexAttribPointer(nIndex, 1, gl.FLOAT, false, 0, 0);
//    gl.enableVertexAttribArray(nIndex);
//    gl.enable(gl.POINT_SPRITE);
//    gl.enable(gl.VERTEX_PROGRAM_POINT_SIZE);
    gl.drawArrays(gl.POINTS, 0, socialPoint.length);
}



// ============================================================================

function initApplication() {

	rawData.readAllFiles();

	loadNebraskaTexture();
	createClustersTexture();
	blurClusterTexture();

	initMap();
	initWeatherMap();
	initGrid();

	weatherClusterManager.createWeatherClustersFromInput();
	socialDataManager.createSocialDataFromInput();
	
	initWeatherSocialLink();
	
	initCircleProgram();
    
    initSocialPoint();

	render();
}

// ============================================================================
// WebGL Initialization
// ============================================================================

window.onload = function init()
{	
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert( "WebGL isn't available" ); 
    }
    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
    // Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(0.99, 0.99, 0.99, 1.0 );	
	theAspect = canvas.width * 1.0 / canvas.height;

	initApplication();

	canvas.addEventListener("mousedown", function(e){
 		var pos = getMousePos(e, this);
		var x = pos[0];
		var y = pos[1];
		
		if (e.button == 0) { 
			startMotion(x, y);
		} else if (e.button == 1) {
			startScale(x, y);
		}

		render();
    } );
    
    canvas.addEventListener("mousemove", function(e){
		var pos = getMousePos(e, this);   
		var x = pos[0];
		var y = pos[1];
		
		var curPos = [];
		var dx, dy, dz;

		/* compute position on hemisphere */
		trackball_ptov(x, y, curPos);
		
		if(theTrackingMove)
		{    
			/* compute the change in position 
			on the hemisphere */
			dx = curPos[0] - theLastPos[0];
			dy = curPos[1] - theLastPos[1];
			dz = curPos[2] - theLastPos[2];
			if (dx || dy || dz) 
			{
				/* compute theta and cross product */
				theAngle = 90.0 * Math.sqrt(dx*dx + dy*dy + dz*dz) / 180.0 * Math.PI;
				theAxis = cross(theLastPos, curPos);
                
				var q = trackball_vtoq(theAngle, theAxis);
		
				if (theInit) {
					theCurtQuat = q;
					theInit = false;
				} else {	
					theCurtQuat = multiplyQuat(q, theCurtQuat);
				}

				/* update position */
				theLastPos[0] = curPos[0];
				theLastPos[1] = curPos[1];
				theLastPos[2] = curPos[2];
			}
			
			render();
		} 

		if (theScalingMove) {
			if (theCurtX != x || theCurtY != y) {
        
				theScale += (theCurtY * 1.0 - y)/2.0 * 1.3 * theScale; // 2.0 - the windows height
				if (theScale <= 0.0) {
					theScale = 0.00000001;
				}
        
				theCurtX = x;
				theCurtY = y;
			}	
			
			render();
		}	

    });
   
    canvas.addEventListener("mouseup", function(e) {
		var pos = getMousePos(e, this);
		var x = pos[0];
		var y = pos[1];
		
		if (e.button == 0) { 
			stopMotion(x, y);
		} else if (e.button == 1) {
			stopScale(x, y);
		}
    });
    
    document.addEventListener("keydown", function(e) {
        var event = e || window.event;
        var key = event.keyCode;
        var moved = false;
        
        keyDown(key);
        translateCamera();
    } );

    document.addEventListener("keyup", function(e) {
        var event = e || window.event;
        var key = event.keyCode;
        var moved = false;

        keyUp(key);
    } );
};

// ============================================================================
// Rendering function
// ============================================================================
function render() 
{	
	gl.viewport( 0, 0, canvas.width, canvas.height );
//    gl.clearColor(0.99, 0.99, 0.99, 1.0 );	
    gl.clearColor(0.8, 0.8, 0.8, 1.0 );	
     gl.clearColor(1, 1, 1, 1.0 );	
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    var  p = perspective( theFovy, theAspect, theZNear, theZFar );
    //var p = ortho(-1.0, 1.0, -1.0, 1.0, 0.1, 1000);
	
    //modelview matrix
	var t = translate(0, 0, -2.0);
	var s = scale(theScale, theScale, theScale);
	var r = buildRotationMatrix(theCurtQuat);
	var mv = mat4();
	mv = mult(mv, t);
	mv = mult(mv, s);
	mv = mult(mv, r);
	
	drawNebraskaMap(theMapProgram, p, mv);
//	drawGridPoints(thePointProgram, p, mv);
//	drawSocialCircles(theSocialCircleProgram, p, mv);
	drawWeatherSocialLinks(theLinkProgram, p, mv);
   // drawSocialPoint(theSocialProgram, p, mv);
	drawWeatherMap(theWeatherMapProgram, p, mv);
}
