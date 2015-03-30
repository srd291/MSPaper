
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var eye = vec3(2.0, 2.0, 2.0);

var localForward = calculateLocalForward();
var localUp = up;
var localLeft = calculateLocalLeft();

var speed = 0.0;

var theUpDownQuat = vec4(1.0, 0.0, 0.0, 0.0);
var theLeftRightQuat = vec4(1.0, 0.0, 0.0, 0.0);

var fowardKey = false;
var rightKey = false;
var leftKey = false;
var backKey = false;
var spaceKey = false;

function rotateCamera() {
    /* rotate localForward in the UpDown direction */
    var p = vec4(0.0, localForward);
    p = multq(theUpDownQuat, multq(p, invq(theUpDownQuat)));

    /* rotate previous 'p' vector in the LeftRight */
    p = vec4(0.0, vec3(p[1], p[2], p[3]));
    p = multq(theLeftRightQuat, multq(p, invq(theLeftRightQuat)));
    
    /* update at vector */
    at = add(eye, vec3(p[1], p[2], p[3]));        

    /* rotate local left direction, same process as above */
    var q = vec4(0.0, localLeft);
    q = multq(theUpDownQuat, multq(q, invq(theUpDownQuat)));
    q = vec4(0.0, vec3(q[1], q[2], q[3]));
    q = multq(theLeftRightQuat, multq(q, invq(theLeftRightQuat)));                     

    /* local up direction, given by rotated local axis */ 
    localUp = calculateLocalUp(vec3(p[1], p[2], p[3]), vec3(q[1], q[2], q[3]));

    /* it is necessary to invert up direction when the camera is upside down */
    if(dot(localUp, up) < 0)
       up = scalev(-1.0, up);
}

function keyUp(key){
	// pressed 'a'
    if(key == 65) {
        leftKey = false;
    }
    // pressed 'd'
    if(key == 68) {
        rightKey = false;
    }
    // pressed 'w'
    if(key == 87) {
        fowardKey = false;
    }
    //pressed 's'
    if(key == 83) {
        backKey = false;
    }

    //released 'space' = goodbye turbo :-(
    if(key == 32) {
        spaceKey = false;
    }
}

function keyDown(key){
	// pressed 'a'
    if(key == 65) {
        leftKey = true;
    }
    // pressed 'd'
    if(key == 68) {
        rightKey = true;
    }
    // pressed 'w'
    if(key == 87) {
        fowardKey = true;
    }
    //pressed 's'
    if(key == 83) {
        backKey = true;
    }

    //pressed 'space' = turbo   \o - iiihul!! 
    if(key == 32) {
        spaceKey = true;
    }
}

function translateCamera() {
	var moved = false;
    // pressed 'a'
    if(leftKey) {
        eye = add(eye, scalev(speed, localLeft));
        at = add(at, scalev(speed, localLeft));
        moved = true;
    }
    // pressed 'd'
    if(rightKey) {
        eye = add(eye, scalev(-1.0*speed, localLeft));
        at = add(at, scalev(-1.0*speed, localLeft));
        moved = true;
    }
    // pressed 'w'
    if(fowardKey) {
        eye = add(eye, scalev(speed, localForward));
        at = add(at, scalev(speed, localForward));
        moved = true;
    }
    //pressed 's'
    if(backKey) {
        eye = add(eye, scalev(-1.0*speed, localForward));
        at = add(at, scalev(-1.0*speed, localForward));
        moved = true;
    }
    // TURBOOOO
    if(spaceKey) {
        speed = 10.0;
    } else {
        speed = 1.0;
    }
    if(moved) {
        theUpDownQuat = vec4(1.0, 0.0, 0.0, 0.0);
        theLeftRightQuat = vec4(1.0, 0.0, 0.0, 0.0);
        localForward = calculateLocalForward();
        localLeft = calculateLocalLeft();
    }
}
    
// 1) Update both rotation quaternions UpDown/LeftRight
// 2) UpDown is created based on the 'localLeft' (local side axis)
// 3) LeftRight is created based on the 'up' (global y axis)
// 4) deltaMousePosition takes into account in which direction the user
//    went with the mouse
function updateRQuat(theAngle, theAxis, deltaMousePosition) {
    /* if there was mouse movement */
    if((deltaMousePosition[0]*deltaMousePosition[0] + deltaMousePosition[1]*deltaMousePosition[1])  != 0.0) {
        deltaMousePosition = normalize(deltaMousePosition);
        /* mouse movement on screen Y direction */
        if(deltaMousePosition[1] != 0.0) {
            var rotationAxis = scalev(-1.0 * deltaMousePosition[1],  localLeft);
            var temp = scalev(Math.sin(Math.abs(deltaMousePosition[1]) * theAngle/2.0) / length(rotationAxis), rotationAxis);
            var newRquatUpDown = vec4(Math.cos(Math.abs(deltaMousePosition[1]) * theAngle/2.0), temp[0], temp[1] , temp[2]);    
            theUpDownQuat = multq(newRquatUpDown, theUpDownQuat);
        }
        /* mouse movement on screen X direction */
        if( deltaMousePosition[0] != 0.0) {
            var rotationAxis = scalev(-1.0 * deltaMousePosition[0],  up);
            var temp = scalev(Math.sin(Math.abs(deltaMousePosition[0]) * theAngle/2.0) / length(rotationAxis), rotationAxis);
            var newRquatLeftRight = vec4(Math.cos(Math.abs(deltaMousePosition[0]) * theAngle/2.0), temp[0], temp[1] , temp[2]); 
            theLeftRightQuat = multq(newRquatLeftRight, theLeftRightQuat);
        }
    }
}

function multq(a, b) {
    return vec4(a[0] * b[0] - dot(vec3(a[1], a[2], a[3]), vec3(b[1], b[2], b[3])), 
                add(scalev(a[0], vec3(b[1], b[2], b[3])),
                    add(scalev(b[0], vec3(a[1], a[2], a[3])), cross(vec3(a[1], a[2], a[3]), vec3(b[1], b[2], b[3])))
                ) );
}

// Inverse quaternion
function invq(a) {
    return vec4(a[0], scalev( -1.0 / dot(a,a), vec3(a[1], a[2], a[3]))); 
}

function calculateLocalForward() {
    return scalev( 1.0 / length( subtract(at, eye) ) , subtract(at, eye) );
}

function calculateLocalLeft() {
    return scalev( 1.0 / length(cross(up, localForward)), cross(up, localForward) );
}

function calculateLocalUp(forward, left) {
    return scalev( 1.0 / length(cross(forward, left)), cross(forward, left) );
}