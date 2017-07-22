export default billboardSystem

function billboardSystem(thing,camera){
	thing.quaternion.copy( camera.quaternion );

}
