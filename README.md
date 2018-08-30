# WAX ExpressTrade Tutorial

## 1. Crear el servidor

Creamos el servidor en DigitalOcean.com (https://m.do.co/c/563ae669c336)

Creamos un servidor Ubuntu 14.04.5 x64.

La contraseña del servidor la enviarán al correo asociado con la cuenta de DigitalOcean.

## 2. Abrimos el servidor en PUTTY

Descargamos PUTTY (https://the.earth.li/~sgtatham/putty/latest/w64/putty-64bit-0.70-installer.msi)

Lo abrimos y inicimos el servidor, ponemos nuestra contraseña y creamos una nueva.

```shell
apt-get update
```
Siguiente comando:


```shell
apt-get install apache2 mysql-server phpmyadmin php5
```
Creas una contraseña para la DB y continuas con la simple inatalación.

## 3. Abrir FileZilla (Explorador de archivos)

Abrimos FileZilla. Descarga: https://filezilla-project.org/

Entramos en el servidor:

* `Host` La iP del servidor 
* `User` root
* `Pass` La nueva contraseña que has cambiado en PUTTY
* `Port` 22

En la carpeta root creamos otra carpeta llamada `/contest` y dentro de esa carpeta un archivo que llamaremos **server.js**

## 4. Volvemos a PUTTY

Ponemos este codigo para instalar nodejs: `curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -`

Cuando acabe ingresamos este codigo: `sudo apt-get install -y nodejs`

## 5. Creamos las variablesque inician el servidor (luego añadiremos mas)

```javascript
var app = require('https').createServer();
var io = require('socket.io')(app);
var fs = require('fs');

app.listen (8080);
```

## 6. Creamos las *variables globales* y sus dictados.

```javascript
var users = {};

io.on('connection', function(socket) {
    socket.on('connected', function(tradeutl) {


        users.push(tradeurl);

        socket.emit('message', "You are now registered on the Website!")


    });
});
```

## 7. Carpeta WWW

Volvemos a FileZilla y nos dirijimos a la carpeta: **/var/www/html**

Dentro de la carpeta borramos el archivo **index.html** y creamos un nuevo archivo llamado **index.php**

## 8. Abrimos esa carpeta y creamos una base HTML

```php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Trade Contest</title>
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css">
</head>
<body>
    <h1> Trade Website - Tutorial
    <div class="settings">
        <imput type="text" id="your_tradeurl" placeholder="your trade url">
        <button type="button" id="registerBtn">Register</button>
    </div>
</body>
</html>
```
Ahora añadiremos los "scripts"

```php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Trade Contest</title>
</head>
<body>
    <h1> Trade Website - Tutorial
    <div class="settings">
        <imput type="text" id="your_tradeurl" placeholder="your trade url">
        <button type="button">Register</button>
    </div>
</body>
</html>

<script src="https://code.jquery.com/jquery-3.3.1.js" integrity: "sha384-oqVuAfHRKap7fdgcCY5iykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC" crossorigin= "@guiolmar"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>
```

Especificamos los parametros de errores:

```php
<script>
    var socket = null;

    if(socket == null) {
        socket = io('yourip(123.456.789.01):8080')

        socket.on('connect', function() {
            toastr.success('Nice connection!')

            user_functions();
        });
    }


    function user_function() {

        $('#registerBtn').click(function() {
            var $tradeurl = $('#your_tradeurl').val();

            if($tradeurl.includes('https://') && $tradeurl.includes('trade.opskins.com')) {

                socket.emit('connected', $tardeurl);

            } else toastr.error('TradeUrl No Valid!')


        });
```
        
        
