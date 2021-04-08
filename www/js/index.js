document.addEventListener('deviceready', onDeviceReady, false);
document.getElementById('btn-picture').addEventListener('click', takePicture);
document.getElementById('btn-load-picture').addEventListener('click', loadPicture);
document.getElementById('chk-sincImage').addEventListener('click', startInterval);


document.addEventListener('offline', offline, false);
document.addEventListener('online', online, false);
var fromCamera = false;


const database = firebase.database().ref();
var img = [];
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
    fromCamera = false;
    navigator.camera.getPicture(onSuccess, onFail,
    {
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        popoverOptions: new CameraPopoverOptions(300, 300, 100, 100, Camera.PopoverArrowDirection.ARROW_ANY, 600, 300)
    });
}

function takePicture(){
    fromCamera = true;
    navigator.camera.getPicture(onSuccess, onFail, { quality: 50,
        destinationType: Camera.DestinationType.FILE_URI });
}


function onSuccess(imageURI) {
    id=id + 1;
    let imagen = document.createElement('img');   
    imagen.id = 'img'+id;
    imagen.src = imageURI;
    imagen.className = `newImage myImage ${fromCamera ? 'newImage' : 'from-file'}`;
    imagen.width = 221;
    imagen.height = 172;
    document.getElementById('imagenes').appendChild(imagen);
    img.push(imagen);
}

function onFail(message) {    
    alert(`Error al obtener la ${fromCamera ? 'foto'  : 'imágen'}: ${message}`);
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
    states[Connection.NONE]     = 'Estás desconectado';
    
    if(navigator.connection.type !== states[Connection.NONE] && img.length > 0){
        img.forEach(i => uploadPicture(i));
    }
    document.getElementById('lbl-info').innerText = 'Tu conección es: ' + states[networkState];
}


function offline(){
    document.getElementById('lbl-info').innerText = 'Estás desconectado';
}

function online(){ 
    document.getElementById('lbl-info').innerText = 'Estás online';
}


async function uploadPicture(imagen){
    var canvas = document.createElement("canvas");
    canvas.width = 140;
    canvas.height = 180;

    // Copy the image contents to the canvas
    ctx = canvas.getContext("2d");
    ctx.rotate(-90 * Math.PI / 180); 
    ctx.drawImage(imagen, -180, 0, 180, 140);

    var image = new Image();
    image.id = "pic";
    image.src = canvas.toDataURL();

    let fecha = new Date();    
    nombre =   `${(fecha.getDate() < 10 ? '0' : '') + fecha.getDate()}-${(fecha.getMonth() + 1 < 10 ? '0' : '') + (fecha.getMonth() + 1)}-${(fecha.getFullYear() < 10 ? '0' : '') + fecha.getFullYear()} ${(fecha.getHours() < 10 ? '0' : '') + fecha.getHours()}:${(fecha.getMinutes() < 10 ? '0' : '') + fecha.getMinutes()}:${(fecha.getSeconds() < 10 ? '0' : '') + fecha.getSeconds()}`;

    storage.child('ninjagram-backup/'+nombre).putString(image.src, 'data_url').then(function(snapshot) {
        console.log('La imágen ha sido subida.');
        console.log('imágenes nuevas: ',img.length)
        img = img.filter(i => i !== imagen);
        console.log('imágenes nuevas: ',img.length)
    });
}

//Obteniendo todas las imágenes almacebadas en firebase 
async function cargarImagenes(){
    storage.child('ninjagram-backup').listAll().then(snap => {
        snap.items.forEach(itemRef => {
          itemRef.getDownloadURL().then(imgUrl => {
            cargarImagen(imgUrl)
          });
        })
      })
}


//Creando control img con la imágen y cargandolo al DOM
function cargarImagen(urlImage){
    const img = document.createElement('img');
    img.src = urlImage;
    img.width = 172;
    img.height = 221;
    img.className = 'myImage';

    document.getElementById('imagenes').appendChild(img);
}


function startInterval(e){
    if(e.target.checked){   //Activa la sincronización de imágenes con el servidor
        interval = setInterval(networkInfo, 3000);
        msg = 'Finalizar sincronización de imágenes';
    }else{  //Desactiva la sincronización de imágenes con el servidor
        clearInterval(interval);
        msg = 'Sincronizar imágenes con el servidor'
    }
    document.getElementById('lbl-checkbox').innerText = msg;
}

