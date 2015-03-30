// Rotation related functions
function trackball_ptov(x, y,  v)
{
    var d, a;

	/*
	 * project x,y onto a hemisphere centered within width, height, note z is up
	 * here
	 */
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

function invq(a)
{	
	return( scalev( 1.0/dot(a, a) , vec4(a[0], negate(a.slice(1,4)))) );
}