var container;
var camera, scene, renderer, cameraOrtho, sceneOrtho;
var spotlight = new THREE.PointLight(0xffffff);
var sprite;
var loader = new THREE.TextureLoader();

var N = 350;
var targetList = [];
var objectList = [];
var radius;
var circle;
var cylinder;
var terrain, mas, geometry;
var brushdirection=0;
var clock = new THREE.Clock();
var mouse = { x: 0, y: 0 };

var xwind = 0;
var g = new THREE.Vector3(0, -9.8 , 0);
var wind = new THREE.Vector3(0.0, 0.0, 0.0);
var particles = [];
var MAX_PARTICLES = 250;
var partVis = false;

var gui = new dat.GUI();
gui.width = 200;

var brVis = false; 
var models = new Map();
var selected = null;

var lmb = false; 
var sprt = null;

var sprtBtn = [];

init();
animate();

function init() 
{
    container = document.getElementById( 'container' );
    scene = new THREE.Scene();
    var width = window.innerWidth;
    var height = window.innerHeight;

    sceneOrtho = new THREE.Scene();

    cameraOrtho = new THREE.OrthographicCamera( - width / 2, width / 2, height / 2, -height / 2, 1, 10 );
    cameraOrtho.position.z = 10;

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 40000 );
    camera.position.set(N/2, N/2, N+N/2);
    camera.lookAt(new THREE.Vector3(N/2, 0, N/2));                            
    
    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth-30, window.innerHeight-30 );
    renderer.setClearColor( 0x888888, 1 );

    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );
    
    renderer.autoClear = false;

    renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
    renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
    renderer.domElement.addEventListener( 'wheel', onDocumentMouseScroll, false );
    renderer.domElement.addEventListener("contextmenu",function (event){event.preventDefault();});

    spotlight.position.set(N, N*2, N/2);
    scene.add( spotlight );    
    
    Ter();
    addBrush();
    
    GUI();

    loadModel('models/house/', 'Cyprys_House.obj', 'Cyprys_House.mtl', 2, 'house');
    loadModel('models/palm/', 'Palma 001.obj', 'Palma 001.mtl', 0.6, 'palm');
    loadModel('models/grade/', 'grade.obj', 'grade.mtl', 3, 'grade');

    sprtBtn.push( addButtons('house') );
    sprtBtn.push( addButtons('grade') );
    sprtBtn.push( addButtons('palm') );
}

function onWindowResize() 
{
    var width = window.innerWidth;
    var height = window.innerHeight;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    cameraOrtho.left = -width / 2;
    cameraOrtho.right = width / 2;
    cameraOrtho.top = height / 2;
    cameraOrtho.bottom = -height / 2;
    cameraOrtho.updateProjectionMatrix();

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
    var mpos = {};

    mpos.x = event.clientX - (window.innerWidth / 2);
    mpos.y = (window.innerHeight / 2) - event.clientY;

    if (sprtBtn[0] != null)
        {
            hitButton(mpos, sprtBtn[0]);
        }

    if (sprtBtn[1] != null)
    {
        hitButton(mpos, sprtBtn[1]);
    }

    if (sprtBtn[2] != null)
    {
        hitButton(mpos, sprtBtn[2]);
    }

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
    vector.unproject(camera);
    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
    var intersects = ray.intersectObjects( targetList );

    if (brVis == true) 
    {
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
                        var y =  mas.vertices[x + z * N].y;
                        circle.geometry.vertices[i].y = y + 0.1;
                    }
                    else
                        circle.geometry.vertices[i].y = 0;
                }
                
                circle.geometry.verticesNeedUpdate = true;
            }
        }
    }
    else
    {
        if ( intersects.length > 0 && lmb == true)
        {
            var lastPos = new THREE.Vector3();
            if(selected != null)
            {
                lastPos = selected.position;
                selected.position.copy(intersects[ 0 ].point);

                selected.userData.box.setFromObject(selected);
                var pos = new THREE.Vector3();
                selected.userData.box.getCenter(pos); 
                selected.userData.obb.position.copy(pos);
                selected.userData.cube.position.copy(pos);

                for (var i=0; i < objectList.length; i++)
                {
                    if (selected.userData.cube != objectList[i] ){
                        objectList[i].userData.cube.material.visible = false;

                        if (intersect(selected.userData, objectList[i].userData) === true)
                        {
                            objectList[i].userData.cube.material.visible = true;
                        }
                    }
                }
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
    else
    {
        lmb = true
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
        vector.unproject(camera);
        var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
        var intersects = ray.intersectObjects( objectList, true );    
        
        if ( intersects.length > 0 )
        {   
            if (selected != null){
                            
                selected.userData.cube.material.visible = false;
                selected = intersects[0].object.parent;            
                selected.userData.cube.material.visible = true;
            }
            else
            {
                selected = intersects[0].object.parent;            
                selected.userData.cube.material.visible = true;
            }
        }
        else
            if (selected != null)
            {
                selected.userData.cube.material.visible = false;
                selected = null;
            }
    }
}

function onDocumentMouseUp( event ) 
{
    if (brVis == true) 
        brushdirection=0;
    else 
    {
        lmb = false;
        var mpos = {};

        mpos.x = event.clientX - (window.innerWidth / 2);
        mpos.y = (window.innerHeight / 2) - event.clientY;

        if (sprtBtn[0] != null)
        {
            hitButton(mpos, sprtBtn[0]);
            clickButton(mpos, sprtBtn[0]);
        }

        if (sprtBtn[1] != null)
        {
            hitButton(mpos, sprtBtn[1]);
            clickButton(mpos, sprtBtn[1]);
        }

        if (sprtBtn[2] != null)
        {
            hitButton(mpos, sprtBtn[2]);
            clickButton(mpos, sprtBtn[2]);
        }
    }
}

function addBrush()
{
    radius = 1;
    
    var material = new THREE.LineBasicMaterial( { 
        color: 0xffff00
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

function loadModel(path, oname, mname, s, name)
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
                    child.parent = object;
                }
            } );
            
            object.parent = object;
            var x = Math.random()*N;
            var z = Math.random()*N;
            var y = mas.vertices[Math.round(x) + Math.round(z)*N].y;

            object.position.x = x;
            object.position.y = y;
            object.position.z = z;                

            object.scale.set(s, s, s);
            models.set(name, object);
            //models.push( object );
            
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
    
    for (var i = 0; i < objectList.length; i++)
    {
        objectList[i].position.y = mas.vertices[Math.round(objectList[i].position.x) + Math.round(objectList[i].position.z)*N].y + 0.5;
    }

    emitter(delta);
    requestAnimationFrame( animate );
    render();
}

function render() 
{
    renderer.clear();
    renderer.render( scene, camera );
    renderer.clearDepth();
    renderer.render( sceneOrtho, cameraOrtho);
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
        rotate: 0,
        wind: 0,
        brush: false,
        rain: false,
        addHouse: function() { addMesh('house') },
        addPalm: function() { addMesh('palm') },
        addGrade: function() { addMesh('grade') }
    };
    
    
    var meshSY = gui.add( params, 'rotate' ).min(1).max(1000).step(1).listen();
    meshSY.onChange(function(value) {
        if (selected != null)
        {
            selected.userData.cube.rotation.set(0, value * 0.01, 0);
            selected.rotation.set(0, value * 0.01, 0);
        }
    });

    var meshWIND = gui.add( params, 'wind' ).min(-100).max(100).step(1).listen();
    meshWIND.onChange(function(value) {
        xwind = value;
        wind.set(xwind, 0, 0);
    });


    var brushVisible = gui.add( params, 'brush' ).name('brush').listen();    
    brushVisible.onChange(function(value)
    {
        brVis = value;
        circle.visible = value;
        cylinder.visible = value;
    });

    var particlesVisible = gui.add( params, 'rain' ).name('rain').listen();
    particlesVisible.onChange(function(value)
    {
        partVis = value;
    });

    gui.add( params, 'addHouse' ).name( "add house" );
    gui.add( params, 'addPalm' ).name( "add palm" );
    gui.add( params, 'addGrade' ).name( "add grade" );
    gui.open();
}

function addMesh(name)
{
    if (brVis == false){
        console.log(models.get(name))

        var model = models.get(name).clone();

        var box = new THREE.Box3();
        box.setFromObject(model);
        model.userData.box = box; 

        var geometry = new THREE.BoxGeometry( 1, 1, 1 );
        var material = new THREE.MeshBasicMaterial( {color: 0xffff00, wireframe: true} );
        var cube = new THREE.Mesh( geometry, material );
        scene.add( cube );
        
        cube.material.visible = false; 

        var pos = new THREE.Vector3();
        box.getCenter(pos);
        //получение размеров объекта
        var size = new THREE.Vector3();
        box.getSize(size);

        

        //установка позиции и размера объекта в куб
        cube.position.copy(pos);
        cube.scale.set(size.x, size.y, size.z);

        model.userData.cube = cube;
        cube.userData.model = model;

        var obb = {};
        //структура состоит из матрицы поворота, позиции и половины размера
        obb.basis = new THREE.Matrix4();
        obb.halfSize = new THREE.Vector3();
        obb.position = new THREE.Vector3();
        //получение позиции центра объекта
        box.getCenter(obb.position);
        //получение размеров объекта
        box.getSize(obb.halfSize).multiplyScalar(0.5);
        //получение матрицы поворота объекта
        obb.basis.extractRotation(model.matrixWorld);

        model.userData.obb = obb;
        model.position.y = mas.vertices[Math.round(model.position.x) + Math.round(model.position.z)*N].y + 0.5;
        objectList.push( model );
        scene.add(model);
    }
}

function intersect(ob1, ob2)
{
    var xAxisA = new THREE.Vector3();
    var yAxisA = new THREE.Vector3();
    var zAxisA = new THREE.Vector3();
    var xAxisB = new THREE.Vector3();
    var yAxisB = new THREE.Vector3();
    var zAxisB = new THREE.Vector3();
    var translation = new THREE.Vector3();
    var vector = new THREE.Vector3();

    var axisA = [];
    var axisB = [];
    var rotationMatrix = [ [], [], [] ];
    var rotationMatrixAbs = [ [], [], [] ];
    var _EPSILON = 1e-3;

    var halfSizeA, halfSizeB;
    var t, i;

    ob1.obb.basis.extractBasis( xAxisA, yAxisA, zAxisA );
    ob2.obb.basis.extractBasis( xAxisB, yAxisB, zAxisB );

    // push basis vectors into arrays, so you can access them via indices
    axisA.push( xAxisA, yAxisA, zAxisA );
    axisB.push( xAxisB, yAxisB, zAxisB );
    // get displacement vector
    vector.subVectors( ob2.obb.position, ob1.obb.position );
    // express the translation vector in the coordinate frame of the current
    // OBB (this)
    for ( i = 0; i < 3; i++ )
    {
        translation.setComponent( i, vector.dot( axisA[ i ] ) );
    }
    // generate a rotation matrix that transforms from world space to the
    // OBB's coordinate space
    for ( i = 0; i < 3; i++ )
    {
        for ( var j = 0; j < 3; j++ )
            {
                rotationMatrix[ i ][ j ] = axisA[ i ].dot( axisB[ j ] );
                rotationMatrixAbs[ i ][ j ] = Math.abs( rotationMatrix[ i ][ j ] ) + _EPSILON;
            }
    }
    // test the three major axes of this OBB
    for ( i = 0; i < 3; i++ )
    {
        vector.set( rotationMatrixAbs[ i ][ 0 ], rotationMatrixAbs[ i ][ 1 ], rotationMatrixAbs[ i ][ 2 ]
        );
        halfSizeA = ob1.obb.halfSize.getComponent( i );
        halfSizeB = ob2.obb.halfSize.dot( vector );
        

        if ( Math.abs( translation.getComponent( i ) ) > halfSizeA + halfSizeB )
        {
            return false;
        }
    }
    // test the three major axes of other OBB
    for ( i = 0; i < 3; i++ )
    {
        vector.set( rotationMatrixAbs[ 0 ][ i ], rotationMatrixAbs[ 1 ][ i ], rotationMatrixAbs[ 2 ][ i ] );
        halfSizeA = ob1.obb.halfSize.dot( vector );
        halfSizeB = ob2.obb.halfSize.getComponent( i );
        vector.set( rotationMatrix[ 0 ][ i ], rotationMatrix[ 1 ][ i ], rotationMatrix[ 2 ][ i ] );
        t = translation.dot( vector );
        
        if ( Math.abs( t ) > halfSizeA + halfSizeB )
        {
            return false;
        }
    }
    // test the 9 different cross-axes
    // A.x <cross> B.x
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 0 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 0 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 1 ];
    t = translation.z * rotationMatrix[ 1 ][ 0 ] - translation.y * rotationMatrix[ 2 ][ 0 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    // A.x < cross> B.y
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 1 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 0 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 0 ];
    t = translation.z * rotationMatrix[ 1 ][ 1 ] - translation.y * rotationMatrix[ 2 ][ 1 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }

    // A.x <cross> B.z
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 2 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 0 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 0 ];
    t = translation.z * rotationMatrix[ 1 ][ 2 ] - translation.y * rotationMatrix[ 2 ][ 2 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    // A.y <cross> B.x
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 0 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 1 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 1 ];
    t = translation.x * rotationMatrix[ 2 ][ 0 ] - translation.z * rotationMatrix[ 0 ][ 0 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    // A.y <cross> B.y
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 1 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 0 ];
    t = translation.x * rotationMatrix[ 2 ][ 1 ] - translation.z * rotationMatrix[ 0 ][ 1 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    // A.y <cross> B.z
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 2 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 1 ][ 0 ];
    t = translation.x * rotationMatrix[ 2 ][ 2 ] - translation.z * rotationMatrix[ 0 ][ 2 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }

    // A.z <cross> B.x
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 0 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 2 ][ 1 ];
    t = translation.y * rotationMatrix[ 0 ][ 0 ] - translation.x * rotationMatrix[ 1 ][ 0 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    // A.z <cross> B.y
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 1 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 2 ][ 0 ];
    t = translation.y * rotationMatrix[ 0 ][ 1 ] - translation.x * rotationMatrix[ 1 ][ 1 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    // A.z <cross> B.z
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 2 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 2 ][ 0 ];
    t = translation.y * rotationMatrix[ 0 ][ 2 ] - translation.x * rotationMatrix[ 1 ][ 2 ];
    
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    // no separating axis exists, so the two OBB don't intersect
    return true;
}

function addSprite(name1, name2, Click)
{
    var type;

    if (name1 == 'pics/house.jpg')
        type = 'house';

    if (name1 == 'pics/grade.png')
        type = 'grade'

    if (name1 == 'pics/palm.png')
        type = 'palm'

    //загрузка текстуры спрайта
    var texture1 = loader.load(name1);
    var material1 = new THREE.SpriteMaterial( { map: texture1 } );

    var texture2 = loader.load(name2);
    var material2 = new THREE.SpriteMaterial( { map: texture2 } );


    //создание спрайта
    sprite = new THREE.Sprite( material1);

    //центр и размер спрайта
    sprite.center.set( 0.0, 1.0 );
    sprite.scale.set( 128, 100, 1 );

    //позиция спрайта (центр экрана)
    sprite.position.set( 0, 0, 1 );
    sceneOrtho.add(sprite);    
    updateHUDSprite(sprite);

    var SSprite = {};
    SSprite.sprite = sprite;
    SSprite.mat1 = material1;
    SSprite.mat2 = material2;
    SSprite.click = Click;
    SSprite.type = type;

    if (type == "grade")
        sprite.position.set(0, window.innerHeight / 2, 1);

    if (type == "house")
        sprite.position.set(-window.innerWidth / 2, window.innerHeight / 2, 1);

    if (type == "palm")
        sprite.position.set(-window.innerWidth / 4, window.innerHeight / 2, 1);

    return SSprite;
}

function updateHUDSprite(sprite)
{
    var width = window.innerWidth / 2;
    var height = window.innerHeight / 2;

    sprite.position.set( -width, height, 1 );
}

function addButtons( name )
{
    if (name == 'house')
        sprt = addSprite('pics/house.jpg', 'pics/house1.jpg', houseClick); 
    
    if (name == 'grade')
        sprt = addSprite('pics/grade.png', 'pics/grade1.png', gradeClick); 

    if (name == 'palm')
        sprt = addSprite('pics/palm.png', 'pics/palm1.png', palmClick); 

    return sprt;
}

function hitButton(mPos, sprite)
{
    var pw = sprite.sprite.position.x;
    var ph = sprite.sprite.position.y;
    var sw = pw + sprite.sprite.scale.x;
    var sh = ph - sprite.sprite.scale.y;

    if (mPos.x > pw && mPos.x < sw){
        if (mPos.y < ph && mPos.y > sh)
        {
            sprite.sprite.material = sprite.mat2;
        }
        else
            sprite.sprite.material = sprite.mat1;
    }
    else
        sprite.sprite.material = sprite.mat1;
}

function clickButton(mPos, sprite)
{
    var pw = sprite.sprite.position.x;
    var ph = sprite.sprite.position.y;
    var sw = pw + sprite.sprite.scale.x;
    var sh = ph - sprite.sprite.scale.y;

    if (mPos.x > pw && mPos.x < sw){
        if (mPos.y < ph && mPos.y > sh)
        {
            sprite.click();
        }
    }
}

function houseClick()
{
    addMesh('house');
}

function gradeClick()
{
    addMesh('grade');
}

function palmClick()
{
    addMesh('palm');
}

function addDrop(pos)
{
    var texture = loader.load('pics/drop.png');
    var material = new THREE.SpriteMaterial( {map: texture} );

    sprite = new THREE.Sprite( material );
    sprite.center.set(0.5, 0.5);
    sprite.scale.set(1, 3, 1);

    sprite.position.copy( pos );

    scene.add( sprite );

    var SSprite = {};
    SSprite.sprite = sprite;
    SSprite.v = new THREE.Vector3(0, 0, 0);

    particles.push( SSprite );

    return SSprite;
}

function emitter(delta)
{
    if (particles.length < MAX_PARTICLES)
    {
        var x = Math.random()*N;
        var z = Math.random()*N;

        var pos = new THREE.Vector4(x, 150, z);
        addDrop(pos);
    }

    for (var i = 0; i < particles.length; i++)
    {
        particles[i].v = particles[i].v.add(g); 
        particles[i].sprite.position = particles[i].sprite.position.add(particles[i].v.multiplyScalar(delta * 10));
    }

    for (var i = 0; i < particles.length; i++)
    {
                
        if (particles[i].sprite.position.y < -5)
        {
            particles[i].sprite.position.y = 250;
            particles[i].sprite.position.x = Math.random()*N;
        }
    }            

    for (var i = 0; i < particles.length; i++)
    {
        if (partVis == true)
            particles[i].sprite.visible = true;
        else
            particles[i].sprite.visible = false;

        var v = new THREE.Vector3(0, 0, 0);
        var w = new THREE.Vector3(0, 0, 0);
        
        w.copy(wind);
        w.multiplyScalar(delta);
        
        v.copy(particles[i].v);
        v.add(w);
        
        particles[i].sprite.position.add(v);
    }

    
}

