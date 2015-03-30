// ============================================================================
// Blurring functions
// ============================================================================
var texture1, texture2;
var program1, program2;
var framebuffer;
var blurVBO;


/**
*  Crete a blurring routine.
*  "blurLoop( # blurring iterations, vertical blurring step, horizontal blurring step)
*/
function blurRoutine() {
	//  example1
	//blurLoop(500, 1.0 /clusterTexHeight, 1.0 / clusterTexWidth );

	//  example2
	// blurLoop(20, 1.0 /(dataRows*30), 1.0 / (dataRows*30) );
	// blurLoop(20, 1.0 /(dataRows*20), 1.0 / (dataRows*20) );
	// blurLoop(30, 1.0 /(dataRows*5), 1.0 / (dataRows*5) );

	//  example3
	// blurLoop(80, 1.0 /clusterTexHeight, 1.0 / clusterTexWidth );
	// blurLoop(40, 1.0 /(dataRows*texMultiply/2), 1.0 / (dataRows*texMultiply/2) );
	// blurLoop(20, 1.0 /(dataRows*texMultiply/4), 1.0 / (dataRows*texMultiply/4) );
	// blurLoop(10, 1.0 /(dataRows*texMultiply/8), 1.0 / (dataRows*texMultiply/8) );
	// blurLoop(5, 1.0 /(dataRows*5), 1.0 / (dataRows*5) );

	//  try 4
	blurLoop(80, 1.0 /(dataRows*5), 1.0 / (dataRows*5) );
}

/* 
*  This function must be called at the main program after the creation of the cluster texture
*/
function blurClusterTexture() 
{

  var vertices = [vec4(-1.0, -1.0, 0.0, 1.0),
	              vec4(-1.0, 1.0, 0.0, 1.0),
	              vec4(1.0, 1.0, 0.0, 1.0),
	              vec4(1.0, -1.0, 0.0, 1.0)
	             ];
    
    // Create VBOs and load the data into the VBOs
    blurVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, blurVBO);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
	
    texture1 = clusterTexture;
    
    // Empty texture
    texture2 = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture2 );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, clusterTexWidth, clusterTexHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

	// Allocate a frame buffer object
   	framebuffer = gl.createFramebuffer();
   	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
   	framebuffer.width = clusterTexWidth;
   	framebuffer.height = clusterTexHeight;

	// Attach color buffer
   	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture1, 0);

	// check for completeness
   	var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
   	if(status != gl.FRAMEBUFFER_COMPLETE) alert('Frame Buffer Not Complete');

    
    //  Load shaders
    program1 = initShaders( gl, "verticalgaussian-vertex-shader", "verticalgaussian-fragment-shader" );
    program2 = initShaders( gl, "horizontalgaussian-vertex-shader", "horizontalgaussian-fragment-shader" );

	//  Blur    
    blurRoutine();
	
	//  Unbind framebuffer
    gl.bindFramebuffer( gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

}


/** 
*  vertStep and horStep are the steps vertical and horizontal steps taken when blurring the texture.
*  If they are 1/clusterTexHeight and 1/clusterTexWidth, then the blurring kernel will sample pixels
*  that are neighbors one another.
*/
function blurLoop(times, vertStep, horStep) {
	
	for(var i = 0; i < times; ++i) {
		blur(true, vertStep, horStep);
		blur(false, vertStep, horStep);
	}

	clusterTexture = texture1;
}


/**
*  This uses the shaders to do a 1D blur. So, to accomplish the 2D blur, it is
*  necessary to call this function twice, varying the isVertical parameter.
*  The process is as follows: starting with a initial texture at texture1,
*  then, vertically blur it drawing on texture2. Now, use horizontally blur texture2
*  rendering the result at texture1.
*/
function blur(isVertical, vertStep, horStep) {
	var program, texture, target, step;
	if(isVertical) {
		program = program1;
		step = vertStep;
		texture = texture1;
		target = texture2;
	}
	else {
		program = program2;
		step = horStep		
		target = texture1;
		texture = texture2;
	}
	
	gl.useProgram(program);
	gl.uniform1f( gl.getUniformLocation(program, "blurStep"), step);
	useTexture(program, texture);
	
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, blurVBO);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
	
    
	gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);  

	gl.viewport(0, 0, clusterTexWidth, clusterTexHeight);
    
    //gl.clearColor(1.0, 1.0, 1.0, 1.0);
    //gl.clear(gl.COLOR_BUFFER_BIT );

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}