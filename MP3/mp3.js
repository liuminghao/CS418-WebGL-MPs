/**
 * @file Environment Mapping, MP3 for CS418 at UIUC
 * @author Eric Shaffer <shaffer1@illinois.edu>  
 * @author Minghao LIu <ml58@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global The shader program for the skybox*/
var shaderProgramSkybox;

/** @global The shader programs for the mesh*/
var shaderProgramPhong;
var shaderProgramReflect;
var shaderProgramRefract;

/** @global The Model only matrix, for calculating world coord vertex pos **/
var mMatrix = mat4.create();

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global An object holding the geometry for the skybox */
var skybox;

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

// View parameters
/** @global Location of the camera in world coordinates */
var baseEyePt = vec3.fromValues(0.0,0.0,1);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of the origin where we want to look at */
var origin = vec3.fromValues(0.0,0.0,0.0);

/** @global x axis vector for view matrix creation, in world coordinates */
var xAxis = vec3.fromValues(1.0,0.0,0.0);
/** @global y axis vector for view matrix creation, in world coordinates */
var yAxis = vec3.fromValues(0.0,1.0,0.0);
/** @global z axis vector for view matrix creation, in world coordinates */
var zAxis = vec3.fromValues(0.0,0.0,1.0);


//Light parameters
/** @global Light position in world coordinates */
var lightPosition = [1,1,1];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[1,1,1];


//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0, 1.0, 1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [90.0/255.0, 163.0/255.0, 163.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1,1,1];
/** @global Shininess exponent for Phong reflection */
var shininess = 100;

//Model parameters
var eulerY=0;
var meshRotY=0;
var meshRotX=0;
var meshRotZ=0;

//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send();
    console.log("made promise");
  });
}

//-------------------------------------------------------------------------
/**
 * Sends world eye position to shader
 * @param {Object} shader program to set
 */
function uploadWorldEyePtToShader(shaderProgram, eyePt) {
  gl.uniform3fv(shaderProgram.eyePosUniform, eyePt);
}

//-------------------------------------------------------------------------
/**
 * Sends the model only matrix to shader
 * @param {Object} shader program to set
 */
function uploadModelMatrixToShader(shaderProgram) {
  gl.uniformMatrix4fv(shaderProgram.mMatrixUniform, false, mMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 * @param {Object} shader program to set
 */
function uploadModelViewMatrixToShader(shaderProgram) {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 * @param {Object} shader program to set
 */
function uploadProjectionMatrixToShader(shaderProgram) {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 * @param {Object} shader program to set
 */
function uploadNormalMatrixToShader(shaderProgram) {
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends texture cubemap to shader
 * @param {Object} shader program to set
 */
function uploadTexureMapToShader(shaderProgram) {
  gl.uniform1i(shaderProgram.texMapUniform, 0);
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
 * Sends projection/modelview matrices to skybox shader
 * @param {Object} shader program to set
 */
function setUniforms(shaderProgram) {
  gl.useProgram(shaderProgram);
  uploadModelMatrixToShader(shaderProgram);
  uploadModelViewMatrixToShader(shaderProgram);
  uploadNormalMatrixToShader(shaderProgram);
  uploadProjectionMatrixToShader(shaderProgram);
  uploadTexureMapToShader(shaderProgram);
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
 * Setup the fragment and vertex shaders for the skybox
 */
function setupSkyboxShaders() {
  vertexShaderSkybox = loadShaderFromDOM("shader-vs-skybox");
  fragmentShaderSkybox = loadShaderFromDOM("shader-fs-skybox");
  
  shaderProgramSkybox = gl.createProgram();
  gl.attachShader(shaderProgramSkybox, vertexShaderSkybox);
  gl.attachShader(shaderProgramSkybox, fragmentShaderSkybox);
  gl.linkProgram(shaderProgramSkybox);

  if (!gl.getProgramParameter(shaderProgramSkybox, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
	
  gl.useProgram(shaderProgramSkybox);
	
  shaderProgramSkybox.vertexPositionAttribute = gl.getAttribLocation(shaderProgramSkybox, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramSkybox.vertexPositionAttribute);

  shaderProgramSkybox.mvMatrixUniform = gl.getUniformLocation(shaderProgramSkybox, "uMVMatrix");
  shaderProgramSkybox.pMatrixUniform = gl.getUniformLocation(shaderProgramSkybox, "uPMatrix");
	
  shaderProgramSkybox.texMapUniform = gl.getUniformLocation(shaderProgramSkybox, "uTexMap");
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders for the reflection shaders
 */
function setupMeshReflectShaders() {
  vertexShaderReflect = loadShaderFromDOM("shader-vs-reflect");
  fragmentShaderReflect = loadShaderFromDOM("shader-fs-reflect");
  
  shaderProgramReflect = gl.createProgram();
  gl.attachShader(shaderProgramReflect, vertexShaderReflect);
  gl.attachShader(shaderProgramReflect, fragmentShaderReflect);
  gl.linkProgram(shaderProgramReflect);

  if (!gl.getProgramParameter(shaderProgramReflect, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
	
  gl.useProgram(shaderProgramReflect);
	
  shaderProgramReflect.vertexPositionAttribute = gl.getAttribLocation(shaderProgramReflect, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramReflect.vertexPositionAttribute);

  shaderProgramReflect.vertexNormalAttribute = gl.getAttribLocation(shaderProgramReflect, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgramReflect.vertexNormalAttribute);
  
  shaderProgramReflect.eyePosUniform = gl.getUniformLocation(shaderProgramReflect, "eyePos");
  shaderProgramReflect.mMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uMMatrix");
  shaderProgramReflect.mvMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uMVMatrix");
  shaderProgramReflect.pMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uPMatrix");
  shaderProgramReflect.nMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uNMatrix");
	
  shaderProgramReflect.texMapUniform = gl.getUniformLocation(shaderProgramReflect, "uTexMap");
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders for the refraction shaders
 */
function setupMeshRefractShaders() {
  vertexShaderRefract = loadShaderFromDOM("shader-vs-refract");
  fragmentShaderRefract = loadShaderFromDOM("shader-fs-refract");
  
  shaderProgramRefract = gl.createProgram();
  gl.attachShader(shaderProgramRefract, vertexShaderRefract);
  gl.attachShader(shaderProgramRefract, fragmentShaderRefract);
  gl.linkProgram(shaderProgramRefract);

  if (!gl.getProgramParameter(shaderProgramRefract, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
	
  gl.useProgram(shaderProgramRefract);
	
  shaderProgramRefract.vertexPositionAttribute = gl.getAttribLocation(shaderProgramRefract, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramRefract.vertexPositionAttribute);

  shaderProgramRefract.vertexNormalAttribute = gl.getAttribLocation(shaderProgramRefract, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgramRefract.vertexNormalAttribute);
  
  shaderProgramRefract.eyePosUniform = gl.getUniformLocation(shaderProgramRefract, "eyePos");
  shaderProgramRefract.mMatrixUniform = gl.getUniformLocation(shaderProgramRefract, "uMMatrix");
  shaderProgramRefract.mvMatrixUniform = gl.getUniformLocation(shaderProgramRefract, "uMVMatrix");
  shaderProgramRefract.pMatrixUniform = gl.getUniformLocation(shaderProgramRefract, "uPMatrix");
  shaderProgramRefract.nMatrixUniform = gl.getUniformLocation(shaderProgramRefract, "uNMatrix");
	
  shaderProgramRefract.texMapUniform = gl.getUniformLocation(shaderProgramRefract, "uTexMap");
}


//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders using phong shading * for the mesh
 */
function setupMeshPhongShaders() {
  vertexShaderMesh = loadShaderFromDOM("shader-vs-phong");
  fragmentShaderMesh = loadShaderFromDOM("shader-fs-phong");
  
  shaderProgramPhong = gl.createProgram();
  gl.attachShader(shaderProgramPhong, vertexShaderMesh);
  gl.attachShader(shaderProgramPhong, fragmentShaderMesh);
  gl.linkProgram(shaderProgramPhong);

  if (!gl.getProgramParameter(shaderProgramPhong, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgramPhong);

  shaderProgramPhong.vertexPositionAttribute = gl.getAttribLocation(shaderProgramPhong, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramPhong.vertexPositionAttribute);
  
  shaderProgramPhong.vertexNormalAttribute = gl.getAttribLocation(shaderProgramPhong, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgramPhong.vertexNormalAttribute);
  
  shaderProgramPhong.mvMatrixUniform = gl.getUniformLocation(shaderProgramPhong, "uMVMatrix");
  shaderProgramPhong.pMatrixUniform = gl.getUniformLocation(shaderProgramPhong, "uPMatrix");
  shaderProgramPhong.nMatrixUniform = gl.getUniformLocation(shaderProgramPhong, "uNMatrix");
  shaderProgramPhong.uniformLightPositionLoc = gl.getUniformLocation(shaderProgramPhong, "uLightPosition");    
  shaderProgramPhong.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgramPhong, "uAmbientLightColor");  
  shaderProgramPhong.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgramPhong, "uDiffuseLightColor");
  shaderProgramPhong.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgramPhong, "uSpecularLightColor");
  shaderProgramPhong.uniformShininessLoc = gl.getUniformLocation(shaderProgramPhong, "uShininess");    
  shaderProgramPhong.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgramPhong, "uAmbientMaterialColor");  
  shaderProgramPhong.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgramPhong, "uDiffuseMaterialColor");  
  shaderProgramPhong.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgramPhong, "uSpecularMaterialColor");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Object} shader program to set
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(shaderProgram, alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Object} shader program to set
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(shaderProgram,loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate all buffers with data
 */
function setupBuffers() {
  
  //skybox
  
  skybox = new Skybox(4);
  skybox.loadBuffers();
  
  //Teapot
  myMesh = new Teapot();
  myPromise = asyncGetFile("https://raw.githubusercontent.com/illinois-cs418/cs418CourseMaterial/master/Meshes/teapot_0.obj");
  myPromise.then((retrievedText) => {
    myMesh.loadFromOBJ(retrievedText);
    console.log("file retrieved");
  })
  .catch((reason) => {
    console.log('didn\'t retrieve file, ' + reason);
  });
  
}

//----------------------------------------------------------------------------------
/**
 * Draw the mesh object with the corresponding shader program
 */
function drawWithShader(mesh, shaderProgram) {
  gl.useProgram(shaderProgram);
  mesh.draw(shaderProgram);
}

//----------------------------------------------------------------------------------
/**
 * load the environment mapping texture. Found online.
 */
function loadEnvironmentTexture() {
	
  // Create a texture.
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, 
      url: 'London/posx.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
      url: 'London/negx.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 
      url: 'London/posy.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
      url: 'London/negy.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 
      url: 'London/posz.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
      url: 'London/negz.jpg',
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const {target, url} = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.addEventListener('load', function() {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
    });
  });
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR); 
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
  
  //mat4.identity(pMatrix);


  // Then generate the lookat matrix poiting towards the origin
  var eyeTrans = mat4.create();;
  mat4.fromRotation(eyeTrans, degToRad(eulerY), yAxis);
  
  var eyePt = vec3.create();
  vec3.transformMat4(eyePt, baseEyePt, eyeTrans);
    
  mat4.lookAt(vMatrix,eyePt,origin,up);
  
  //fix the light in view coodinate
  vec3.transformMat4(lightPosition, [1,1,1], vMatrix);
  
  //draw skybox
  mvPushMatrix();
  mat4.multiply(mvMatrix,vMatrix,mvMatrix);
  setUniforms(shaderProgramSkybox);
  mvPopMatrix();

  drawWithShader(skybox, shaderProgramSkybox);

  if (myMesh.loaded()) {
    
    mvPushMatrix();
    
    //the model transform
    
    mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(0.1, 0.1, 0.1));

    mat4.rotateY(mvMatrix, mvMatrix, degToRad(meshRotY));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(meshRotX));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(meshRotZ));

    mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(-myMesh.xbar, -myMesh.ybar, -myMesh.zbar));
    
    mMatrix = mat4.clone(mvMatrix);
    
    
    
    if (document.getElementById("shading").checked) {
      
      //take the view normal of the mesh for phong shading
      mat4.multiply(mvMatrix,vMatrix,mvMatrix);
      
      //normal matrix follows modelview transform
      mat3.fromMat4(nMatrix,mvMatrix);
      mat3.transpose(nMatrix,nMatrix);
      mat3.invert(nMatrix,nMatrix);
      
      setUniforms(shaderProgramPhong);

      setLightUniforms(shaderProgramPhong, lightPosition,lAmbient,lDiffuse,lSpecular);
      
      setMaterialUniforms(shaderProgramPhong, shininess,kAmbient,kDiffuse,kSpecular); 
      
      drawWithShader(myMesh, shaderProgramPhong);
    }
    if (document.getElementById("reflective").checked) {
      
      //take the world normal of the mesh for cubemap
      mat3.fromMat4(nMatrix, mvMatrix);
      mat3.transpose(nMatrix,nMatrix);
      mat3.invert(nMatrix,nMatrix);
      
      //modelview transform
      mat4.multiply(mvMatrix,vMatrix,mvMatrix); 
      
      setUniforms(shaderProgramReflect);
      
      //transform eye point
      
      uploadWorldEyePtToShader(shaderProgramReflect, eyePt)
		
      drawWithShader(myMesh, shaderProgramReflect);
    }
    if (document.getElementById("refractive").checked) {
      
      //take the world normal of the mesh for cubemap
      mat3.fromMat4(nMatrix, mvMatrix);
      mat3.transpose(nMatrix,nMatrix);
      mat3.invert(nMatrix,nMatrix);
      
      //modelview transform
      mat4.multiply(mvMatrix,vMatrix,mvMatrix); 
      
      setUniforms(shaderProgramRefract);
      
      //transform eye point
      
      uploadWorldEyePtToShader(shaderProgramRefract, eyePt);
		
      drawWithShader(myMesh, shaderProgramRefract);
    }

    mvPopMatrix();
  }
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
function startup() {
	canvas = document.getElementById("myGLCanvas");
	gl = createGLContext(canvas);
	setupSkyboxShaders();
	setupMeshPhongShaders();
    setupMeshReflectShaders();
    setupMeshRefractShaders();
  
  
	setupBuffers();
	loadEnvironmentTexture();
  
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
    draw();
}


//----------------------------------------------------------------------------------
/** 
 * Interaction part, event handlers, animation
 */
var currentlyPressedKeys = {};

function handleKeyDown(event) {
	currentlyPressedKeys[event.key] = true;
	if (currentlyPressedKeys["a"]) {
		// key A
		eulerY-= 2;
	} else if (currentlyPressedKeys["d"]) {
		// key D
		eulerY+= 2;
	} 

	if (currentlyPressedKeys["w"]){
		// Up cursor key
		event.preventDefault();
		baseEyePt[2]+= 0.02;
	} else if (currentlyPressedKeys["s"]){
		event.preventDefault();
		// Down cursor key
		baseEyePt[2]-= 0.02;
	}
  
    if (currentlyPressedKeys["ArrowLeft"]){
		// Left cursor key
		event.preventDefault();
        meshRotY -= 2;
	} else if (currentlyPressedKeys["ArrowRight"]){
		event.preventDefault();
		// Right cursor key
		meshRotY += 2;
	} 
    if (currentlyPressedKeys["ArrowUp"]){
		// Up cursor key
		event.preventDefault();
        meshRotX -= 2;
	} else if (currentlyPressedKeys["ArrowDown"]){
		event.preventDefault();
		// Down cursor key
		meshRotX += 2;
	} 
    if (currentlyPressedKeys[","]){
		// Up cursor key
		event.preventDefault();
        meshRotZ -= 2;
	} else if (currentlyPressedKeys["."]){
		event.preventDefault();
		// Down cursor key
		meshRotZ += 2;
	} 
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.key] = false;
}


/** 
 * Function that updates data fields
 */
function animate() {
   document.getElementById("eY").value=eulerY;
   document.getElementById("eZ").value=baseEyePt[2];
   document.getElementById("mX").value=meshRotX;
   document.getElementById("mY").value=meshRotY;
   document.getElementById("mZ").value=meshRotZ;
}