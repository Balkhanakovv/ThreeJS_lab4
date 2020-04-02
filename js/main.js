var container;
var camera, scene, renderer;

var N = 350;
var targetList = [];
var radius;
var circle;
var cylinder;
var terrain, mas;
var brushdirection=0;
var clock = new THREE.Clock();
var mouse = { x: 0, y: 0 };

init();
animate();

function init() 
{
    container = document.getElementById( 'container' );
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 40000 );
    camera.position.set(N/2, N/2, N+N/2);
    camera.lookAt(new THREE.Vector3(N/2, 0, N/2));                            
    
    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth-30, window.innerHeight-30 );
    renderer.setClearColor( 0x888888, 1 );

    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );
    
    renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
    renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
    renderer.domElement.addEventListener( 'wheel', onDocumentMouseScroll, false );
    renderer.domElement.addEventListener("contextmenu",
                                            function (event)
                                            {
                                                event.preventDefault();
                                            });

    var spotlight = new THREE.PointLight(0xffff00);
    spotlight.position.set(255, 200, 128);
    scene.add(spotlight);
    Ter();
    addBrush();
}

function onWindowResize() 
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseScroll( event )
{
    if (radius > 1)
        if (event.wheelDelta > 0)
        {
            radius-=5;
        }

    if (radius < 50)
        if (event.wheelDelta < 0)
        {
            radius += 5;
        }    

    circle.scale.set(radius, 1, radius);
}

function onDocumentMouseMove( event )
{
    //Позиция курсора мыши
    
    //Получение координат курсора мыши и приведение их к 3х мерным
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    //Построение луча через позиции камеры и курсора мыши
    var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
    vector.unproject(camera);
    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
    //Поис пересечения луча с объектами в списке (в данном случае только с плоскостью)
    var intersects = ray.intersectObjects( targetList );
    //Если пересечение было найдено, перемещение "кисти" к точке пересечения
    if ( intersects.length > 0 )
    {
        //console.log(intersects[ 0 ]);
        
        if (cylinder != null)
        {
            cylinder.position.copy(intersects[ 0 ].point);
            cylinder.position.y += 2.5;
        }

        if (circle != null)
        {
            circle.position.copy(intersects[ 0 ].point);
            circle.position.y = 0;

            for (var i = 0; i < circle.geometry.vertices.length; i++)
            {
                //получение позиции в локальной системе координат
                var pos = new THREE.Vector3();
                pos.copy(circle.geometry.vertices[i]);
                //нахождение позиции в глобальной системе координат
                pos.applyMatrix4(circle.matrixWorld);
        
                var x = Math.round(pos.x);
                var z = Math.round(pos.z);
        
                if(x>=0 && x<N && z>=0 && z<N)
                {
                    var y =  mas.vertices[z + x * N].y;
                    circle.geometry.vertices[i].y = y + 0.01;
                }
                else
                    circle.geometry.vertices[i].y = 0;
            }
            
            circle.geometry.verticesNeedUpdate = true;
        }
    }
}

function onDocumentMouseDown( event ) 
{
    if (event.which == 1)
        brushdirection=1;

    if (event.which == 3)
        brushdirection=-1;
}

function onDocumentMouseUp( event ) 
{
    brushdirection=0;
}

function addBrush()
{
    radius = 1;
    
    var material = new THREE.LineBasicMaterial( { 
        color: 0xffff00,
        //wireframe: true
    } );

    var segments = 164;

    var circleGeometry = new THREE.CircleGeometry( radius, segments );				
    
    for (var i = 0; i < circleGeometry.vertices.length; i++)
    {
        circleGeometry.vertices[i].z = circleGeometry.vertices[i].y;
        circleGeometry.vertices[i].y = 0;
    }
    circleGeometry.vertices.shift();
    
    circle = new THREE.Line( circleGeometry, material );
    
    scene.add( circle );   
    //====================================================================
    var geometry = new THREE.CylinderGeometry( 1.5, 0, 5, 64 );
    var cyMaterial = new THREE.MeshLambertMaterial( {color: 0x888888} );
    cylinder = new THREE.Mesh( geometry, cyMaterial );
    scene.add( cylinder );


}

function Ter()
{   
    mas = new THREE.Geometry();

    for (var j = 0; j < N; j++)
        for (var i = 0; i < N; i++)
        {
            mas.vertices.push(new THREE.Vector3(i, 0, j));
        }

    for (var i = 0; i < N - 1; i++)
        for (var j = 0; j < N - 1; j++)
        {
            mas.faces.push(new THREE.Face3((i * N) + j, (i * N) + (j + 1), (i + 1) * N + j));
            mas.faces.push(new THREE.Face3((i * N) + (j + 1), (i + 1) * N + (j + 1), (i + 1) * N + j));
                
                mas.faceVertexUvs[0].push([new THREE.Vector2(j/N, i/N),
                            new THREE.Vector2((j+1)/N, (i)/N),
                            new THREE.Vector2((j)/N, (i+1)/N)]);
                mas.faceVertexUvs[0].push([new THREE.Vector2((j+1)/N, (i)/N),
                            new THREE.Vector2((j+1)/N, (i+1)/N),
                            new THREE.Vector2((j)/N, (i+1)/N)]);
        }
    
    mas.computeFaceNormals();
    mas.computeVertexNormals();  

    var tex = new THREE.ImageUtils.loadTexture('pics/grasstile.jpg');
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; 
    tex.repeat.set( 2, 2 );
    
    
    var terrainMaterial = new THREE.MeshLambertMaterial({
        map:tex,
       //color:'gray',
       //wireframe: true,
       side:THREE.DoubleSide
    });

    terrain = new THREE.Mesh(mas, terrainMaterial);
    terrain.position.set(0.0, 0.0, 0.0);
    
    targetList.push(terrain);
    
    scene.add(terrain);
}


function animate() 
{
    var delta = clock.getDelta();
    if (brushdirection != 0)
    {
        sculpt(brushdirection, delta);
    }

    requestAnimationFrame( animate );
    render();
}

function render() 
{
    renderer.render( scene, camera );
}

function sculpt(dir, delta)
{
    for ( i = 0; i < mas.vertices.length; i++)
    {
        var x2 = mas.vertices[i].x;
        var z2 = mas.vertices[i].z;
        var r = radius;
        var x1 = cylinder.position.x;
        var z1 = cylinder.position.z;

        var h = r*r - ((x2-x1)*(x2-x1) + (z2-z1)*(z2-z1));

        if (h>0)
        {
            mas.vertices[i].y += Math.sqrt(h) * delta * dir;
        }
    }

    mas.computeFaceNormals();
    mas.computeVertexNormals(); //пересчёт нормалей
    mas.verticesNeedUpdate = true; //обновление вершин
    mas.normalsNeedUpdate = true;

}
