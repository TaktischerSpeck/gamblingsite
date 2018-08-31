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
    <h1>Trade Website - Tutorial</h1>
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
    <h1>Trade Website - Tutorial</h1>
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
        
## 9. Volvemos a PUTTY para inatalar socket y expresstrade

Ponemos estos comandos en putty:

* `cd /`
* `cd contest` *para dirigirnos a la carpeta "contest"*
* `npm install expresstrade socket.io@1.7.3 fs` *para instalar los comandos necesarios*

Y cuando esto acabe ponemos: `nodejs server.js` para iniciar el servidor.

## 10. Ahora haremos una modificación en el archivo **server.js** que se encuentra en /contest

Cambiamos las variables globales:

```javascript
var users = {};



io.on('connection', function(socket) {
    socket.on('connected', function(tradeutl) {


        users[tradeurl.split('/')[4]] = tradeurl;

        console.log(users);

        socket.emit('message', "You are now registered on the Website!")


    });
});
```

## 11. Ahora volvemos al archivo **index.php** y seguimos escribiendo abajo:

```php
socket.on('message', function(msg) {
            toastr.info(msg);
```

Por lo que ahora el archivo entero quedaría así:

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

<script src="https://code.jquery.com/jquery-3.3.1.js" integrity: "sha384-oqVuAfHRKap7fdgcCY5iykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC" crossorigin= "@guiolmar"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>


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


        socket.on('message', function(msg) {
            toastr.info(msg);
```
Pon en PUTTY `node site.js`
Y ahora puedes probar a poner tu tradeurl!

## 12. Ahora actualizamos las variables globales de nuevo.

Las actualizamos para añadir el mensaje de cuando una persona ya esta registrada:

Eliminariamos la linea de codigo: `console.log(users);`

Y añadiriamos en primer lugar una nueva línea de código y las varibales globales quedarían así:

```javascript
var users = {};



io.on('connection', function(socket) {
    socket.on('connected', function(tradeutl) {

        if(users.hasOwnProperty(tradeurl.split('/')[4])) return socket.emit('message', 'You are alredy registered!');

        users[tradeurl.split('/')[4]] = tradeurl;

        socket.emit('message', "You are now registered on the Website!")


    });
});
```

## 13. Ahora vamos a trabajar con la API de OPSkins: https://github.com/OPSkins/trade-opskins-api/tree/master/IUser

Vamos a trabajar en base a la API de OPSkins pero con la ayuda de esto: https://github.com/TheTimmaeh/node-expresstrade

Ahora vamos a añadir el código de GitHub a nuestro proyecto...

Nos dirijimos a: **server.js** y añadimos una nueva variable a las variables principales. Quedaría así:

```javascript
var app = require('https').createServer();
var io = require('socket.io')(app);
var fs = require('fs');

var ExpressTrade = require('expresstrade');

var ET = new ExpressTrade({
    apikey: 'Your OPSkins API Key',
    twofactorsecret: 'Your OPSkins 2FA Secret',
    pollInterval: 5000
  })

app.listen(8080);
```

Pero ahora tenéis que cambiar vuestra API de OPSkins, la encontráis aquí: https://opskins.com > Account Settings > Advanced Options > API Key.

Y el 2FA Code lo encontráis al iniciar vuestro autenticador. Si ya lo teneis configurado, debeis desconfigurarlo, y volverlo a poner, y el codigo que os dara, ejemplo: "HGPS SHFO HS6A G2U7"

AL final y con todo configurado con vuestros parametros, quedaria algo asi:

```javascript
var app = require('https').createServer();
var io = require('socket.io')(app);
var fs = require('fs');

var ExpressTrade = require('expresstrade');

var ET = new ExpressTrade({
    apikey: 'jasd67ahjdgsd6asd565d6f5dfd5f6df(example)',
    twofactorsecret: 'HGPSSHFOHS6AG2U7(example)',
    pollInterval: 5000
  })

app.listen(8080);
```

Bien, esos datos serán los que la página va a utilizar como bot.

## 14. Ahora vamos a crear las funciones del bot, primera función.

Vamos a crear el apartado del bot_inventory:

Vamos a editar el archivo de **server.js** al final del todo vamos a añadir esto:

```javascript
var users = {};



io.on('connection', function(socket) {
    socket.on('logged', function() {
        botInventory(function(items) {
            socket.emit('bot inventory', items)
        });
    });


    socket.on('register', function(tradeutl) {

        if(users.hasOwnProperty(tradeurl.split('/')[4])) return socket.emit('message', 'You are alredy registered!');

        users[tradeurl.split('/')[4]] = tradeurl;

        socket.emit('message', "You are now registered on the Website!")
        
    });
});




function botInventory(callback) {
    ET.IUser.GetInventory({
        app_id: 1
    }
        (err, body) => {
        if(err) console.log(err);

        callback(body.responde.items);
    });
}
```

Ahora volvemos al archivo **index.php** para crear la funcion del "bot iventory" y tanbien editaremos la base del codigo html...

El codigo html principal quedaría así:

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
    <h1>Trade Website - Tutorial</h1>
    <div class="settings">
        <imput type="text" id="your_tradeurl" placeholder="your trade url">
        <button type="button" id="registerBtn">Register</button>
    </div>
    <div class='bot invemtory'>
            
    </div>
</body>
</html>
```
Y los scripts quedarían así:

```php
<script src="https://code.jquery.com/jquery-3.3.1.js" integrity: "sha384-oqVuAfHRKap7fdgcCY5iykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC" crossorigin= "@guiolmar"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>


<script>
    var socket = null;

    if(socket == null) {
        socket = io('yourip(123.456.789.01):8080')

        socket.on('connect', function() {
            toastr.success('Nice connection!')

            socket.emit('logged');

            user_functions();
        });
    }


    function user_functions() {

        $('#registerBtn').click(function() {
            var $tradeurl = $('#your_tradeurl').val();

            if($tradeurl.includes('https://') && $tradeurl.includes('trade.opskins.com')) {


                socket.emit('register', $tardeurl);


            } else toastr.error('TradeUrl No Valid!')

        });


        socket.on('message', function(msg) {
            toastr.info(msg);
        });


        socket.on('bot inventory', function(items) {
            for(var i in items) {
                $('.bot_inventory').append(`
                    <div class="item" data-id="` + items[i].id + `">
                        <ing src="` + items[i].image['100px'] + `"> 
                        ` + items[i].name + `<br>
                        $` + parseFloat(items[i].suggested_price_floor/100).toFixed(2) + '
                    </div>            
                ')
            }
        });
    

    }
```
Pon en PUTTY `node server.js`
Y ahora si entras a la web y pones tu tradeurl verás los items del bot!

## 15. Vamos a crear el boton de Withdraw

En el archivo **index.php** tenemos que editar la base html:

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
    <h1>Trade Website - Tutorial</h1>
    <div class="settings">
        <imput type="text" id="your_tradeurl" placeholder="your trade url">
        <button type="button" id="registerBtn">Register</button>
    </div>
    <div class='bot invemtory'>
            
    </div>



    <button type="button" id="withdrawItems">Withdraw</button>
    <span class=items></span>
</body>
</html>
```

Ahora si guardamos y ejecutamos en PUTTY `node server.js` verás los cambios!


## 16. Añadimos style a los parametros principales

Agregamos el style al archivo **index.php**

```php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Trade Contest</title>
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css">

    <style>
        .bot_inventory {
            margin-top: 100px;
            display: flex;
        }

        .item {
            cursor: pointer;
            width: 100px;
            background-color: black;
            color: white;
            margin-right: 10px;
        }

        .item img {
            width: 100px;
        } 

        .items {
            margin-top: 100px;
            display: flex;
        }
    </style>

</head>
<body>
    <h1>Trade Website - Tutorial</h1>
    <div class="settings">
        <imput type="text" id="your_tradeurl" placeholder="your trade url">
        <button type="button" id="registerBtn">Register</button>
    </div>
    <div class='bot invemtory'>
            
    </div>



    <button type="button" id="withdrawItems">Withdraw</button>
    <div class=items></span>
</body>
</html>
```
Y ahora los scripts:

```php
<script>


    var withdraw_items = [];


    var socket = null;

    if(socket == null) {
        socket = io('yourip(123.456.789.01):8080')

        socket.on('connect', function() {
            toastr.success('Nice connection!')

            socket.emit('logged');

            user_functions();
        });
    }


    function user_functions() {

        $('body').on('click', '.bot_inventory .items', function() {
            var &id = $(this).attr('data-id';)

            var $item = $(this).html();
            $(this).remove();

            withdraw.items.push($id);

            $('.items').append(`
                <div class="item" data-id="` + $id + `">
                    ` + $item + `
                </div>
            `);
        });

        $('body').on('click', '.items .items', function() {
            var &id = $(this).attr('data-id';)

            var $item = $(this).html();

            $(this).remove();

            withdraw_items.splice(withdraw_items.indexDF($id), 1);

            $('.bot_inventory').append(`
                <div class="item" data-id="` + $id + `">
                    ` + $item + `
                </div>
            `);
        });

        $('#registerBtn').click(function() {
            var $tradeurl = $('#your_tradeurl').val();

            if($tradeurl.includes('https://') && $tradeurl.includes('trade.opskins.com')) {


                socket.emit('register', $tardeurl);


            } else toastr.error('TradeUrl No Valid!')

        });


        socket.on('message', function(msg) {
            toastr.info(msg);
        });


        socket.on('bot inventory', function(items) {
            for(var i in items) {
                $('.bot_inventory').append(`
                    <div class="item" data-id="` + items[i].id + `">
                        <ing src="` + items[i].image['100px'] + `"> 
                        ` + items[i].name + `<br>
                        $` + parseFloat(items[i].suggested_price_floor/100).toFixed(2) + '
                    </div>            
                ')
            }
        });
    

    }
```

Y ahora si pones en PUTTY `node server.js` verás que cuandi clickas a cualquier objeto se mueve hacia abajo...

## 17. Ahora vamos a crear la función de "Withdraw" y los posibles errores del withdraw

Este es el codigo con el Withdraw ya hecho:
**Server.js**
```javascript
var app = require('https').createServer();
var io = require('socket.io')(app);
var fs = require('fs');

var ExpressTrade = require('expresstrade');

var ET = new ExpressTrade({
    apikey: 'Your OPSkins API Key',
    twofactorsecret: 'Your OPSkins 2FA Secret',
    pollInterval: 5000
  })

app.listen(8080);


//global
var users = {};



io.on('connection', function(socket) {
    socket.on('logged', function() {
        botInventory(function(items) {
            socket.emit('bot inventory', items)
        });
    });


    socket.on('register', function(tradeutl) {

        if(users.hasOwnProperty(tradeurl.split('/')[4])) return socket.emit('message', 'You are alredy registered!');

        users[tradeurl.split('/')[4]] = tradeurl;

        socket.emit('message', "You are now registered on the Website!")

    });

    socket.on('withdraw items', function(items, tradeurl) {
        if(tradeurl == '') return  socket.emit('message', 'You need to input your tradelink!');
        if(items.length == 0) return socket.emit('message', 'You need to select some items!')

        ET.ITrade.SendOffer({
            trade_url: tradeurl,
            items: items.join('.'),
            message: 'Trade Offer!'
        }, (err, body) => {
            if(err) {
                socket.emit('message', err);
                return;
            }

            if(!body.hasOwnProperty('response') && body.hasOwnProperty('message')) return socket.emit('message', body.message);

            if(body.response.offer.state == 2) {
                socket.emit('trade offer', body.response.offer.id);
            }

        });    
    });
});




function botInventory(callback) {
    ET.IUser.GetInventory({
        app_id: 1
    }
        (err, body) => {
        if(err) console.log(err);

        callback(body.responde.items);
    });
}
```

**Index.php**
```php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Trade Contest</title>
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css">

    <style>
        .bot_inventory {
            margin-top: 100px;
            display: flex;
        }

        .item {
            cursor: pointer;
            width: 100px;
            background-color: black;
            color: white;
            margin-right: 10px;
        }

        .item img {
            width: 100px;
        } 

        .items {
            margin-top: 100px;
            display: flex;
        }
    </style>

</head>
<body>
    <h1>Trade Website - Tutorial</h1>
    <div class="settings">
        <imput type="text" id="your_tradeurl" placeholder="your trade url">
        <button type="button" id="registerBtn">Register</button>
    </div>
    <div class='bot invemtory'>
            
    </div>



    <button type="button" id="withdrawItems">Withdraw</button>
    <div class=items></span>

    <br></br>
    
        <h4>Your history trade</h4>
    <div class='trade'>

    </div>
</body>
</html>

<script src="https://code.jquery.com/jquery-3.3.1.js" integrity: "sha384-oqVuAfHRKap7fdgcCY5iykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC" crossorigin= "@guiolmar"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>


<script>


    var withdraw_items = [];


    var socket = null;

    if(socket == null) {
        socket = io('yourip(123.456.789.01):8080')

        socket.on('connect', function() {
            toastr.success('Nice connection!')

            socket.emit('logged');

            user_functions();
        });
    }


    function user_functions() {

        $('body').on('click', '.bot_inventory .items', function() {
            var &id = $(this).attr('data-id';)

            var $item = $(this).html();
            $(this).remove();

            withdraw.items.push($id);

            $('.items').append(`
                <div class="item" data-id="` + $id + `">
                    ` + $item + `
                </div>
            `);
        });

        $('body').on('click', '.items .items', function() {
            var &id = $(this).attr('data-id';)

            var $item = $(this).html();

            $(this).remove();

            withdraw_items.splice(withdraw_items.indexDF($id), 1);

            $('.bot_inventory').append(`
                <div class="item" data-id="` + $id + `">
                    ` + $item + `
                </div>
            `);
        });

        $('#registerBtn').click(function() {
            var $tradeurl = $('#your_tradeurl').val();

            if($tradeurl.includes('https://') && $tradeurl.includes('trade.opskins.com')) {


                socket.emit('register', $tardeurl);


            } else toastr.error('TradeUrl No Valid!')

        });
        
        $('#withdrawItems').click(function() {
            socket.emit('withdraw items', withdraw_items, $('#your_tradeurl').val());
        
        });


        socket.on('message', function(msg) {
            toastr.info(msg);
        });

        socket.on('tarde offer', function(tid) {
            $('.trade').append(`
                <span class color: purple; font-weight: bold; "Trade #` + tid + ` has been created!</span>
                <a href="https://trade.opskins.com/trade-offers/` + tid + `" target=" blank">click here to accept</a>
            `);
        });


        socket.on('bot inventory', function(items) {
            for(var i in items) {
                $('.bot_inventory').append(`
                    <div class="item" data-id="` + items[i].id + `">
                        <ing src="` + items[i].image['100px'] + `"> 
                        ` + items[i].name + `<br>
                        $` + parseFloat(items[i].suggested_price_floor/100).toFixed(2) + '
                    </div>            
                ')
            }
        });
    

    }
```

Pon en Putty `node server.js` y el withdraw ya funciona!

## 18. Vamos a crear el "Deposit"

Edita el codigo base html y añade estos cambios:

```php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Trade Contest</title>
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css">

    <style>
        .bot_inventory {
            margin-top: 100px;
            display: flex;
        }

        .user_inventory {
            margin-top: 100px;
            display: flex;
        }

        .item {
            cursor: pointer;
            width: 100px;
            background-color: black;
            color: white;
            margin-right: 10px;
        }

        .item img {
            width: 100px;
        } 

        .items {
            margin-top: 100px;
            display: flex;
        }
    </style>

</head>
<body>
    <h1>Trade Website - Tutorial</h1>
    <div class="settings">
        <imput type="text" id="your_tradeurl" placeholder="your trade url">
        <button type="button" id="registerBtn">Register</button>
    </div>

<br>
    <div class="user_inventory">


    </div></br>
    <button type="button" id="withdrawItems">Withdraw</button>
    <div class=items></span>


    <div class='bot invemtory'>
            
    </div>



    <button type="button" id="withdrawItems">Withdraw</button>
    <div class=items></span>

    <br></br>
    
        <h4>Your history trade</h4>
    <div class='trade'>

    </div>
</body>
</html>
```

El nuevo codigo de **index.php** con el deposit:
```php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Trade Contest</title>
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css">

    <style>
        .bot_inventory {
            margin-top: 100px;
            display: flex;
        }

        .user_inventory {
            margin-top: 100px;
            display: flex;
        }

        .item {
            cursor: pointer;
            width: 100px;
            background-color: black;
            color: white;
            margin-right: 10px;
        }

        .item img {
            width: 100px;
        } 

        .items {
            margin-top: 100px;
            display: flex;
        }
    </style>

</head>
<body>
    <h1>Trade Website - Tutorial</h1>
    <div class="settings">
        <imput type="text" id="your_tradeurl" placeholder="your trade url">
        <button type="button" id="registerBtn">Register</button>
    </div>

<br>
    <div class="user_inventory">


    </div></br>
    <button type="button" id="depositItems">Deposit</button>
    <div class=items2></span>


    <div class='bot invemtory'>
            
    </div>



    <button type="button" id="withdrawItems">Withdraw</button>
    <div class=items></span>

    <br></br>
    
        <h4>Your history trade</h4>
    <div class='trade'>

    </div>
</body>
</html>

<script src="https://code.jquery.com/jquery-3.3.1.js" integrity: "sha384-oqVuAfHRKap7fdgcCY5iykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC" crossorigin= "@guiolmar"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>


<script>


    var withdraw_items = [];
    var deposit_items = [];


    var socket = null;

    if(socket == null) {
        socket = io('yourip(123.456.789.01):8080')

        socket.on('connect', function() {
            toastr.success('Nice connection!')

            socket.emit('logged');

            user_functions();
        });
    }


    function user_functions() {

        $('body').on('click', '.bot_inventory .items', function() {
            var &id = $(this).attr('data-id';)

            var $item = $(this).html();
            $(this).remove();

            withdraw.items.push($id);

            $('.items').append(`
                <div class="item" data-id="` + $id + `">
                    ` + $item + `
                </div>
            `);
        });

        $('body').on('click', '.items .items', function() {
            var &id = $(this).attr('data-id';)

            var $item = $(this).html();

            $(this).remove();

            withdraw_items.splice(withdraw_items.indexDF($id), 1);

            $('.bot_inventory').append(`
                <div class="item" data-id="` + $id + `">
                    ` + $item + `
                </div>
            `);
        });

        $('#registerBtn').click(function() {
            var $tradeurl = $('#your_tradeurl').val();

            if($tradeurl.includes('https://') && $tradeurl.includes('trade.opskins.com')) {


                socket.emit('register', $tardeurl);

                socket.emit('user inventory', $tradeurl);


            } else toastr.error('TradeUrl No Valid!')

        });

        socket.on('user inventory', function(items) {
            for(var i in items) {
                $('.user_inventory').append(`
                    <div class="item" data-id="` + items[i].id + `">
                        <ing src="` + items[i].image['100px'] + `"> 
                        ` + items[i].name + `<br>
                        $` + parseFloat(items[i].suggested_price_floor/100).toFixed(2) + '
                    </div>            
                ')
            }
        });

        $('body').on('click', '.user_inventory .items', function() {
            var &id = $(this).attr('data-id';)

            var $item = $(this).html();
            $(this).remove();

            deposit.items.push($id);

            $('.items2').append(`
                <div class="item" data-id="` + $id + `">
                    ` + $item + `
                </div>
            `);
        });

        $('body').on('click', '.items2 .items', function() {
            var &id = $(this).attr('data-id';)

            var $item = $(this).html();

            $(this).remove();

            withdraw_items.splice(withdraw_items.indexDF($id), 1);

            $('.user_inventory').append(`
                <div class="item" data-id="` + $id + `">
                    ` + $item + `
                </div>
            `);
        });


        $('#withdrawItems').click(function() {
            socket.emit('withdraw items', withdraw, $('#your_tradeurl').val());
        
        });

        $('#depositItems').click(function() {
            socket.emit('deposit items', deposit_items, $('#your_tradeurl').val());
        
        });

        socket.on('message', function(msg) {
            toastr.info(msg);
        });

        socket.on('tarde offer', function(tid, type) {
            $('.trade').append(`
                <span class color: purple; font-weight: bold; "Trade #` + tid + `for` + type + `has been created!</span>
                <a href="https://trade.opskins.com/trade-offers/` + tid + `" target=" blank">click here to accept</a><br>
            `);
        });


        socket.on('bot inventory', function(items) {
            for(var i in items) {
                $('.bot_inventory').append(`
                    <div class="item" data-id="` + items[i].id + `">
                        <ing src="` + items[i].image['100px'] + `"> 
                        ` + items[i].name + `<br>
                        $` + parseFloat(items[i].suggested_price_floor/100).toFixed(2) + '
                    </div>            
                ')
            }
        });
    

    }      
```

Y por ultimo el codigo del **server.js** con el deposit:

```javascript
var app = require('https').createServer();
var io = require('socket.io')(app);
var fs = require('fs');

var ExpressTrade = require('expresstrade');

var ET = new ExpressTrade({
    apikey: 'Your OPSkins API Key',
    twofactorsecret: 'Your OPSkins 2FA Secret',
    pollInterval: 5000
  })

app.listen(8080);


//global
var users = {};



io.on('connection', function(socket) {
    socket.on('logged', function() {
        botInventory(function(items) {
            socket.emit('bot inventory', items)
        });
    });


    socket.on('register', function(tradeutl) {

        if(users.hasOwnProperty(tradeurl.split('/')[4])) return socket.emit('message', 'You are alredy registered!');

        users[tradeurl.split('/')[4]] = tradeurl;

        socket.emit('message', "You are now registered on the Website!")

    });

    socket.on('withdraw items', function(items, tradeurl) {
        if(tradeurl == '') return  socket.emit('message', 'You need to input your tradelink!');
        if(items.length == 0) return socket.emit('message', 'You need to select some items!')

        ET.ITrade.SendOffer({
            trade_url: tradeurl,
            items: items.join('.'),
            message: 'Trade Offer!'
        }, (err, body) => {
            if(err) {
                socket.emit('message', err);
                return;
            }

            if(!body.hasOwnProperty('response') && body.hasOwnProperty('message')) return socket.emit('message', body.message);

            if(body.response.offer.state == 2) {
                socket.emit('trade offer', body.response.offer.id, 'withdraw');
            }

        });    
    });

    socket.on('deposit items', function(items) {
        if(tradeurl == '') return  socket.emit('message', 'You need to input your tradelink!');
        if(items.length == 0) return socket.emit('message', 'You need to select some items to deposit!')

        ET.ITrade.SendOffer({
            trade_url: tradeurl,
            items: items.join('.'),
            message: 'Trade Offer!'
        }, (err, body) => {
            if(err) {
                socket.emit('message', err);
                return;
            }

            if(!body.hasOwnProperty('response') && body.hasOwnProperty('message')) return socket.emit('message', body.message);

            if(body.response.offer.state == 2) {
                socket.emit('trade offer', body.response.offer.id, 'deposit');
            }

        });    
    });

    socket.on('user inventory', function(tradeurl) {
        userInventory(tradeurl.split('/')[4], function(items) {
            socket.emit('user invetory', items);
        
        });
    });
});




function botInventory(callback) {
    ET.IUser.GetInventory({
        app_id: 1
    },
        (err, body) => {
        if(err) return console.log(err);

        callback(body.responde.items);
    });
}

function userInvemtory(uis, callback) {
    ET.ITrade.GetUserInvemtory({
        app_id: 1,
        uid: uid
    }, (err, body) => {

        if(err) return console.log(err);

        callback(body.response.items);
    });
}
```

Entramos en PUTTY y ponemos `killall node` y por ultimo `node server.js`

La pagina deberia funcionar con el deposit y el withdraw!

Gracias @OPSkins
