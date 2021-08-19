/**
 * @fileoverview A simple skybox using WebGL
 * @author Minghao Liu
 */


class Skybox{   
/**
 * Initialize members of a Skybox
 * @param {number} len length of the edge of the skybox
 */
    constructor(len){
        
		// Assign edge length
		this.length = len;
		
        // Allocate vertex position array
        this.vBuffer = [];
		
		// setup vertex position array
		this.setPositions();
    }
    
    /**
    * Send the buffer objects to WebGL for rendering 
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, this.vBuffer, gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = 12 * 3
		
    }

	
	draw(shaderProgram) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);
	}
	
	/**
	 * Triangle vertex positions for the skybox (cube). Found online
	 */
	setPositions() {
	  var l = this.length / 2.0;
	  this.vBuffer = new Float32Array(
		[
		-l, -l,  -l,
		-l,  l,  -l,
		 l, -l,  -l,
		-l,  l,  -l,
		 l,  l,  -l,
		 l, -l,  -l,

		-l, -l,   l,
		 l, -l,   l,
		-l,  l,   l,
		-l,  l,   l,
		 l, -l,   l,
		 l,  l,   l,

		-l,   l, -l,
		-l,   l,  l,
		 l,   l, -l,
		-l,   l,  l,
		 l,   l,  l,
		 l,   l, -l,

		-l,  -l, -l,
		 l,  -l, -l,
		-l,  -l,  l,
		-l,  -l,  l,
		 l,  -l, -l,
		 l,  -l,  l,

		-l,  -l, -l,
		-l,  -l,  l,
		-l,   l, -l,
		-l,  -l,  l,
		-l,   l,  l,
		-l,   l, -l,

		 l,  -l, -l,
		 l,   l, -l,
		 l,  -l,  l,
		 l,  -l,  l,
		 l,   l, -l,
		 l,   l,  l

		]);
	}
}