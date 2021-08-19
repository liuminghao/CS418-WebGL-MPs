/**
 * @file UIUC CS418 MP1 A Dancing Logo
 * @author Minghao Liu <ml58@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

//variables for the logo

/** @global The WebGL buffers holding the triangle for the logo*/
var vertexPositionBufferTop;
var vertexPositionBufferMid;
var vertexPositionBufferBot;
var vertexPositionBufferTopInner;
var vertexPositionBufferMidInner;
var vertexPositionBufferBotInner;

/** @global The WebGL buffers holding the vertex colors for the logo*/
var vertexBlueBufferTop;
var vertexBlueBufferMid;
var vertexBlueBufferBot;
var vertexOrangeBufferTop;
var vertexOrangeBufferMid;
var vertexOrangeBufferBot;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The angle of rotation around the x axis */
var rotAngle = 0;

/** @global If the rotation is clockwise; this dictates the cycle*/
var clockwise = true;

/** @global The translation on x coodinate */
var transX = 0;

/** @global The translation on y coodinate */
var transY = 0;

/** @global The delta of the non-uniform transformation */
var delta = 0;


//variables for the custom animation

/** @global The buffer holding the vertex positions for the square */
var vertexPositionBufferCustom;

/** @global The buffer holding the colors for the square */
var vertexColorBufferCustom;

/** @global The color change variable, updated each tick */
var colorDelta = 0.0;

/** @global flag for custom animation to maintain a cycle*/
var flag = true;

/**
 * Radio button control
 * @return {Boolean} True if logo is selected; false if custom animation is selected
 */
function isLogo() {
  return document.getElementById("Logo").checked;
}



//GL setup for both animations

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

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

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor"); 
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}



//Setup, drawing and animation for the Logo Buffers

/**
 * Populate the Logo buffers with data
 */
function setUpBuffersLogo() {
  
  //We draw the logo in 6 parts, thus 6 buffers. We have 3 blue parts and 3 orange parts. The 3 buffers with the same color are combined to an "I"
  
  //Initialize Buffers
  vertexPositionBufferTop = gl.createBuffer();
  
  vertexBlueBufferTop = gl.createBuffer();
  
  vertexPositionBufferMid = gl.createBuffer();
  
  vertexBlueBufferMid = gl.createBuffer();
  
  vertexPositionBufferBot = gl.createBuffer();
  
  vertexBlueBufferBot = gl.createBuffer();
  
  vertexPositionBufferTopInner = gl.createBuffer();
  
  vertexOrangeBufferTop = gl.createBuffer();
  
  vertexPositionBufferMidInner = gl.createBuffer();
  
  vertexOrangeBufferMid = gl.createBuffer();
  
  vertexPositionBufferBotInner = gl.createBuffer();
  
  vertexOrangeBufferBot = gl.createBuffer();
  
  
  //draw outer part of the logo
  
  //top blue part
  var topVertices = [
         -1.0/3,  0.7/3,  0.0,
         -1.0/3,  1.5/3,  0.0,
         -0.55/3, 0.7/3,  0.0,
          1.0/3,  1.5/3,  0.0,
          1.0/3,  0.7/3,  0.0
  ];
  var topColors = [
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0
  ];
  
  updateBuffer(vertexPositionBufferTop, topVertices, vertexBlueBufferTop, topColors);
  
  
  //middle blue part
  var midVertices = [
         -0.55/3,   0.7/3,  0.0,
          0.55/3,   0.7/3,  0.0,
         -0.55/3,  -0.7/3,  0.0,
          0.55/3,  -0.7/3,  0.0
  ];
  var midColors = [
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0
  ];
  updateBuffer(vertexPositionBufferMid, midVertices, vertexBlueBufferMid, midColors);

  
  //bottom blue part
  var botVertices = [
         -1.0/3,  -0.7/3,  0.0,
         -1.0/3,  -1.5/3,  0.0,
         -0.55/3, -0.7/3,  0.0,
          1.0/3,  -1.5/3,  0.0,
          1.0/3,  -0.7/3,  0.0
  ];
  var botColors = [
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0
    
  ];
  
  updateBuffer(vertexPositionBufferBot, botVertices, vertexBlueBufferBot, botColors);
  
  
  
  //The inner part of the logo
  
  //top orange part
  var topInnerVertices = [
         -0.9/3,  0.8/3,  -0.1,
         -0.9/3,  1.4/3,  -0.1,
         -0.55/3, 0.8/3,  -0.1,
          0.9/3,  1.4/3,  -0.1,
          0.9/3,  0.8/3,  -0.1
  ]; 
  var topInnerColors = [
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0
      
  ];
  
  updateBuffer(vertexPositionBufferTopInner, topInnerVertices, vertexOrangeBufferTop, topInnerColors);
  
  
  //middle orange part
  var midInnerVertices = [
         -0.45/3,   0.8/3,  -0.1,
          0.45/3,   0.8/3,  -0.1,
         -0.45/3,  -0.8/3,  -0.1,
          0.45/3,  -0.8/3,  -0.1
  ];
  var midInnerColors = [
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0
  ];
  
  updateBuffer(vertexPositionBufferMidInner, midInnerVertices, vertexOrangeBufferMid, midInnerColors);
  
  
  //bottom blue part
  var botInnerVertices = [
         -0.9/3,  -0.8/3,  -0.1,
         -0.9/3,  -1.4/3,  -0.1,
         -0.55/3, -0.8/3,  -0.1,
          0.9/3,  -1.4/3,  -0.1,
          0.9/3,  -0.8/3,  -0.1
  ];
  var botInnerColors = [
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0
    
  ];
  
  updateBuffer(vertexPositionBufferBotInner, botInnerVertices, vertexOrangeBufferBot, botInnerColors);
  
}

/**
 * draw call that applies matrix transformations to model and draws model in frame
 */
function drawLogo() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  //Setup matrices for affine transformations
  mat4.fromTranslation(mvMatrix, vec3.fromValues(transX, transY, 0))
  mat4.rotateZ(mvMatrix, mvMatrix, degToRad(rotAngle)); 

  setMatrixUniforms();
  
  
  //set up new vertex positions for non-uniform transformation
  var updatedPosition = [
         (-1.0-delta)/3,  -0.7/3,            0.0,
         (-1.0-delta)/3,  -(1.5+delta)/3,    0.0,
         (-0.55-delta)/3, -0.7/3,            0.0,
          (1.0-delta)/3,  -(1.5-delta)/3,    0.0,
          (1.0-delta)/3,  -0.7/3,            0.0
  ];
  
  var blue = [
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0,
        19.0/255.0, 41.0/255.0, 75.0/255.0, 1.0
    
  ];
  updateBuffer(vertexPositionBufferBot, updatedPosition, vertexBlueBufferBot, blue);
  
  updatedPosition = [
         (-0.9-delta)/3,          -0.8/3,    -0.1,
         (-0.9-delta)/3,  -(1.4+delta)/3,    -0.1,
         (-0.55-delta)/3,         -0.8/3,    -0.1,
          (0.9-delta)/3,  -(1.4-delta)/3,    -0.1,
          (0.9-delta)/3,          -0.8/3,    -0.1
  ];
  
  var orange = [
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0,
        232.0/255.0, 74.0/255.0, 39.0/255.0, 1.0
  ];
  
  
  updateBuffer(vertexPositionBufferBotInner, updatedPosition, vertexOrangeBufferBot, orange);
  
  //draw everything  
  drawHelper(vertexPositionBufferTop, vertexBlueBufferTop, gl.TRIANGLE_STRIP)
  
  drawHelper(vertexPositionBufferMid, vertexBlueBufferMid, gl.TRIANGLE_STRIP)
  
  drawHelper(vertexPositionBufferBot, vertexBlueBufferBot, gl.TRIANGLE_STRIP)  
  
  drawHelper(vertexPositionBufferTopInner, vertexOrangeBufferTop, gl.TRIANGLE_STRIP)
  
  drawHelper(vertexPositionBufferMidInner, vertexOrangeBufferMid, gl.TRIANGLE_STRIP)

  drawHelper(vertexPositionBufferBotInner, vertexOrangeBufferBot, gl.TRIANGLE_STRIP)
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animateLogo() {
  //Shaking left and right
  if (clockwise)
    rotAngle = rotAngle+1.0;
  else rotAngle = rotAngle-1.0;
  
  if (Math.abs(rotAngle) > 30)
    clockwise = !clockwise
  
  //moving from left to top to right
  transX = transX + 0.01;
  if (transX > 1.5)
    transX = -1.5;
  
  transY = 0.8 - Math.abs(transX);
  
  //Upper part shakes in cycles
  if (clockwise)
    delta = delta + 0.015;
  else
    delta = delta - 0.015
}




//Setup and drawing for the Custom Buffers

/**
 * Populate the custom animation buffer with data
 */
function setUpBuffersCustom() {
  
  //Initialization
  vertexPositionBufferCustom = gl.createBuffer();
  vertexColorBufferCustom = gl.createBuffer();
  
  //vertex positions for the double square
  var vertices = [
     1.0,  1.0, 0.0,
    -1.0,  1.0, 0.0,
    -0.5,  0.5, 0.0,
    -1.0, -1.0, 0.0,
    -0.5, -0.5, 0.0,
     1.0, -1.0, 0.0,
     0.5, -0.5, 0.0,
     1.0,  1.0, 0.0,
     0.5,  0.5, 0.0,
    -0.5,  0.5, 0.0,
     0.5,  0.5, 0.0,
    -0.5, -0.5, 0.0,
     0.5, -0.5, 0.0,
  ];
  
  //vertex colors for the double square
  var colors = [
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.5, 0.5, 0.5, 1.0,
    0.0, 0.0, 1.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    0.5, 0.5, 0.5, 1.0,
    1.0, 0.0, 0.0, 1.0,
    0.5, 0.5, 0.5, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0 
  ];
  updateBuffer(vertexPositionBufferCustom, vertices, vertexColorBufferCustom, colors);
}

/**
 * draw call that changes the color of the custom animation
 */
function drawCustom() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  //Don't do any transformation
  mat4.identity(mvMatrix);
  setMatrixUniforms()
  
  //Change color
  var newColor = [
    1.0-colorDelta, 0.0+colorDelta, 0.0, 1.0,
    0.0+colorDelta, 1.0-colorDelta, 0.0, 1.0,
    1.0-colorDelta, 0.0, 0.0+colorDelta, 1.0,
    0.0+colorDelta, 0.0+colorDelta, 1.0-colorDelta, 1.0,
    0.0, 1.0-colorDelta, 0.0+colorDelta, 1.0,
    0.5-colorDelta/2, 0.5+colorDelta/2, 0.5-colorDelta/2, 1.0,
    0.0+colorDelta, 0.0+colorDelta, 1.0-colorDelta, 1.0,
    1.0-colorDelta, 0.0+colorDelta, 0.0, 1.0,
    0.5+colorDelta/2, 0.5-colorDelta/2, 0.5+colorDelta/2, 1.0,
    1.0-colorDelta, 0.0, 0.0+colorDelta, 1.0,
    0.5+colorDelta/2, 0.5-colorDelta/2, 0.5+colorDelta/2, 1.0,
    0.0, 1.0-colorDelta, 0.0+colorDelta, 1.0,
    0.0+colorDelta, 0.0+colorDelta, 1.0-colorDelta, 1.0 
  ]
  
  updateBuffer(null, null, vertexColorBufferCustom, newColor);

  //draw custom buffer  
  drawHelper(vertexPositionBufferCustom, vertexColorBufferCustom, gl.TRIANGLE_STRIP);
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animateCustom() {
  if (flag)
    colorDelta = colorDelta + 0.005;
  else 
    colorDelta = colorDelta - 0.005;
  if (colorDelta >= 1 || colorDelta <= 0) {
    flag = !flag;
  }
}



//Common part for setup

/**
 * Startup function called from html code to start program.
 */
function startup() {
  
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  
  
  document.getElementById("Logo").checked = true;

  setUpBuffersLogo();
  setUpBuffersCustom();
  
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
  requestAnimFrame(tick);
  if (isLogo()) {
    drawLogo();
    animateLogo();
  }
  else {
    drawCustom();
    animateCustom();
  }
}





//Helper functions, used by both animations


/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Update buffers for a set of vertices, for both position and color. If one does not want to change the position/color, set the buffer variable to null, then the corresponding buffer won't be changed.
 * @param The buffer that will contain the position data
 * @param The vertex coodinates, given by an array of floats
 * @param The buffer that will contain the color data
 * @param The vertex colors, given by an array of floats; the length should match the number of vertices
 */
function updateBuffer(posBuffer, posData, colorBuffer, colorData) {
  
  //Vertex Position buffer
  if (posBuffer != null) {
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); 

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posData), gl.DYNAMIC_DRAW);
    posBuffer.itemSize = 3;
    posBuffer.numberOfItems = posData.length/3;
  }

  //Vertex color buffer
  if (colorBuffer != null) {
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.DYNAMIC_DRAW);
    colorBuffer.itemSize = 4;
    colorBuffer.numItems = colorData.length/4;  
  }
}

/**
 * Draw a set of vertices using a position buffer and a color buffer, using the provided interpretation of the positions
 * @param {positionBuffer} The buffer holding the position data
 * @param {colorBuffer} The buffer holding the color data
 * @param {glFlag} The way we interpret the position data, eg. gl.TRIANGLES
 */
function drawHelper(posBuffer, colorBuffer, glFlag) {
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         posBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute)
  
  gl.drawArrays(glFlag, 0, posBuffer.numberOfItems);
}
