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

var gui = new dat.GUI();
gui.width = 200;

var brVis = false; 
var models = [];

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
    


    GUI();

    loadModel('models/palm/', 'Palma 001.obj', 'Palma 001.mtl', 0.2);
    loadModel('models/house/', 'Cyprys_House.obj', 'Cyprys_House.mtl', 0.2);
    loadModel('models/grade/', 'grade.obj', 'grade.mtl', 0.2);
}

function onWindowResize() 
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseScroll( event )
{
    if (brVis == true)
    {
        if (radius > 1)
            if (event.wheelDelta > 0)
                radius-=5;

        if (radius < 50)
            if (event.wheelDelta < 0)
                radius += 5;    

        circle.scale.set(radius, 1, radius); 
    }       
}

function onDocumentMouseMove( event )
{
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
    vector.unproject(camera);
    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

    if (brVis == true) 
    {
        var intersects = ray.intersectObjects( targetList );
        if ( intersects.length > 0 )
        {            
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
                    var pos = new THREE.Vector3();
                    pos.copy(circle.geometry.vertices[i]);
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
}

function onDocumentMouseDown( event ) 
{   
    if (brVis == true){
        if (event.which == 1)
            brushdirection=1;

        if (event.which == 3)
            brushdirection=-1;
    }
}

function onDocumentMouseUp( event ) 
{
    if (brVis == true) brushdirection=0;
}

function addBrush()
{
    radius = 1;
    
    var material = new THREE.LineBasicMaterial( { 
        color: 0xffff00
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
    circle.visible = false;

    scene.add( circle );
    var geometry = new THREE.CylinderGeometry( 1.5, 0, 5, 64 );
    var cyMaterial = new THREE.MeshLambertMaterial( {color: 0x888888} );
    cylinder = new THREE.Mesh( geometry, cyMaterial );

    cylinder.visible = false;
    scene.add( cylinder );


}

function loadModel(path, oname, mname, s)
{
    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };

    var onError = function ( xhr ) { console.log(xhr); };

    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath( path );

    mtlLoader.load ( mname, function( materials )
    {
        materials.preload();
        
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials ( materials );
        objLoader.setPath( path );

        objLoader.load ( oname, function ( object )
        {
            
            object.castShadow = true;
            object.traverse( function ( child )
            {
                if ( child instanceof THREE.Mesh )
                {
                    child.castShadow = true;
                }
            } );
            
            var x = Math.random()*N;
            var z = Math.random()*N;
            var y = geometry.vertices[Math.round(x) + Math.round(z)*N].y;

            object.position.x = x;
            object.position.y = y;
            object.position.z = z;                

            object.scale.set(s, s, s);
            models.push( object  );
            
        }, onProgress, onError ); 
    });
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

function GUI()
{
    var params =
    {
        sx: 0, sy: 0, sz: 0,
        brush: false,
        addHouse: function() { addMesh(1) },
        addPalm: function() { addMesh(0) },
        addGrade: function() { addMesh(2) }
        //del: function() { delMesh() }
    };
    //создание вкладки
    var folder1 = gui.addFolder('Scale');
    //ассоциирование переменных отвечающих за масштабирование
    //в окне интерфейса они будут представлены в виде слайдера
    //минимальное значение - 1, максимальное – 100, шаг – 1
    //listen означает, что изменение переменных будет отслеживаться
    var meshSX = folder1.add( params, 'sx' ).min(1).max(100).step(1).listen();
    var meshSY = folder1.add( params, 'sy' ).min(1).max(100).step(1).listen();
    5
    var meshSZ = folder1.add( params, 'sz' ).min(1).max(100).step(1).listen();
    //при запуске программы папка будет открыта
    folder1.open();
    //описание действий совершаемых при изменении ассоциированных значений
    
    //meshSX.onChange(function(value) {…});
    //meshSY.onChange(function(value) {…});
    //meshSZ.onChange(function(value) {…});
    
    //добавление чек бокса с именем brush
    var cubeVisible = gui.add( params, 'brush' ).name('brush').listen();    
    cubeVisible.onChange(function(value)
    {
        brVis = value;
        circle.visible = value;
        cylinder.visible = value;
    });
    //добавление кнопок, при нажатии которых будут вызываться функции addMesh
    //и delMesh соответственно. Функции описываются самостоятельно.
    gui.add( params, 'addHouse' ).name( "add house" );
    gui.add( params, 'addPalm' ).name( "add palm" );
    gui.add( params, 'addGrade' ).name( "add grade" );
    //gui.add( params, 'del' ).name( "delete" );
    
    //при запуске программы интерфейс будет раскрыт
    gui.open();
}

function addMesh(i)
{
    scene.add(models[i].clone());
}