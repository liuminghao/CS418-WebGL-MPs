/**
 * @file Terrain Modeling, MP2 for CS418 at UIUC
 * @author Eric Shaffer <shaffer1@illinois.edu>  
 * @author Minghao LIu <ml58@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];



/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


/** @global A number denoting the flying speed*/
var speed = 0.001;

/** @global The fog density, used to control fog on/off */
var fogDensity = 0.7;

/** @global The pitch direction, default up = pitch down */
var pitchDir = 1;

// View parameters
/** @global Location of the camera in world coordinates */
var eyeVec = vec3.create();    
vec3.set(eyeVec,0.0,1.5,-0.2);

/** @global The quaternion for view orientation */
var viewQuat = quat.create();
//default view angle
quat.rotateX(viewQuat, viewQuat, degToRad(-90));
quat.rotateY(viewQuat, viewQuat, degToRad(0));
quat.rotateZ(viewQuat, viewQuat, degToRad(0));

/** @global x axis vector for view matrix creation, in world coordinates */
var xAxis = vec3.fromValues(1.0,0.0,0.0);
/** @global y axis vector for view matrix creation, in world coordinates */
var yAxis = vec3.fromValues(0.0,1.0,0.0);
/** @global z axis vector for view matrix creation, in world coordinates */
var zAxis = vec3.fromValues(0.0,0.0,1.0);


//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [2,-3,3];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[1,1,1];


//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection. Only 
  * a default value, the color will be changed in the shader based on
  * eleveation. */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1,1,1];
/** @global Shininess exponent for Phong reflection */
var shininess = 200;



//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");    
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");  
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");
	
  shaderProgram.uniformFogDensityLoc = gl.getUniformLocation(shaderProgram, "uFogDensity");
  gl.uniform1f(shaderProgram.uniformFogDensityLoc, fogDensity);

}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
 * Sends fog density to the shader
 * @param {Number} fog density
 */
function setFogDensityUniform(fogDensity) {
  gl.uniform1f(shaderProgram.uniformFogDensityLoc, fogDensity);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(100,-0.5,0.5,-0.5,0.5);
	
	var tType = 0;
	if (document.getElementById("hill").checked)
    { 
      tType = 1;
    } else if (document.getElementById("valley").checked)
    { 
      tType = 2;
    } else if (document.getElementById("slope").checked)
    { 
      tType = 3;
    }
	
	myTerrain.setHeightsByPartition(/*partition=*/200,/*delta=*/0.004, /*type={flat,hill,valley}*/tType);
    myTerrain.loadBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
	
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // Generate the initial view coordinates using the view quaternion
	
	
    //Draw Terrain, applying flying vectors
    mvPushMatrix();

	//Apply the quanternion rotation
	mat4.fromQuat(mvMatrix, viewQuat);
	
	//Obtain the inverte rotation for flying direction
	invertQuat = quat.create();
	quat.invert(invertQuat, viewQuat);
	
	//Obtain the flying direction by rotating on a unit zAxis vector
	flyDirection = vec3.create();
	vec3.transformQuat(flyDirection, zAxis, invertQuat); 
	
	//Apply the speed
	vec3.scale(flyDirection, flyDirection, speed);
	
	//Apply fly vector to the eye vector
	vec3.add(eyeVec, eyeVec, flyDirection);
	
	//Apply translation first, then rotation
	tempTransMat = mat4.create();
	mat4.fromTranslation(tempTransMat, eyeVec);
	
	mat4.mul(mvMatrix, mvMatrix, tempTransMat);
	
    setMatrixUniforms();
    setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);

    setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular); 
    myTerrain.drawTriangles();

	setFogDensityUniform(fogDensity);
	
    mvPopMatrix();
  
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
function startup() {
	canvas = document.getElementById("myGLCanvas");
	gl = createGLContext(canvas);
	setupShaders();
	setupBuffers();
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;
	tick();
}

//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
	animate();
	//lightPosition = [lightPosition[0]+0.01,3,3];
    draw();
}


//----------------------------------------------------------------------------------
/** 
 * Interaction part, event handlers, animation
 */
var currentlyPressedKeys = {};

function handleKeyDown(event) {
	if (event.key == "ArrowUp" || event.key == "ArrowDown" || event.key == "ArrowLeft" || event.key == "ArrowRight")
		event.preventDefault();
	
	currentlyPressedKeys[event.key] = true;
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.key] = false;
}


/** 
 * Function that updates fly vectors depending on keys pressed.
 */
function animate() {
	if (currentlyPressedKeys["w"]) {
		speed += 0.00001;
		if (speed > 0.002)
			speed = 0.002;
	}
	if (currentlyPressedKeys["s"]) {
		speed -= 0.00001;
		if (speed < 0)
			speed = 0;
	}
	var deltaQuat = quat.create();
	if (currentlyPressedKeys["ArrowUp"]) {
		quat.rotateX(deltaQuat, deltaQuat, degToRad(0.5 * pitchDir));
		quat.mul(viewQuat, deltaQuat, viewQuat);
	}
	if (currentlyPressedKeys["ArrowDown"]) {
		quat.rotateX(deltaQuat, deltaQuat, degToRad(-0.5 * pitchDir));
		quat.mul(viewQuat, deltaQuat, viewQuat);
	}
	if (currentlyPressedKeys["ArrowLeft"]) {
		quat.rotateZ(deltaQuat, deltaQuat, degToRad(-0.8));
		quat.mul(viewQuat, deltaQuat, viewQuat);
	}
	if (currentlyPressedKeys["ArrowRight"]) {
		quat.rotateZ(deltaQuat, deltaQuat, degToRad(0.8));
		quat.mul(viewQuat, deltaQuat, viewQuat);
	}
	if (currentlyPressedKeys["a"]) {
		quat.rotateY(deltaQuat, deltaQuat, degToRad(-0.2));
		quat.mul(viewQuat, deltaQuat, viewQuat);
	}
	if (currentlyPressedKeys["d"]) {
		quat.rotateY(deltaQuat, deltaQuat, degToRad(0.2));
		quat.mul(viewQuat, deltaQuat, viewQuat);
	}
	
}

/** 
 * Function that redraws the terrain and resets all the fly control variables
 */
function resetFly() {
	setupBuffers();
	speed = 0.001;

	eyeVec = vec3.create();    
	vec3.set(eyeVec,0.0,1.5,-0.2);

	viewQuat = quat.create();
	//default view angle
	quat.rotateX(viewQuat, viewQuat, degToRad(-90));
	quat.rotateY(viewQuat, viewQuat, degToRad(0));
	quat.rotateZ(viewQuat, viewQuat, degToRad(0));
}

/**
 * Toggle fog generation
 */
function toggleFog() {
	if (fogDensity > 0)
		fogDensity = 0;
	else 
		fogDensity = 0.7;
}

/**
 * Reverse the pitch
 */
function toggleReverse() {
	if (pitchDir > 0)
		pitchDir = -1;
	else 
		pitchDir = 1;
}