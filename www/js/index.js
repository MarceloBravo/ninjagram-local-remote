document.addEventListener('deviceready', onDeviceReady, false);
document.getElementById('btn-picture').addEventListener('click', takePicture);
document.getElementById('btn-load-picture').addEventListener('click', loadPicture);
document.getElementById('chk-sincImage').addEventListener('click', startInterval);


document.addEventListener('offline', offline, false);
document.addEventListener('online', online, false);
var origen = '';


const database = firebase.database().ref();
var imgPendientes = [];
var arrImgMostradas = [];
var storage = firebase.storage().ref();
var interval = null;
var id = 0;


function onDeviceReady() {
    // Cordova is now initialized. Have fun!
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    console.log(navigator.camera);
    cargarImagenes();
}

function loadPicture(){
    origen = 'archivo';
    navigator.camera.getPicture(onSuccess, onFail,
    {
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        popoverOptions: new CameraPopoverOptions(300, 300, 100, 100, Camera.PopoverArrowDirection.ARROW_ANY, 600, 300)
    });
}

function takePicture(){
    origen = 'camara';
    navigator.camera.getPicture(onSuccess, onFail, { quality: 50,
        destinationType: Camera.DestinationType.FILE_URI });
}


function onSuccess(imageURI) {
    let fecha = new Date();    
    nombre =   `${(fecha.getDate() < 10 ? '0' : '') + fecha.getDate()}-${(fecha.getMonth() + 1 < 10 ? '0' : '') + (fecha.getMonth() + 1)}-${(fecha.getFullYear() < 10 ? '0' : '') + fecha.getFullYear()} ${(fecha.getHours() < 10 ? '0' : '') + fecha.getHours()}:${(fecha.getMinutes() < 10 ? '0' : '') + fecha.getMinutes()}:${(fecha.getSeconds() < 10 ? '0' : '') + fecha.getSeconds()}`;
    agregarImagenAlDOM(imageURI, nombre);
}

function agregarImagenAlDOM(imageURI, nombre){
    //id = id + 1;
    //console.log(imageURI, nombre, imageURI.split('/'));
    
    let imagen = createImage(imageURI, nombre);
    let btnEliminar = createDeleteButton(nombre);

    let div = document.createElement('div');   
    div.id = 'div-'+nombre;
    div.src = imageURI;
    div.className = 'div-imagen ' + (origen !== 'firebase' ? (origen === 'camara' ? 'div-camera' : 'div-file') : 'div-firebase') ;
    div.width = 221;
    div.height = 172;
    div.appendChild(imagen);
    div.appendChild(btnEliminar);
    document.getElementById('imagenes').appendChild(div);

    arrImgMostradas.push[{imagen, nombre }]
}

function createImage(imageURI, nombre){    
    let imagen = document.createElement('img');
    imagen.id = 'img-' + nombre;
    imagen.src = imageURI;
    imagen.className = `newImage myImage ${origen === 'camara' ? 'from-camera' : 'from-file'}`;
    imagen.width = 221;
    imagen.height = 172;
    document.getElementById('imagenes').appendChild(imagen);
    
    if(origen === 'camara' || origen === 'archivo')imgPendientes.push(imagen);   //Se agrega al array de im??genes pendientes por subir al servidor de firebase
    return imagen;
}

function createDeleteButton(nombre){
    let btnDelete = document.createElement('img');
    btnDelete.id = 'btn-' + nombre;
    btnDelete.src = 'img/delete.png';
    btnDelete.className = 'img-delete';
    btnDelete.width = 50;
    btnDelete.height = 50;
    btnDelete.addEventListener('click', deleteImage);
    return btnDelete;
}

function onFail(message) {    
    alert(`Error al obtener la ${origen === 'camara' ? 'foto'  : 'im??gen'}: ${message}`);
}

function networkInfo(){
    var networkState = navigator.connection.type;
    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'Est??s desconectado';
    
    if(navigator.connection.type !== states[Connection.NONE] && imgPendientes.length > 0){
        imgPendientes.forEach(i => uploadPicture(i));
    }
    document.getElementById('lbl-info').innerText = 'Tu conecci??n es: ' + states[networkState];
}


function offline(){
    document.getElementById('lbl-info').innerText = 'Est??s desconectado';
}

function online(){ 
    document.getElementById('lbl-info').innerText = 'Activa la sincronizaci??n para ver tu conexi??n';
}


async function uploadPicture(imagen){
    var canvas = document.createElement("canvas");
    canvas.width = 140;
    canvas.height = 180;

    ctx = canvas.getContext("2d");
    ctx.rotate(-90 * Math.PI / 180); 
    ctx.drawImage(imagen, -180, 0, 180, 140);

    var image = new Image();
    image.id = "pic";
    image.src = canvas.toDataURL();

    let nombre = imagen.id.substr(4);
    
    await storage.child('ninjagram-backup/'+nombre).putString(image.src, 'data_url').then(function(snapshot) {
        imgPendientes = imgPendientes.filter(i => i.id !== 'img-' + nombre); //Quitando la im??gen reci??n subida del array de im??genes nuevas por subir
    });
}

//Obteniendo todas las im??genes almacebadas en firebase 
function cargarImagenes(){
    origen = 'firebase';
    storage.child('ninjagram-backup').listAll().then(snap => {
        snap.items.forEach(async (itemRef) => {
            imgUrl = await itemRef.getDownloadURL();
            agregarImagenAlDOM(imgUrl, itemRef.name);    //Agrega la im??gen al documento
        })
      })
}


function startInterval(e){
    if(e.target.checked){   //Activa la sincronizaci??n de im??genes con el servidor
        interval = setInterval(networkInfo, 3000);
        msg = 'Finalizar sincronizaci??n de im??genes';
    }else{  //Desactiva la sincronizaci??n de im??genes con el servidor
        clearInterval(interval);
        msg = 'Sincronizar im??genes con el servidor';
        online();
    }
    document.getElementById('lbl-checkbox').innerText = msg;
}

async function deleteImage(e){
    if(window.confirm('??Deseas eliminar la im??gen?')){
        let nombre = e.target.id.substr(4);
        let imagen = await storage.child('ninjagram-backup/'+nombre);
        try{
            url = await imagen.getDownloadURL();
            //Si la url no existe la aplicaci??n fallr?? y el error ser?? capturado por la instrucci??n catch
            imagen.delete().then(() => {
                eliminarImagenDelDOM(nombre);
            }).catch(error => {
                console.log(error)
            });            
        }catch(e){
            console.log(e);
            //No existe la url de descarga de la foto por lo cual la foto no exite en la base de datos 
            eliminarImagenDelDOM(nombre);
        }
    }
}

function eliminarImagenDelDOM(nombre){
    let parent = document.getElementById('div-'+nombre).parentNode;
    parent.removeChild(document.getElementById('div-'+nombre));
    imgPendientes = imgPendientes.filter(i => i.id !== 'img-' + nombre);    //Quitando la im??gen reci??n eliminada del array de im??genes nuevas pendientes por subir
}