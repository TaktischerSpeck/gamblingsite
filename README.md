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
