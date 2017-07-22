import * as THREE from 'three'
import GPUComputationRenderer from './GPUComputationRenderer'
import createLoop from 'canvas-loop'
import kd from 'keydrown'
import ecs from 'tiny-ecs'
import ec from 'three-effectcomposer'
const EffectComposer = ec(THREE)
//import { glslify } from 'glslify'
const glslify = require('glslify') // needed for bug https://github.com/stackgl/glslify/issues/49 - if you try using fixes like glslify babel plugin, then shaders wont live reload!!
import CANNON from 'cannon'
import dat from 'dat.gui'

//systems 
import initPhysics from './initPhysics'
import initGraphics from './initGraphics'
import stickToTargetSystem from './stickToTargetSystem'
import billboardSystem from './billboardSystem'

//components 
import Physics from './Physics'
import WASD from './WASD'
import Graphics from './Graphics'
import StickToTarget from './StickToTarget'
import Position from './Position'
import Quaternion from './Quaternion'
import Billboard from './Billboard'

//assets 

const scene = new THREE.Scene()
const gui = new dat.GUI()
document.getElementsByClassName('dg')[0].style.zIndex = 1;


var seed = {"value":0.0};

//physics 

var world = new CANNON.World();

//world.gravity = new CANNON.Vec3(0, -9.82, 0) // m/s²  
world.gravity = new CANNON.Vec3(0, 0, 0) // m/s² 

world.broadphase = new CANNON.NaiveBroadphase();

world.solver.iterations = 10;


//canvas for rendering	
const canvas =  document.createElement('canvas')
document.body.appendChild(canvas)

//renderer 
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  devicePixelRatio: window.devicePixelRatio,
})

//renderer.context.getShaderInfoLog = function () { return '' }; //nasty hack to suppress error merssages due to possible ff bug? https://github.com/mrdoob/three.js/issues/9716


//setup ecs
var ents = new ecs.EntityManager(); //ents, because, i keep misspelling entities

// the player
const player = ents.createEntity();
player.addComponent(Position);
player.addComponent(Quaternion);
player.addComponent(Physics);
player.addComponent(Graphics);
//player.addComponent(WASD);

player.position.y = 8
player.position.z = 30


//renderer.setClearColor(0xff6600, 1)
renderer.setClearColor(0xeeeeee, 1)
var fixedTimeStep = 1 / 60; // physics engine setting - keeps render framerate and sim in sync
var maxSubSteps = 10; // physics engine setting - not 100% sure what this does

//setup buffer render target for render to texture stuff. 
const bufferScene = new THREE.Scene();
var bufferTexture = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});

//setup camera	
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500)
camera.position.set(0, 0, 0)

//passthrough shader for fullscreen + buffer. Use this as template for effects.  
const passthroughShader = {

    uniforms :{
	"tLast" : {type: "t", value: bufferTexture}, 
        "tDiffuse": { type: "t", value: null },   // output from previous - all need this  
        "iResolution": {type: 'v2', value: new THREE.Vector2()},
        "iGlobalTime": { type: 'f', value: 0 },
    },
  vertexShader: glslify('../shaders/pass_vert.glsl'),
  fragmentShader: glslify('../shaders/pass_frag.glsl'),

}

//effect composer to deal with the screen shaders
let composer = new EffectComposer( renderer );
composer.addPass( new EffectComposer.RenderPass(scene,camera)); //the actual scene
let passthroughEffect = new EffectComposer.ShaderPass(passthroughShader); // the passthrough shader
composer.addPass( passthroughEffect ) // adding the passthrough shader

composer.passes[composer.passes.length - 1].renderToScreen = true;


var light = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( light );

// procedural deformation texture
const deform_mat = new THREE.ShaderMaterial({
  vertexShader: glslify('../shaders/deform_vert.glsl'),
  fragmentShader: glslify('../shaders/deform_frag.glsl'),
  transparent: true,
  uniforms: { 
    lacunarity: { type:'f',value:2.0},
    gain: { type:'f',value:0.5},
    fbmx: { type:'f',value:0.5},
    fbmy: { type:'f',value:0.5},
    deformAmount: { type:'f',value:1.0},
    iGlobalTime: { type: 'f', value: 0 },
    iResolution: {type: 'v2', value: new THREE.Vector2()},
    colour: {type: 'v3', value: new THREE.Color( 26,165,26 )},
    alpha: {type: 'f', value: 1.0},    
    tDiffuse: { type: "t", value: null }
  },
  defines: {
    USE_MAP: ''
  }
})
const water_mat = new THREE.ShaderMaterial({
  vertexShader: glslify('../shaders/deform_water_vert.glsl'),
  fragmentShader: glslify('../shaders/water_frag.glsl'),
  transparent: true,
  uniforms: { 
    lacunarity: { type:'f',value:2.0},
    gain: { type:'f',value:0.5},
    fbmx: { type:'f',value:0.5},
    fbmy: { type:'f',value:0.5},
    deformAmount: { type:'f',value:1.0},
    seaLevel: { type:'f',value:-0.25},
    iResolution: {type: 'v2', value: new THREE.Vector2()},
    colour: {type: 'v3', value: new THREE.Color( 0,0,255 )},
    alpha: {type: 'f', value: 0.3}, 
    iGlobalTime: { type: 'f', value: 0 },
    
  },
  defines: {
    USE_MAP: ''
  }
})
const vor_mat = new THREE.ShaderMaterial({
  vertexShader: glslify('../shaders/pass_vert.glsl'),
  fragmentShader: glslify('../shaders/pass_frag.glsl'),
  transparent: true,
  uniforms: { 
        "tDiffuse": { type: "t", value: null }
  },
  defines: {
    USE_MAP: ''
  }
})
const fbm_mat = new THREE.ShaderMaterial({
  vertexShader: glslify('../shaders/pass_vert.glsl'),
  fragmentShader: glslify('../shaders/pass_frag.glsl'),
  transparent: true,
  uniforms: { 
        "tDiffuse": { type: "t", value: null }
  },
  defines: {
    USE_MAP: ''
  }
})


const island_mat = new THREE.ShaderMaterial({
  vertexShader: glslify('../shaders/pass_vert.glsl'),
  fragmentShader: glslify('../shaders/pass_frag.glsl'),
  transparent: true,
  uniforms: { 
        "tDiffuse": { type: "t", value: null }
  },
  defines: {
    USE_MAP: ''
  }
})

gui.add(seed, 'value',0,10000).name('seed');

var terrainGui = gui.addFolder("Terrain")
terrainGui.addColor(deform_mat.uniforms.colour,'value')
    .name('colour');
terrainGui.add(deform_mat.uniforms.deformAmount, 'value', -50, 50)
    .name('deformAmount');


var gpuCompute = new GPUComputationRenderer( 128,128, renderer );
var vorHeight = gpuCompute.createTexture();
var vorHeightVariable = gpuCompute.addVariable( "textureVorHeight",  glslify('../shaders/compute_frag.glsl'), vorHeight );
gpuCompute.setVariableDependencies( vorHeightVariable, [ vorHeightVariable] );


vorHeightVariable.material.uniforms.gridPos= { type:'v2',value:new THREE.Vector2(seed.value,seed.value)}
vorHeightVariable.material.uniforms.scale= { type:'f',value:9.5}

var vorGui = gui.addFolder('Voronoi');
vorGui.add(vorHeightVariable.material.uniforms.scale, 'value', 0, 128)
    .name('scale');

var fbmHeight = gpuCompute.createTexture();
var fbmHeightVariable = gpuCompute.addVariable( "textureFbmHeight",  glslify('../shaders/fbm_frag.glsl'), fbmHeight );
gpuCompute.setVariableDependencies( fbmHeightVariable, [ fbmHeightVariable] );

fbmHeightVariable.material.uniforms.gridPos= { type:'v2',value:new THREE.Vector2(seed.value,seed.value)}
fbmHeightVariable.material.uniforms.lacunarity = { type:'f',value:2.0} 
fbmHeightVariable.material.uniforms.gain = { type:'f',value:0.5}
fbmHeightVariable.material.uniforms.fbmx = { type:'f',value:0.5}
    fbmHeightVariable.material.uniforms.fbmy= { type:'f',value:0.5}


var fbmGui = gui.addFolder('Fractal Brownian Motion');
fbmGui.add(fbmHeightVariable.material.uniforms.fbmx, 'value', -5, 5)
    .name('fbmx');
fbmGui.add(fbmHeightVariable.material.uniforms.fbmy, 'value', -5, 5)
    .name('fbmy');
fbmGui.add(fbmHeightVariable.material.uniforms.lacunarity, 'value', -5, 5)
    .name('lacunarity');
fbmGui.add(fbmHeightVariable.material.uniforms.gain, 'value', -5, 5)
    .name('gain');




var islandHeight = gpuCompute.createTexture();
var islandHeightVariable = gpuCompute.addVariable( "textureIslandHeight",  glslify('../shaders/island_frag.glsl'), islandHeight );
gpuCompute.setVariableDependencies( islandHeightVariable, [ islandHeightVariable] );

islandHeightVariable.material.uniforms.p0= { type:'v2', value: new THREE.Vector2(0.5,0.5)};
islandHeightVariable.material.uniforms.p1= { type:'v2', value: new THREE.Vector2(0.5,0.5)};


var islandGui = gui.addFolder('Blobs');
islandGui.add(islandHeightVariable.material.uniforms.p0.value, 'x', 0.,1.)
    .name('p0.x');
islandGui.add(islandHeightVariable.material.uniforms.p0.value, 'y', 0.,1.)
    .name('p0.y');
islandGui.add(islandHeightVariable.material.uniforms.p1.value, 'x', 0.,1.)
    .name('p1.x');
islandGui.add(islandHeightVariable.material.uniforms.p1.value, 'y', 0.,1.)
    .name('p1.y');
var mix = gpuCompute.createTexture();
var mixVariable = gpuCompute.addVariable( "textureMix",  glslify('../shaders/mix2_frag.glsl'), mix );
gpuCompute.setVariableDependencies( mixVariable, [ mixVariable, fbmHeightVariable,vorHeightVariable,islandHeightVariable] );
    mixVariable.material.uniforms.mixAmount= { type:'f',value:0.32}
    mixVariable.material.uniforms.mixAmount2= { type:'f',value:2.91}
var mixGui = gui.addFolder('Mix');
mixGui.add(mixVariable.material.uniforms.mixAmount, 'value', 0.,1.)
    .name('voroni-fbm mix');
mixGui.add(mixVariable.material.uniforms.mixAmount2, 'value', 0.,10.)
    .name('blob mix');

var waterGui = gui.addFolder('Water');
waterGui.add(water_mat.uniforms.fbmx, 'value', -5, 5)
    .name('fbmx');
waterGui.add(water_mat.uniforms.fbmy, 'value', -5, 5)
    .name('fbmy');
waterGui.add(water_mat.uniforms.lacunarity, 'value', -5, 5)
    .name('lacunarity');
waterGui.add(water_mat.uniforms.gain, 'value', -5, 5)
    .name('gain');
waterGui.add(water_mat.uniforms.deformAmount, 'value', -5, 5)
    .name('deformAmount');
waterGui.add(water_mat.uniforms.seaLevel, 'value', -5, 5)
    .name('seaLevel');

waterGui.addColor(water_mat.uniforms.colour,'value')
    .name('colour');
waterGui.add(water_mat.uniforms.alpha, 'value', 0.,1.)
    .name('alpha');
var error = gpuCompute.init();
				if ( error !== null ) {
				    console.error( error );
				}

const app = createLoop(canvas, { scale: renderer.devicePixelRatio })

//uniforms for screen shaders
passthroughEffect.uniforms.iResolution.value.set(app.shape[0],app.shape[1]);

//time - for passing into shaders
let time = 0

//the terrain plane
var geom = new THREE.PlaneGeometry(
			    32, 32, // Width and Height
			        32,32   // Terrain resolution
			)

var geom2 = new THREE.PlaneGeometry(
			    8, 8, // Width and Height
			        1, 1   // Terrain resolution
			)

const plane = ents.createEntity();
plane.addComponent(Graphics);
plane.addComponent(Position);
plane.graphics.mesh = new THREE.Mesh(geom);

plane.graphics.mesh.material = deform_mat 
plane.graphics.mesh.material.side=THREE.DoubleSide
plane.graphics.mesh.rotation.x -= 90 * Math.PI/180;

const plane2 = ents.createEntity();
plane2.addComponent(Graphics);
plane2.addComponent(Position);
plane2.addComponent(Quaternion);
plane2.addComponent(Billboard);
plane2.addComponent(StickToTarget);
plane2.stickToTarget.target = plane;
plane2.stickToTarget.offset.x = -10 ;
plane2.position.y = 10;
plane2.graphics.mesh = new THREE.Mesh(geom2);

plane2.graphics.mesh.material = vor_mat 
const plane3 = ents.createEntity();
plane3.addComponent(Graphics);
plane3.addComponent(Position);
plane3.addComponent(Quaternion);
plane3.addComponent(Billboard);
plane3.addComponent(StickToTarget);
plane3.stickToTarget.target = plane;
plane3.position.y = 10;
plane3.stickToTarget.offset.x = 0 ;
plane3.graphics.mesh = new THREE.Mesh(geom2);

plane3.graphics.mesh.material = fbm_mat 


const plane4 = ents.createEntity();
plane4.addComponent(Graphics);
plane4.addComponent(Position);
plane4.addComponent(Quaternion);
plane4.addComponent(Billboard);
plane4.addComponent(StickToTarget);
plane4.stickToTarget.target = plane;
plane4.position.y = 10;
plane4.stickToTarget.offset.x = 10 ;
plane4.graphics.mesh = new THREE.Mesh(geom2);

plane4.graphics.mesh.material = island_mat 

const plane5 = ents.createEntity();
plane5.addComponent(Graphics);
plane5.addComponent(Position);
plane5.graphics.mesh = new THREE.Mesh(geom);
plane5.graphics.mesh.material = water_mat 

plane5.graphics.mesh.material.side=THREE.DoubleSide
plane5.graphics.mesh.rotation.x -= 90 * Math.PI/180;
app.on('tick', dt => {
	kd.tick()
	time += dt / 1000
	deform_mat.uniforms.iGlobalTime.value = time
	water_mat.uniforms.iGlobalTime.value = time
	composer.render(scene, camera)
    	renderer.render(scene, camera,bufferTexture)
    	passthroughEffect.uniforms.iGlobalTime.value = time;

	
	
	vorHeightVariable.material.uniforms.gridPos.value.x = seed.value; 
	vorHeightVariable.material.uniforms.gridPos.value.y = seed.value; 
	fbmHeightVariable.material.uniforms.gridPos.value.x = seed.value; 
	fbmHeightVariable.material.uniforms.gridPos.value.y = seed.value; 
    
    	gpuCompute.compute();
	var stage1 = gpuCompute.getCurrentRenderTarget( vorHeightVariable ).texture
	var stage2 = gpuCompute.getCurrentRenderTarget( fbmHeightVariable ).texture
	var stage3 = gpuCompute.getCurrentRenderTarget( islandHeightVariable ).texture
	var mixed = gpuCompute.getCurrentRenderTarget( mixVariable ).texture
	vor_mat.uniforms.tDiffuse.value = stage1
	fbm_mat.uniforms.tDiffuse.value = stage2
	island_mat.uniforms.tDiffuse.value = mixed
	deform_mat.uniforms.tDiffuse.value = mixed



	world.step(fixedTimeStep, dt, maxSubSteps);

    //run system inits 
	 ents.queryComponents([Graphics]).forEach(function(each){

		
		if (!each.graphics.inScene){
			initGraphics(scene,each)
		}
    })
	 ents.queryComponents([Physics]).forEach(function(each){
		if (!each.physics.body){
			initPhysics(world,each)
		}
    })
    //run systems

	//update position from physics
	 ents.queryComponents([Physics,Position]).forEach(function(each){
		each.position.copy(each.physics.body.position) 
    })
	//update quaternion from physics
	 ents.queryComponents([Physics,Quaternion]).forEach(function(each){
		each.quaternion.copy(each.physics.body.quaternion) 
    })
	

	//update mesh from position
	 ents.queryComponents([Graphics,Position]).forEach(function(each){
		each.graphics.mesh.position.copy(each.position) 

    })
	//update mesh from quaternion
	 ents.queryComponents([Graphics,Quaternion]).forEach(function(each){
		each.graphics.mesh.quaternion.copy(each.quaternion);

    })

	 ents.queryComponents([Position,StickToTarget]).forEach(function(each){
		stickToTargetSystem(each)
    })

    camera.position.copy(player.position);
    camera.quaternion.copy(player.quaternion);
	 ents.queryComponents([Position,Billboard]).forEach(function(each){
		billboardSystem(each,camera)
})
})
    
    
app.on('resize', resize)

app.start()
resize()

function resize() {
	let [ width, height ] = app.shape
    camera.aspect = width / height
    renderer.setSize(width, height, false)
    
    camera.updateProjectionMatrix()
}


//keyboard input

kd.W.down(function () {
	ents.queryComponents([WASD]).forEach(function(each){
		each.physics.body.applyLocalImpulse(
		    new CANNON.Vec3(0, 0, -1 ),
		    new CANNON.Vec3( 0, 0, 0 )
		);
	})
});

kd.S.down(function () {
	ents.queryComponents([WASD]).forEach(function(each){
		each.physics.body.applyLocalImpulse(
		new CANNON.Vec3(0, 0, 1 ),
		new CANNON.Vec3( 0, 0, 0 )
			);
	})
});

kd.A.down(function () {
	ents.queryComponents([WASD]).forEach(function(each){
		each.physics.body.angularVelocity =new CANNON.Vec3(0,0.05,0); 
	})
});

kd.D.down(function () {
	ents.queryComponents([WASD]).forEach(function(each){
		each.physics.body.angularVelocity =new CANNON.Vec3(0,-0.05,0); 
	})
});


