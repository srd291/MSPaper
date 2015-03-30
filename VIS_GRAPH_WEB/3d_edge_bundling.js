var gl;

//============================================================================
// Projection and modelview related data structures and functions
//============================================================================
// Projection transformation parameters
var	theFovy = 45.0;  		// Field-of-view in Y direction angle (in degrees)
var theAspect = 1.0;       // Viewport aspect ratio
var theZNear = 0.1;
var theZFar = 1000.0;

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

//Rotation related functions
function trackball_ptov(x, y,  v)
{
    var d, a;

	/* project x,y onto a hemisphere centered within width, height, note z is up here*/
    v[0] = x;
    v[1] = y;    
    d = v[0] * v[0] + v[1] * v[1];
	if (d > 1) {
		v[2] = 0.0;
	} else {
		v[2] = Math.sqrt(1.0 - d);
	}

	a = 1.0 / Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    v[0] *= a;    
	v[1] *= a;    
	v[2] *= a;
}

function trackball_vtoq(angle, axis)
{
	var c = Math.cos(angle/2.0);
	var s = Math.sin(angle/2.0);
	var a = 1.0 / Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
    
	var quat = [];
	
	quat[0] = c;
	quat[1] = axis[0] * a * s;
	quat[2] = axis[1] * a * s;
	quat[3] = axis[2] * a * s;
	
	return quat;
}

function multiplyQuat(a, b)
{
	var quat = [];
	
	quat[0] = a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3];
	quat[1] = a[0] * b[1] + b[0] * a[1] + a[2] * b[3] - b[2] * a[3];
	quat[2] = a[0] * b[2] - a[1] * b[3] + b[0] * a[2] + b[1] * a[3];
	quat[3] = a[0] * b[3] + a[1] * b[2] - b[1] * a[2] + b[0] * a[3];
	
	return quat;
}

function buildRotationMatrix(q)
{
	var m = mat4(1-2*q[2]*q[2]-2*q[3]*q[3], 2*q[1]*q[2]+2*q[0]*q[3],   2*q[1]*q[3]-2*q[0]*q[2],   0,
				2*q[1]*q[2]-2*q[0]*q[3],   1-2*q[1]*q[1]-2*q[3]*q[3], 2*q[2]*q[3]+2*q[0]*q[1],   0,
				2*q[1]*q[3]+2*q[0]*q[2],   2*q[2]*q[3]-2*q[0]*q[1],   1-2*q[1]*q[1]-2*q[2]*q[2], 0,
				0,                         0,                         0,                         1);
   
   m = transpose(m);
   
   return m;
}

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

//============================================================================
// Cube related data structures and functions
//============================================================================
var g_vbo_lines;
var g_vbo_polygons;
var m_qLineProgram;
var m_qPolyProgram;
var m_pGL_dat_lines = [];
var m_pGL_dat_polygons= [];

var theCubeVertices = [
        vec4( -1.0, -1.0,  1.0, 1.0 ),
        vec4( -1.0,  1.0,  1.0, 1.0 ),
        vec4(  1.0,  1.0,  1.0, 1.0 ),
        vec4(  1.0, -1.0,  1.0, 1.0 ),
        vec4( -1.0, -1.0, -1.0, 1.0 ),
        vec4( -1.0,  1.0, -1.0, 1.0 ),
        vec4(  1.0,  1.0, -1.0, 1.0 ),
        vec4(  1.0, -1.0, -1.0, 1.0 )
    ];

function wireQuad(a, b, c, d) 
{
     m_pGL_dat_lines.push(theCubeVertices[a]); 
     m_pGL_dat_lines.push(theCubeVertices[b]); 
     m_pGL_dat_lines.push(theCubeVertices[c]); 
     m_pGL_dat_lines.push(theCubeVertices[d]);
}

function wireCube()
{
    wireQuad( 1, 0, 3, 2 );
    wireQuad( 2, 3, 7, 6 );
    wireQuad( 3, 0, 4, 7 );
    wireQuad( 6, 5, 1, 2 );
    wireQuad( 4, 5, 6, 7 );
    wireQuad( 5, 4, 0, 1 );
}

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
    
    if (p1[1] <= p2[1]) {
        line.m_pSource = vec3(p1[0], p1[1], p1[2]);
        line.m_pSink   = vec3(p2[0], p2[1], p2[2]);
    } else {
        line.m_pSource = vec3(p2[0], p2[1], p2[2]);
        line.m_pSink   = vec3(p1[0], p1[1], p1[2]);
    }
    
//    console.log("first source: " + line.m_pSource);
//    console.log("first sink: " + line.m_pSink);
//    console.log("");
    
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
    
//    console.log("init: line has segment " + line.m_pSegment);
//    console.log("init: line has segment 0: " + line.m_pSegment[0]);
//    console.log("init: line has segment 1: " + line.m_pSegment[1]);
//    console.log("init: line has segment 2: " + line.m_pSegment[2]);
//    console.log("init: line has segment 3: " + line.m_pSegment[3]);
//    console.log("init: line has segment 4: " + line.m_pSegment[4]);
//    console.log("init: line has segment 5: " + line.m_pSegment[5]);
//    console.log("init: line has segment 6: " + line.m_pSegment[6]);
//    console.log("init: line has segment 7: " + line.m_pSegment[7]);
//    console.log("init: line has segment 8: " + line.m_pSegment[8]);
    
//    console.log("segment: " + line.m_pSegment);
//    console.log("second source: " + line.m_pSource);
//    console.log("second sink: " + line.m_pSink);
//    console.log("");
    
    //--------------make up a polygon for shader-----------------
//    var tmp_eye = [];
//    var tan     = [];
//    var side    = [];
//    var n       = [];
//
//    /*
//     * the vector of the mid subpoints
//     */
//    
//    for (var i = 0; i < line.m_nSegment; i++) {
//        tan[0] = line.m_pSegment[(i + 1) * 3 + 0] - line.m_pSegment[i * 3 + 0];
//        tan[1] = line.m_pSegment[(i + 1) * 3 + 1] - line.m_pSegment[i * 3 + 1];
//        tan[2] = line.m_pSegment[(i + 1) * 3 + 2] - line.m_pSegment[i * 3 + 2];
//
//        tmp_eye[0] = eye[0];
//        tmp_eye[1] = eye[1];
//        tmp_eye[2] = eye[2];
//
//        side[0] = tmp_eye[1] * tan[2] - tmp_eye[2] * tan[1];
//        side[1] = tmp_eye[2] * tan[0] - tmp_eye[0] * tan[2];
//        side[2] = tmp_eye[0] * tan[1] - tmp_eye[1] * tan[0];
//
//        side = norVector(side);
//        line.m_pLeftBound[i * 3 + 0] = side[0] * line.m_fWidth + line.m_pSegment[i * 3 + 0];
//        line.m_pLeftBound[i * 3 + 1] = side[1] * line.m_fWidth + line.m_pSegment[i * 3 + 1];
//        line.m_pLeftBound[i * 3 + 2] = side[2] * line.m_fWidth + line.m_pSegment[i * 3 + 2];
//        line.m_pRightBound[i * 3 + 0] = -side[0] * line.m_fWidth + line.m_pSegment[i * 3 + 0];
//        line.m_pRightBound[i * 3 + 1] = -side[1] * line.m_fWidth + line.m_pSegment[i * 3 + 1];
//        line.m_pRightBound[i * 3 + 2] = -side[2] * line.m_fWidth + line.m_pSegment[i * 3 + 2];
//    }
//
//    /*
//     * the vector of the last subpoint
//     */
//    
//    tan[0] = line.m_pSegment[line.m_nSegment * 3 + 0]
//           - line.m_pSegment[(line.m_nSegment - 1) * 3 + 0];
//    tan[1] = line.m_pSegment[line.m_nSegment * 3 + 1]
//           - line.m_pSegment[(line.m_nSegment - 1) * 3 + 1];
//    tan[2] = line.m_pSegment[line.m_nSegment * 3 + 2]
//           - line.m_pSegment[(line.m_nSegment - 1) * 3 + 2];
//
//    tmp_eye[0] = eye[0];
//    tmp_eye[1] = eye[1];
//    tmp_eye[2] = eye[2];
//
//    side[0] = tmp_eye[1] * tan[2] - tmp_eye[2] * tan[1];
//    side[1] = tmp_eye[2] * tan[0] - tmp_eye[0] * tan[2];
//    side[2] = tmp_eye[0] * tan[1] - tmp_eye[1] * tan[0];
//
//    side = norVector(side);
//    line.m_pLeftBound[line.m_nSegment * 3 + 0] = side[0] * line.m_fWidth
//                                     + line.m_pSegment[line.m_nSegment * 3 + 0];
//    line.m_pLeftBound[line.m_nSegment * 3 + 1] = side[1] * line.m_fWidth
//                                     + line.m_pSegment[line.m_nSegment * 3 + 1];
//    line.m_pLeftBound[line.m_nSegment * 3 + 2] = side[2] * line.m_fWidth
//                                     + line.m_pSegment[line.m_nSegment * 3 + 2];
//    line.m_pRightBound[line.m_nSegment * 3 + 0] = -side[0] * line.m_fWidth
//                                      + line.m_pSegment[line.m_nSegment * 3 + 0];
//    line.m_pRightBound[line.m_nSegment * 3 + 1] = -side[1] * line.m_fWidth
//                                      + line.m_pSegment[line.m_nSegment * 3 + 1];
//    line.m_pRightBound[line.m_nSegment * 3 + 2] = -side[2] * line.m_fWidth
//                                      + line.m_pSegment[line.m_nSegment * 3 + 2];
    
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



// calculate the attraction force
function calAttraction(A, B, springLength) {
    var balance = springLength - 0.0;
    
    // Hooke's Law: F = -kx
    var force = ATTRACTION * balance;
    var v_force = vec3(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    var n_force = norVector(v_force);
    
    var Force;
    if (springLength <= MINDIS) {
        Force = vec3(0.0, 0.0, 0.0);
    } else {
        Force = vec3(force * n_force[0], force * n_force[1], force * n_force[2]); 
    }
    
    return Force;
}

// calculate the repulsive force
function calRepulsion(A, B, particleLength) {
    // Coulomb's Law: F = k(Qq/r^2)
//    var force = (REPULSION / Math.sqrt(particleLength));
    var force = (REPULSION / particleLength);
    var v_force = vec3(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    var n_force = norVector(v_force);
    
    var Force;
    if (particleLength <= MINDIS) {
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
//        console.log("begin: " + m_vLines[j].m_pSegment);
        if ( P == 1 ) {
            var new_subdivision_points = [];
            var midPoint               = [];
            new_subdivision_points.push(m_vLines[j].m_pSource[0]); // source
            new_subdivision_points.push(m_vLines[j].m_pSource[1]);
            new_subdivision_points.push(m_vLines[j].m_pSource[2]);
            midPoint = edge_midpoint(m_vLines[j].m_pSource, m_vLines[j].m_pSink);
            new_subdivision_points.push(midPoint[0]); // mid point
            new_subdivision_points.push(midPoint[1]);
            new_subdivision_points.push(midPoint[2]);
            new_subdivision_points.push(m_vLines[j].m_pSink[0]); // target
            new_subdivision_points.push(m_vLines[j].m_pSink[1]);
            new_subdivision_points.push(m_vLines[j].m_pSink[2]);
            m_vLines[j].m_pSegment = new_subdivision_points;
        } else {
            var divided_edge_length = m_vLines[j].length;
            var segment_length  	= divided_edge_length / (P+1);
            var current_segment_length = segment_length;
            var new_subdivision_points = [];
            new_subdivision_points.push(m_vLines[j].m_pSource[0]); //source
            new_subdivision_points.push(m_vLines[j].m_pSource[1]);
            new_subdivision_points.push(m_vLines[j].m_pSource[2]);
            
//            console.log("old edge length: " + divided_edge_length);
            
//            for(var i = 1; i < m_vLines[j].m_nSegment; i++){
            for (var i = 1; i <= P + 1; i++) {
                var source = [];
                var sink   = [];
                source[0]  = m_vLines[j].m_pSegment[i * 3 + 0];
                source[1]  = m_vLines[j].m_pSegment[i * 3 + 1];
                source[2]  = m_vLines[j].m_pSegment[i * 3 + 2];
                sink[0]    = m_vLines[j].m_pSegment[(i - 1) * 3 + 0];
                sink[1]    = m_vLines[j].m_pSegment[(i - 1) * 3 + 1];
                sink[2]    = m_vLines[j].m_pSegment[(i - 1) * 3 + 2];
                var old_segment_length = CalcDistance(source, sink);
                var count = 0;
//                console.log("current segment length: " + current_segment_length);
//                console.log("old segment length: " + old_segment_length);
                while (old_segment_length > current_segment_length) {
                    var percent_position = current_segment_length / old_segment_length;
                    var new_subdivision_point_x = m_vLines[j].m_pSegment[(i - 1) * 3 + 0];
                    var new_subdivision_point_y = m_vLines[j].m_pSegment[(i - 1) * 3 + 1];
                    var new_subdivision_point_z = m_vLines[j].m_pSegment[(i - 1) * 3 + 2];

                    new_subdivision_point_x += percent_position*(m_vLines[j].m_pSegment[i * 3 + 0] - m_vLines[j].m_pSegment[(i - 1) * 3 + 0]);
                    new_subdivision_point_y += percent_position*(m_vLines[j].m_pSegment[i * 3 + 1] - m_vLines[j].m_pSegment[(i - 1) * 3 + 1]);
                    new_subdivision_point_z += percent_position*(m_vLines[j].m_pSegment[i * 3 + 2] - m_vLines[j].m_pSegment[(i - 1) * 3 + 2]);
                    new_subdivision_points.push(new_subdivision_point_x);
                    new_subdivision_points.push(new_subdivision_point_y);
                    new_subdivision_points.push(new_subdivision_point_z);
                    
                    old_segment_length     -= current_segment_length;
                    current_segment_length 	= segment_length;
                    count++;
                }
                current_segment_length -= old_segment_length;
            }
            new_subdivision_points.push(m_vLines[j].m_pSink[0]); //target
            new_subdivision_points.push(m_vLines[j].m_pSink[1]);
            new_subdivision_points.push(m_vLines[j].m_pSink[2]);
            m_vLines[j].m_pSegment = new_subdivision_points;
        }
//        console.log("count: " + count);
//        console.log("End: " + m_vLines[j].m_pSegment);
    }
     console.log("");
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
 
//    console.log("P: " + P);
    
    for (var i = 0; i < m_vLines.length; i++) {
//                for (var j = 1; j < n_Segment; j++) {
        for (var j = 1; j < P + 1; j++) {
            var attr_0 = [];
            var attr_1 = [];
            attr_0[0] = m_vLines[i].m_pSegment[j * 3 + 0];
            attr_0[1] = m_vLines[i].m_pSegment[j * 3 + 1];
            attr_0[2] = m_vLines[i].m_pSegment[j * 3 + 2];

            attr_1[0] = m_vLines[i].m_pSegment[(j - 1) * 3 + 0];
            attr_1[1] = m_vLines[i].m_pSegment[(j - 1) * 3 + 1];
            attr_1[2] = m_vLines[i].m_pSegment[(j - 1) * 3 + 2];

            attr_0_force = calAttraction(attr_0,
                                         attr_1,
                            CalcDistance(attr_0,
                                         attr_1));
            
//            console.log("attr_0: " + attr_0_force);

            var attr_2 = [];
            var attr_3 = [];
            attr_2[0] = m_vLines[i].m_pSegment[j * 3 + 0];
            attr_2[1] = m_vLines[i].m_pSegment[j * 3 + 1];
            attr_2[2] = m_vLines[i].m_pSegment[j * 3 + 2];

            attr_3[0] = m_vLines[i].m_pSegment[(j + 1) * 3 + 0];
            attr_3[1] = m_vLines[i].m_pSegment[(j + 1) * 3 + 1];
            attr_3[2] = m_vLines[i].m_pSegment[(j + 1) * 3 + 2];
            
//            console.log("");
//            console.log("attr_3_0: " + m_vLines[i].m_pSegment[(j + 1) * 3 + 0]);
//            console.log("attr_3_1: " + m_vLines[i].m_pSegment[(j + 1) * 3 + 1]);
//            console.log("attr_3_2: " + m_vLines[i].m_pSegment[(j + 1) * 3 + 2]);
//            console.log("");
            
            attr_1_force = calAttraction(attr_2,
                                         attr_3,
                            CalcDistance(attr_2,
                                         attr_3));

            tmp1_force = addForce(attr_0_force, attr_1_force);

//            console.log("attr_1: " + attr_1_force);
//            console.log("tmp1_force: " + tmp1_force);
            
            tmp2[0] = 0.0;
            tmp2[1] = 0.0;
            tmp2[2] = 0.0;
            for (var k = 0; k < m_vLines.length; k++) {
                if (i != k) {
                    var attr_4 = [];
                    var attr_5 = [];
                    attr_4[0] = m_vLines[i].m_pSegment[j * 3 + 0];
                    attr_4[1] = m_vLines[i].m_pSegment[j * 3 + 1];
                    attr_4[2] = m_vLines[i].m_pSegment[j * 3 + 2];

                    attr_5[0] = m_vLines[k].m_pSegment[j * 3 + 0];
                    attr_5[1] = m_vLines[k].m_pSegment[j * 3 + 1];
                    attr_5[2] = m_vLines[k].m_pSegment[j * 3 + 2];


                    repul_force = calRepulsion(attr_4,
                                               attr_5,
                                  CalcDistance(attr_4,
                                               attr_5));

                    tmp2_force  = addForce(repul_force, tmp2);
                    tmp2        = tmp2_force;
                    
//                    console.log("tmp2_force: " + tmp2_force);
                }
            }

            var total = [];
            total[0] = 0.0;
            total[1] = 0.0;
            total[2] = 0.0;

            total = addForce(tmp1_force, tmp2_force);
            
//            console.log(total);

            m_vLines[i].m_pForce[j * 3 + 0] = total[0];
            m_vLines[i].m_pForce[j * 3 + 1] = total[1];
            m_vLines[i].m_pForce[j * 3 + 2] = total[2];

        }
    }
}
function UpdateLength(P)
{
    var length;
    for (var i = 0; i < m_vLines.length; i++) {
        length = 0;
//        console.log("i: " + i + " j: " + m_vLines[i].m_pSegment[3]);
//        console.log("line " + i + " has segment " + m_vLines[i].m_pSegment);
        for (var j = 1; j <= P + 1; j++) {
            var source = [];
            var sink   = [];
            source[0] = m_vLines[i].m_pSegment[j * 3 + 0];
            source[1] = m_vLines[i].m_pSegment[j * 3 + 1];
            source[2] = m_vLines[i].m_pSegment[j * 3 + 2];
//            console.log("source " + source);
            sink[0]   = m_vLines[i].m_pSegment[(j - 1) * 3 + 0];
            sink[1]   = m_vLines[i].m_pSegment[(j - 1) * 3 + 1];
            sink[2]   = m_vLines[i].m_pSegment[(j - 1) * 3 + 2];
//            console.log("sink " + sink);
            var segment_length;
            segment_length = CalcDistance(source, sink);
            length += segment_length;
        }
//        console.log("length: " + length);
        m_vLines[i].length = length;
    }

}

var ATTRACTION = 1;
var REPULSION =  1;

var INTERVAL = 0.1;

var MINFORCE = 1.0e-6;
var MINDIS = 0.0;

var ITERATION = 1;
var SEGMENT = 2;
var LINEWIDTH = 0.05;

var n_LineNum = 0;
var n_Segment = SEGMENT;

var m_vLines = [];

var S_initial = 0.1;		// init. distance to move points
var	P_initial = 1; 			// init. subdivision number
var	P_rate    = 2;			// subdivision rate increase
var	C         = 6; 			// number of cycles to perform
var	I_initial = 1; 		// init. number of iterations for cycle
var	I_rate    = 0.6666667;  // rate at which iteration number decreases i.e. 2/3
// update the vertex, line, polygon buffer
function UpdateBuffer()
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
    
    m_nIteration = ITERATION;
    var S = S_initial;
    var I = I_initial;
    var P = P_initial;
    var current_P;
    update_edge_divisions(P);
    for (var cycle = 0; cycle < C; cycle++) {
        for (var c = 0; c < I; c++) {
            UpdateForce(P);
//            console.log("line " + 0 + " has segment " + m_vLines[0].m_pSegment);
//            console.log("line " + 0 + " has segment 0: " + m_vLines[0].m_pSegment[0]);
//            console.log("line " + 0 + " has segment 1: " + m_vLines[0].m_pSegment[1]);
//            console.log("line " + 0 + " has segment 2: " + m_vLines[0].m_pSegment[2]);
//            console.log("line " + 0 + " has segment 3: " + m_vLines[0].m_pSegment[3]);
//            console.log("line " + 0 + " has segment 4: " + m_vLines[0].m_pSegment[4]);
//            console.log("line " + 0 + " has segment 5: " + m_vLines[0].m_pSegment[5]);
//            console.log("line " + 0 + " has segment 6: " + m_vLines[0].m_pSegment[6]);
//            console.log("line " + 0 + " has segment 7: " + m_vLines[0].m_pSegment[7]);
//            console.log("line " + 0 + " has segment 8: " + m_vLines[0].m_pSegment[8]);
            for (var i = 0; i < m_vLines.length; i++) {
                for (var j = 1; j < P + 1; j++) {
//                    console.log(m_vLines[i].m_pForce[j * 3 + 0]);
//                    console.log(m_vLines[i].m_pForce[j * 3 + 1]);
//                    console.log(m_vLines[i].m_pForce[j * 3 + 2]);
                    m_vLines[i].m_pSegment[j * 3 + 0] += INTERVAL * m_vLines[i].m_pForce[j * 3 + 0];
                    m_vLines[i].m_pSegment[j * 3 + 1] += INTERVAL * m_vLines[i].m_pForce[j * 3 + 1];
                    m_vLines[i].m_pSegment[j * 3 + 2] += INTERVAL * m_vLines[i].m_pForce[j * 3 + 2];
                }
            }
            UpdateLength(P);
        }
        //prepare for next cycle
        current_P = P;
        S = S / 2;
        P = P * P_rate;
        I = I_rate * I;
        update_edge_divisions(P);
    }
    n_Segment = P;
    console.log(P);
}

function UpdatePolygon(mv) {
    var tmp_eye = [];
    var tan     = [];
    var side    = [];
    var n       = [];
    var tmp     = vec4(eye, 1.0);
    
    tmp[0] = tmp[0] * mv[0][0] + tmp[1] * mv[0][1] + tmp[2] * mv[0][2] + tmp[3] * mv[0][3];
    tmp[1] = tmp[0] * mv[1][0] + tmp[1] * mv[1][1] + tmp[2] * mv[1][2] + tmp[3] * mv[1][3];
    tmp[2] = tmp[0] * mv[2][0] + tmp[1] * mv[2][1] + tmp[2] * mv[2][2] + tmp[3] * mv[2][3];
    tmp[3] = tmp[0] * mv[3][0] + tmp[1] * mv[3][1] + tmp[2] * mv[3][2] + tmp[3] * mv[3][3];
    
    /*
     * the vector of the mid subpoints
     */
    for (var i = 0; i < m_vLines.length; i++) {
        for (var j = 0; j < n_Segment; j++) {
            tan[0] = m_vLines[i].m_pSegment[(j + 1) * 3 + 0] - m_vLines[i].m_pSegment[j * 3 + 0];
            tan[1] = m_vLines[i].m_pSegment[(j + 1) * 3 + 1] - m_vLines[i].m_pSegment[j * 3 + 1];
            tan[2] = m_vLines[i].m_pSegment[(j + 1) * 3 + 2] - m_vLines[i].m_pSegment[j * 3 + 2];

            tmp_eye[0] = tmp[0] - m_vLines[i].m_pSegment[j * 3 + 0];
            tmp_eye[1] = tmp[1] - m_vLines[i].m_pSegment[j * 3 + 1];
            tmp_eye[2] = tmp[2] - m_vLines[i].m_pSegment[j * 3 + 2];

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

        tmp_eye[0] = tmp[0] - m_vLines[i].m_pSegment[j * 3 + 0];
        tmp_eye[1] = tmp[1] - m_vLines[i].m_pSegment[j * 3 + 1];
        tmp_eye[2] = tmp[2] - m_vLines[i].m_pSegment[j * 3 + 2];

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


function initLine()
{
    //initialize the cube     
//    wireCube();
    var L1_v1_4 = vec4(-1.0, -1.0,  1.0, 1.0);
    var L1_v2_4 = vec4(-1.0,  1.0,  1.0, 1.0);
    var L2_v1_4 = vec4(1.0, -1.0,  1.0, 1.0);
    var L2_v2_4 = vec4(1.0,  1.0,  1.0, 1.0);
    var L3_v1_4 = vec4(-1.0, -1.0, -1.0, 1.0);
    var L3_v2_4 = vec4(-1.0,  1.0, -1.0, 1.0);
    var L4_v1_4 = vec4(1.0, -1.0, -1.0, 1.0);
    var L4_v2_4 = vec4(1.0,  1.0, -1.0, 1.0);
    
    var L1_v1_3 = vec3(-1.0, -1.0,  1.0);
    var L1_v2_3 = vec3(-1.0,  1.0,  1.0);
    var L2_v1_3 = vec3(1.0, -1.0,  1.0);
    var L2_v2_3 = vec3(1.0,  1.0,  1.0);
    var L3_v1_3 = vec3(-1.0, -1.0, -1.0);
    var L3_v2_3 = vec3(-1.0,  1.0, -1.0);
    var L4_v1_3 = vec3(1.0, -1.0, -1.0);
    var L4_v2_3 = vec3(1.0,  1.0, -1.0);
    
    var line_1 = new_line(L1_v1_3, L1_v2_3, n_Segment, LINEWIDTH);
    m_vLines.push(line_1);
    
    var line_2 = new_line(L2_v1_3, L2_v2_3, n_Segment, LINEWIDTH);
    m_vLines.push(line_2);
    
    var line_3 = new_line(L3_v1_3, L3_v2_3, n_Segment, LINEWIDTH);
    m_vLines.push(line_3);
    
    var line_4 = new_line(L4_v1_3, L4_v2_3, n_Segment, LINEWIDTH);
    m_vLines.push(line_4);
    
//    for(var j = 0; j < m_vLines.length; j++) {
//        console.log("initSource: " + m_vLines[j].m_pSource);
//        console.log("initMidpoint: " + edge_midpoint(m_vLines[j].m_pSource, m_vLines[j].m_pSink));
//        console.log("initSink: " + m_vLines[j].m_pSink);
//    }
    
    UpdateBuffer();
    
//    for(var j = 0; j < m_vLines.length; j++) {
//        console.log("Source: " + m_vLines[j].m_pSource);
//        console.log("Segment: " + m_vLines[j].m_pSegment);
//        console.log("Sink: " + m_vLines[j].m_pSink);
//    }
    
    var size0 = 0;
    for (var i = 0; i < m_vLines.length; i++) {
//        console.log("Segment: " + m_vLines[i].m_pSegment);
        for (var j = 0; j <= n_Segment; j++) {
            m_pGL_dat_lines[size0++] = m_vLines[i].m_pSegment[j * 3 + 0];
            m_pGL_dat_lines[size0++] = m_vLines[i].m_pSegment[j * 3 + 1];
            m_pGL_dat_lines[size0++] = m_vLines[i].m_pSegment[j * 3 + 2];
            m_pGL_dat_lines[size0++] = 1.0;
            m_pGL_dat_lines[size0++] = m_vLines[i].m_pSegment[(j + 1) * 3 + 0];
            m_pGL_dat_lines[size0++] = m_vLines[i].m_pSegment[(j + 1) * 3 + 1];
            m_pGL_dat_lines[size0++] = m_vLines[i].m_pSegment[(j + 1) * 3 + 2];
            m_pGL_dat_lines[size0++] = 1.0;
        }
    }
//    console.log("Result: " + m_pGL_dat_lines);
    
	//  Load shaders and initialize attribute buffers    
    m_qLineProgram = initShaders(gl, "cube-vertex-shader", "cube-fragment-shader");
    gl.useProgram(m_qLineProgram);
    
    // Create VBOs and load the data into the VBOs
    g_vbo_lines = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo_lines);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(m_pGL_dat_lines), gl.STATIC_DRAW);   
}

function drawLine(p, mv) 
{    
    gl.useProgram(m_qLineProgram);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo_lines);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(m_pGL_dat_lines));
	
	gl.uniformMatrix4fv( gl.getUniformLocation(m_qLineProgram, "projectionMatrix"),
		false, flatten(p));
	   
	gl.uniformMatrix4fv( gl.getUniformLocation(m_qLineProgram, "modelViewMatrix"), 
		false, flatten(mv));   
  
    // Associate out shader variables with our data buffer  
    var vPosition = gl.getAttribLocation(m_qLineProgram, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo_lines);      
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.drawArrays(gl.LINES, 0, n_Segment * m_vLines.length * 2);
//	for (var i = 0; i < 4; i++) {
//		gl.drawArrays(gl.LINES, i * 2, 2);
//	}
}

function initPolygon()
{
    var size1 = 0;
    for (var i = 0; i < m_vLines.length; i++) {
        for (var j = 0; j <= n_Segment; j++) {
            m_pGL_dat_polygons[size1++]
                    = m_vLines[i].m_pRightBound[j * 3 + 0];
            m_pGL_dat_polygons[size1++]
                    = m_vLines[i].m_pRightBound[j * 3 + 1];
            m_pGL_dat_polygons[size1++]
                    = m_vLines[i].m_pRightBound[j * 3 + 2];
            m_pGL_dat_polygons[size1++] = 1.0;
            m_pGL_dat_polygons[size1++]
                    = m_vLines[i].m_pLeftBound[j * 3 + 0];
            m_pGL_dat_polygons[size1++]
                    = m_vLines[i].m_pLeftBound[j * 3 + 1];
            m_pGL_dat_polygons[size1++]
                    = m_vLines[i].m_pLeftBound[j * 3 + 2];
            m_pGL_dat_polygons[size1++] = 1.0;
        }
    }
    
    // Load shaders and initialize the polygon buffers
    m_qPolyProgram = initShaders(gl, "poly-vertex-shader", "poly-fragment-shader");
    gl.useProgram(m_qPolyProgram);
    
    // Create VBOs and load the data into the VBOs
    g_vbo_polygons = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo_polygons);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(m_pGL_dat_polygons), gl.STATIC_DRAW);
}

function drawPolygon(p, mv) 
{
    gl.useProgram(m_qPolyProgram);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo_polygons);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(m_pGL_dat_polygons));
	
	gl.uniformMatrix4fv( gl.getUniformLocation(m_qPolyProgram, "projectionMatrix"),
		false, flatten(p));
	   
	gl.uniformMatrix4fv( gl.getUniformLocation(m_qPolyProgram, "modelViewMatrix"), 
		false, flatten(mv));   
  
    // Associate out shader variables with our data buffer  
    var pPosition = gl.getAttribLocation(m_qPolyProgram, "pPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER,g_vbo_polygons);
    gl.vertexAttribPointer(pPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(pPosition);
    
    for (var i = 0; i < m_vLines.length; i++) {
        gl.drawArrays(gl.TRIANGLE_STRIP, (n_Segment + 1) * 2 * i, (n_Segment + 1) * 2);
    }
}
	
//============================================================================
// Sphere related data structures and functions
//============================================================================
var theSphereVBOPoints;
var theSphereProgram;
var theSpherePoints = [];

//var theSphereVertices;

function sphereQuad(a, b, c, d) 
{
}

function initSphere()
{
}

function drawSphere(p, mv) 
{
}

//============================================================================
// WebGL Initialization
//============================================================================
window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert( "WebGL isn't available" ); 
    }
	
    //  Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(0.95, 0.95, 0.95, 1.0 );	
	theAspect = canvas.width * 1.0 / canvas.height;
	
	initLine();
    initPolygon();
//	initSphere();
	
    render();
    
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
};

var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var eye = vec3(0.0, 0.0, 5.0);
//============================================================================
// Rendering function
//============================================================================
function render() 
{  
    gl.clear( gl.COLOR_BUFFER_BIT );
	
	//projection matrix
    var  p = perspective( theFovy, theAspect, theZNear, theZFar );
	
    //modelview matrix
	var t = translate(0, 0, -5.0);
	var s = scale(theScale, theScale, theScale);
	var r = buildRotationMatrix(theCurtQuat);
	var mv = mat4();
//	mv = mult(mv, t);
    mv = lookAt(eye, at, up);
    mv = mult(mv, s);
	mv = mult(mv, r);
	
//    UpdatePolygon(mv);
	drawLine(p, mv);
//    drawPolygon(p, mv);
//	drawSphere(p, mv);
 }