/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */

/** Class implementing 3D terrain. */
class Terrain{   
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");
        
        this.generateLines();
        console.log("Terrain: Generated lines");
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }
    
    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
    	var vid = 3 * ((this.div + 1) * i + j);
		this.vBuffer[vid] = v[0];
		this.vBuffer[vid + 1] = v[1];
		this.vBuffer[vid + 2] = v[2];
    }
    
    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        var vid = 3 * ((this.div + 1) * i + j);
		
		v[0] = this.vBuffer[vid];
		v[1] = this.vBuffer[vid + 1];
		v[2] = this.vBuffer[vid + 2];
    }
    
    /**
    * Send the buffer objects to WebGL for rendering 
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");
    
        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");
    
        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");
    
        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;
        
        console.log("triangulatedPlane: loadBuffers");
    }
    
    /**
    * Render the triangles 
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }
    
    /**
    * Render the triangle edges wireframe style 
    */
    drawEdges(){
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);   
    }
/**
 * Fill the vertex and buffer arrays 
 */    
generateTriangles()
{
    	
	var deltaX = (this.maxX - this.minX) / this.div;
	var deltaY = (this.maxY - this.minY) / this.div;
	
	for (var i=0; i<this.div+1; i++) 
		for (var j=0; j<this.div+1; j++) {
			this.vBuffer.push(this.minX + deltaX * j);
			this.vBuffer.push(this.minY + deltaY * i);
			this.vBuffer.push(0);
			
			this.nBuffer.push(0);
			this.nBuffer.push(0);
			this.nBuffer.push(1);
		}
	
	for (var i=0; i<this.div; i++) 
		for (var j=0; j<this.div; j++) {
			
			var vid = i*(this.div+1) + j;
			
			
			//Must be counter clockwise
			this.fBuffer.push(vid);
			this.fBuffer.push(vid + 1);
			this.fBuffer.push(vid + this.div + 1);
			
			this.fBuffer.push(vid + 1);
			this.fBuffer.push(vid + 1 + this.div + 1);
			this.fBuffer.push(vid + this.div + 1);
			
		}
	
    this.numVertices = this.vBuffer.length/3;
    this.numFaces = this.fBuffer.length/3;
}
	

/**
 * Set the height of the vertices by repeatedly partition them randomly
 * and raise/lower the height
 * @param {number} N the number of times of the partitions 
 * @param {number} delta the amount to raise/lower the height
 * @param {number} type the type of the base terrain,, 0 for flat, 1 for hill, 2 for valley
 */
setHeightsByPartition(N, delta, type) {
	
	var rangeX = this.maxX-this.minX;
	var rangeY = this.maxY-this.minY;
	var averageX = rangeX/2 + this.minX;
	var averageY = rangeY/2 + this.minY;
	
	//generate a hill or valley
	if (type) {
		for (var i=0; i<this.div+1; i++) 
			for (var j=0; j<this.div+1; j++){
				var v = [0,0,0];
				this.getVertex(v, i, j);

				//hill
				if (type == 1)
					v[2] = Math.cos(v[0] / rangeX * 2 *Math.PI)*delta * 25
						 + Math.cos(v[1] / rangeY * 2 *Math.PI)*delta * 25;
				
				//valley
				if (type == 2)
					v[2] = ((v[1]-this.minY)/rangeY) * delta * 10
						 - Math.cos(v[0] / rangeX * 2 *Math.PI)*delta * 25;
				
				//slope
				if (type == 3)
					v[2] = (v[0]-averageX)/ rangeX * 2 * delta * 25
						 + (v[1]-averageY)/ rangeX * 2 * delta * 25
				
				this.setVertex(v, i, j);
			}
	}
	//generate random terrain by raising one side and lower the other
	for (var k=0; k<N; k++) {
		
		//Random point between [minx, miny] and [maxx, maxy]
		var px = this.minX + Math.random() * rangeX;
		var py = this.minY + Math.random() * rangeY;

		//Random normal
		var angle = Math.random() * Math.PI * 2;
		var nx = Math.cos(angle);
		var ny = Math.sin(angle);

		for (var i =0; i<this.numVertices; i++) {

			var vid = 3 * i;

			var x = this.vBuffer[vid];
			var y = this.vBuffer[vid + 1];

			var dotProduct = (x-px) * nx + (y-py) * ny;
			if (dotProduct > 0 )
				this.vBuffer[vid + 2] += delta;
			else
				this.vBuffer[vid + 2] -= delta;
		}
	}
	
	//recalculate the normal values for each vertex
	//using gl matrix vec3 to easily normalize and do cross product
	var nArray = [];
	for (var i=0; i<this.numVertices; i++) {
			nArray.push(vec3.fromValues(0, 0, 0));
		}

	for (var i=0; i<this.numFaces; i++) {
		
		var id1 = this.fBuffer[3*i];
		var id2 = this.fBuffer[3*i+1];
		var id3 = this.fBuffer[3*i+2];
		
		var v1 = vec3.fromValues(this.vBuffer[3*id1], 
								 this.vBuffer[3*id1+1], 
								 this.vBuffer[3*id1+2]);

		var v2 = vec3.fromValues(this.vBuffer[3*id2], 
								 this.vBuffer[3*id2+1], 
								 this.vBuffer[3*id2+2]);

		var v3 = vec3.fromValues(this.vBuffer[3*id3], 
								 this.vBuffer[3*id3+1], 
								 this.vBuffer[3*id3+2]);

		var t1 = vec3.create();
		var t2 = vec3.create();
		var n  = vec3.create();

		vec3.sub(t1, v2, v1);
		vec3.sub(t2, v3, v1);
		vec3.cross(n, t1, t2);
		//vec3.normalize(n,n);
		
		vec3.add(nArray[id1], nArray[id1], n);
		vec3.add(nArray[id2], nArray[id2], n);
		vec3.add(nArray[id3], nArray[id3], n);
		
	}
	
	
	//update the normal buffer
	this.nBuffer = [];
	for (var i=0; i<this.numVertices; i++) {
			
			vec3.normalize(nArray[i], nArray[i]);
			
			this.nBuffer.push(nArray[i][0]);
			this.nBuffer.push(nArray[i][1]);
			this.nBuffer.push(nArray[i][2]);
		}

}
	


/**
 * Print vertices and triangles to console for debugging
 */
printBuffers()
    {
        
    for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ", 
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");
                       
          }
    
      for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ", 
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");
                       
          }
        
    }

	
/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines()
{
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);
        
        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);
        
        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }
    
}
    
}
