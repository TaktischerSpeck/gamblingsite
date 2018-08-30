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

En la carpeta root creamos otra carpeta llamada `/contest` y dentro de esa carpeta un archivo que llamaremos server.js

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

Volvemos a FileZilla y nos dirijimos a la carpeta: **/var/www/htm**`

Dentro de la carpeta borramos el archivo 
