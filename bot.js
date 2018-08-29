var mysql = require('mysql');
var fs = require('fs');
var request = require('request');
var config = require('./config.json');
var log4js = require('log4js');
var speakeasy = require('speakeasy');

var nameSite = config.optionsSite["nameSite"];

var options = {
    key: fs.readFileSync('ssl/key.pem'),
    cert: fs.readFileSync('ssl/cert.crt'),
    requestCert: false,
    rejectUnauthorized: false
};
var html = '<html><head> <title>websocket</title></head></html>';
var server = require('https').createServer(options, function(request, response) {
    response.writeHeader(200, {
        'Access-Control-Allow-Origin': '*',
        "Content-Type": "text/html"
    });
    response.write(html);
    response.end();
});
var io = require('socket.io')(server);
server.listen(2096);

updateLog();
function updateLog() {
	log4js.configure({
		appenders: {
			out:{ type: 'console' },
			app:{ type: 'file', filename: 'logs/bot/bot'+time()+'.log' }
		},
		categories: {
			default: { appenders: [ 'out', 'app' ], level: 'all' }
		}
	});
	setTimeout(function(){
		updateLog();
	}, 24 * 3600 * 1000);
}

var logger = log4js.getLogger();

var pool  = mysql.createPool({
	database: config.database["database"],
	host: config.database["host"],
	user: config.database["user"],
	password: config.database["password"]
});


process.on('uncaughtException', function (err) {
	logger.trace('Strange error');
	logger.debug(err);
});

//LOGIN BOT
var vgo = {
    uid: null,
    name: null,
    secret: config.optionsBot.secret,
    auth: 'Basic ' + Buffer.from(config.optionsBot.api_key + ":", "ascii").toString("base64"),
    code_2fa: function() {
		return speakeasy.totp({secret: this.secret, encoding: 'base32', time: time()});
    },
    opskins_api: function(url, method, bodi, callback) {
        request({
            headers: {
                'Authorization': vgo.auth,
            },
            uri: url,
            method: method,
            form: bodi
        }, function(err, res, body) {
            if(err) throw err;
            var response = JSON.parse(body);
            callback(response);
        });
    }
};
var now_url = 'https://api-trade.opskins.com/IUser/GetProfile/v1/';
vgo.opskins_api(now_url, 'GET', {}, function(res) {
    vgo.uid = res['response']['user']['id'];
    vgo.name = res['response']['user']['display_name'];
    logger.info('Bot ' + vgo.uid + ' (' + vgo.name + ') got from OPSkins!');
});
var no_deposit_allowed = [];
var items_gone = [];
//LOGIN BOT

//GAME INFO
var AppID = config.optionsBot.AppID;
var ContextID = config.optionsBot.ContextID;
var proxies = config.proxies;

var minDeposit = config.optionsBot.minDeposit; //$
var minWithdraw = config.optionsBot.minWithdraw;//$
var offers = {};
var deposits = {};
var withdraws = {};
var invUserD = {};
var waitDeposit = {};
var waitWithdraw = {};
var timeBetween = config.optionsBot.timeBetween; //minutes between deposits and withdraws

//CONNECT
var users = {};

io.on('connection', function(socket) {
	var user = false;
	
	socket.on('hash', function(m) {
		pool.query('SELECT `steamid`, `name`, `avatar`, `tradeLink`, `balance`, `banTrade`, `rank` FROM users WHERE `hash` = ' + pool.escape(m.hash), function(err, row) {
			if((err) || (!row.length)){
				return socket.disconnect();
			}else{
				user = row[0];
				user.type = m.type;
				
				socket.join(user.steamid);
				
				users[user.steamid] = {
					steamid: user.steamid,
					avatar: user.avatar,
					name: user.name,
					tradeLink: user.tradeLink,
					socket: socket
				}
				
				socket.emit('message', {
					type: 'hello',
					balance: user.balance,
					withdraw: config.optionsBot.withdrawEnable
				});
				
				if(m.type == 'deposit'){
					getMyInv(user, socket);
					
					if(deposits[user.steamid] !== undefined && deposits[user.steamid]['active']){
						if(offers[deposits[user.steamid]['id']] !== undefined){
							socket.emit('message', {
								type: 'checkOffer',
								mtype: 'sent',
								code: offers[deposits[user.steamid]['id']]['code'],
								id: deposits[user.steamid]['id'],
								bot: deposits[user.steamid]['bot']
							});
						}
					}
				} else if(m.type == 'withdraw'){
					getBotInv(socket);
					
					if(withdraws[user.steamid] !== undefined && withdraws[user.steamid]['active']){
						if(offers[withdraws[user.steamid]['id']] !== undefined){
							if(offers[withdraws[user.steamid]['id']]['confirmed']){
								socket.emit('message', {
									type: 'checkOffer',
									mtype: 'sent',
									code: offers[withdraws[user.steamid]['id']]['code'],
									id: withdraws[user.steamid]['id'],
									bot: withdraws[user.steamid]['bot']
								});
							}else{
								socket.emit('message', {
									type: 'checkOffer',
									mtype: 'confirm',
									code: offers[withdraws[user.steamid]['id']]['code'],
									id: withdraws[user.steamid]['id'],
									bot: withdraws[user.steamid]['bot']
								});
							}
						}
					}
				}
			}
		});
	});
	
	socket.on('message', function(m) {
		if(!user) return;
		
		if(m.type == 'userInv'){
			if(user.type == 'deposit'){
				return getMyInv(user, socket);
			} else if(user.type == 'withdraw'){
				return getBotInv(socket);
			}
			return;
		}
		
		if(user.banTrade == 1){
			socket.emit('message', {
				type: 'error',
				enable: false,
				error: 'Error: You are banned to trade!'
			});
			return;
		}
		
		if(user.rank == 8 || user.rank == 5) {
		// YOUTUBER OR STREAMER	
			socket.emit('message', {
				type: 'error',
				enable: false,
				error: 'Error: You dont have permission to trade because you have test coins!'
			});
			return;
		}
		
		if(m.type == 'deposit') return deposit(m.items, user, socket);
		if(m.type == 'withdraw') return withdraw(m.items, user, socket);
	});
	
	socket.on('disconnect', function(m) {
		delete users[user.steamid];
	});
});

//GET BALANCE
function getBalance(steamid) {
	pool.query('SELECT `balance` FROM `users` WHERE `steamid` = '+pool.escape(steamid), function(err, row) {
		if((err) || (!row.length)) {
			logger.error('Failed to load your balance');
			logger.debug(err);
			return;
		}
		io.sockets.in(steamid).emit('message', {
			type: 'balance',
			balance: row[0].balance
		});
	});
}

//GET ALL ITEMS
var itemsWithdraw = [];
getItems();

function getItems() {
	itemsWithdraw = [];
	no_deposit_allowed = [];

	var now_url = 'https://api-trade.opskins.com/IUser/GetInventory/v1?app_id=1';
	vgo.opskins_api(now_url, 'GET', {}, function(res) {
		var items = res.response.items;
		for(var z in items) {
			var itm = items[z];
			var $price = itm.suggested_price;
			$price = $price + (10/100 * $price);
			itemsWithdraw.push({
				id: itm.id,
				name: itm.name,
				price: parseInt($price*10),
				image: itm.image["600px"]
			});
			no_deposit_allowed.push(itm.id);
		}

		logger.debug('[BOT] Withdraw items loaded! Count: ' + Object.keys(itemsWithdraw).length);
	});
}

//DEPOSIT
function deposit(items, user, socket){
	var items_not_allowed = 0;
	socket.emit('message', {type: 'alert', alert: 'Preparing trade offer, please wait...'});
	if(waitDeposit[user.steamid] !== undefined && waitDeposit[user.steamid]['time']-time() > 0) return socket.emit('message', {type: 'error', error: 'You need to wait ' + timeBetween + ' minutes between deposits!'});
	if(user.type != 'deposit') return socket.emit('message', {type: 'error', error: 'Error: Invalid page!'});
	
	waitDeposit[user.steamid] = {
		time: (time() + timeBetween * 60)
	}

	if(!user.tradeLink) return socket.emit('message', {type: 'error', error: 'Error: You need to set tradelink!'});
	if(deposits[user.steamid] !== undefined && deposits[user.steamid]['active']) return socket.emit('message', { type: 'error', error: 'Error: You have already a offer active!' });
	if(items.length <= 0) return socket.emit('message', { type: 'error', error: 'Error: You need to deposit minimum 1 item!' });

	for(var z in items) {
		for(var h in no_deposit_allowed) {
			if(items[z] == no_deposit_allowed[h]) items_not_allowed++;
		}
	}

	if(items_not_allowed > 0) return;

	var uid = user.tradeLink.split('/')[4];
	var token = user.tradeLink.split('/')[5];
	var Items = items.join(',');

	var now_url = 'https://api-trade.opskins.com/ITrade/SendOffer/v1/'; 
	var code = makeCode();
	vgo.opskins_api(now_url, 'POST', {'twofactor_code': vgo.code_2fa(), 'uid': uid, 'token': token, 'message': nameSite + ' | Deposit | Code: ' + code,  'items': Items}, function(res) {
		var state = res.response.offer.state;
		if(state == 2) {
			var totalItems = [];
			var totalPrice = 0;

			
			socket.emit('message', { type: 'checkOffer', mtype: 'process', code: code, id: res.response.offer.id, bot: vgo.uid });
			logger.debug('[BOT] Offer #' + res.response.offer.id + " is 'pending' >> Deposit");

			offers[res.response.offer.id] = {
				type: 'deposit',
				steamid: user.steamid,
				items: totalItems,
				total: totalPrice,
				code: code,
				confirmed: true
			};

			deposits[user.steamid] = {
				active: true,
				id: res.response.offer.id,
				bot: vgo.uid
			};

			pool.query('INSERT INTO trades SET type = "deposit", user = ' + pool.escape(user.steamid) + ', tradeId = ' + pool.escape(res.response.offer.id) + ', items = ' + pool.escape(items.join('/')) + ', amount = 0, code = ' + pool.escape(code) + ', time = ' + pool.escape(time()) + ', status = "sent"', function(err) {
				if(err) return logger.error(err);

				socket.emit('message', { type: 'checkOffer', mtype: 'sent', code: code, id: res.response.offer.id, bot: vgo.uid });
				socket.emit('message', { type: 'success', success: 'Your deposit offer has been sent. Check offers tab from profile for more informations.' });

				checkDepositTrade(user, res.response.offer.id, socket);
			});
		} else {
			socket.emit('message', { type: 'error', error: 'Error: There was an error sending your trade offer. Please try again later.' });
			logger.error(err);
		}
	});
}

//WITHDRAW
function withdraw(items, user, socket){
	if(config.optionsBot.withdrawEnable == false){ socket.emit('message', { type: 'error', error: 'Error: The withdraw is unavailable at this moment. Try again later!' }); return; }
	socket.emit('message', { type: 'alert', alert: 'Preparing trade offer please wait...' });
	if(waitWithdraw[user.steamid] !== undefined && waitWithdraw[user.steamid]['time'] - time() > 0){ socket.emit('message', { type: 'error', error: 'Error: You need to wait '+timeBetween+' minutes between withdraws!' }); return; }
	if(user.type != 'withdraw'){ socket.emit('message', { type: 'error', error: 'Error: Invalid page!' }); return; }

	var items_goned = 0;

	waitWithdraw[user.steamid] = {
		time: (time() + timeBetween * 60)
	}
	
	if(!user.tradeLink){ socket.emit('message', { type: 'error', error: 'Error: You need to set trade link!' }); return; }
	if(withdraws[user.steamid] !== undefined && withdraws[user.steamid]['active']){ socket.emit('message', { type: 'error', error: 'Error: You have already a offer active!' }); return; }
	if(items.length <= 0){ socket.emit('message', { type: 'error', error: 'Error: You need to withdraw minimum 1 item!' }); return; }

	for(var z in items) {
		for(var h in items_gone) {
			if(items[z] == items_gone[h]) items_goned++;
		}
	}

	if(items_goned > 0) return socket.emit('message', {type: 'error', error: 'Some items are gone or in other trade!'});
	
	var totalItems = [];
	var totalPrice = 0;

	var uid = user.tradeLink.split('/')[4];
	var token = user.tradeLink.split('/')[5];
	var Items = items.join(',');

	for(var h in itemsWithdraw) {
		for(var z in items) {
			if(itemsWithdraw[h].id == items[z]) totalPrice += parseInt(itemsWithdraw[h].price);
		}
	}

	if(totalPrice < minWithdraw * 1000) return socket.emit('message', {type: 'error', error: 'You need to withdraw minimum ' + minWithdraw + ' coins!'});

	pool.query('SELECT balance, countDeposits, available FROM users WHERE steamid = ' + pool.escape(user.steamid), function(err1, row1) {
		if((err1) || (!row1.length)) {
			logger.error('Failed to find DB');
			logger.debug(err1);
			socket.emit('message', {
				type: 'error',
				error: 'You are not DB'
			});
			return;	
		}

		if(row1[0].countDeposits <= 0) return socket.emit('message', { type: 'error', error: 'Error: You need to deposit first minimum ' + minDeposit + ' coins!' });
		if(row1[0].available < totalPrice) return socket.emit('message', { type: 'error', error: 'Error: You need to have withdraw available '+totalPrice+' coins. Need '+(totalPrice - row1[0].available)+'!' });
		if(row1[0].balance >= totalPrice) {
			var code = makeCode();
			var now_url = 'https://api-trade.opskins.com/ITrade/SendOffer/v1/';
			vgo.opskins_api(now_url, 'POST', {'twofactor_code': vgo.code_2fa(), 'uid': uid, 'token': token, 'message': nameSite + ' | Withdraw | Code: ' + code, 'items': Items}, function(res) {
				if(res.hasOwnProperty('message') && !res.hasOwnProperty('response')) return socket.emit('message', {type: 'error', error: 'There is an error sending your trade! Try again!'});
				var state = res.response.offer.state;
				if(state == 2) {
					pool.query('UPDATE users SET balance = balance - ' + pool.escape(totalPrice) + ', available = available - ' + pool.escape(totalPrice) + ' WHERE steamid = ' + pool.escape(user.steamid), function(err2, row2) {
						if(err2) {
							logger.error('Error in withdraw');
							logger.debug(err2);
							socket.emit('message', {
								type: 'error',
								error: 'You do not have enough balance!'
							});
							return;
						}
		
						socket.emit('message', { type: 'checkOffer', mtype: 'process', code: code, id: res.response.offer.id, bot: vgo.uid });
						logger.debug('[BOT] Offer #' + res.response.offer.id + " is 'sent' << Withdraw");

						offers[res.response.offer.id] = {
							type: 'withdraw',
							steamid: user.steamid,
							items: totalItems,
							total: totalPrice,
							status: 'sent',
							code: code,
							confirmed: false
						};
	
						withdraws[user.steamid] = {
							active: true,
							id: res.response.offer.id,
							bot: vgo.uid
						};
	
						pool.query('INSERT INTO trades SET type = "withdraw", user = ' + pool.escape(user.steamid) + ', tradeId = ' + pool.escape(res.response.offer.id) + ', items = ' + pool.escape(items.join('/')) + ', amount = ' + pool.escape(totalPrice) + ', code = ' + pool.escape(code) + ', time = ' + pool.escape(time()) + ', status = "sent"', function(err4) {
							socket.emit('message', { type: 'checkOffer', mtype: 'sent', code: code, id: res.response.offer.id, bot: vgo.uid });
	
							getBalance(user.steamid);

							socket.emit('message', { type: 'success', success: 'Your withdraw offer has been sent but need bot confirmation. Wait few moments!' });
							checkWithdrawTrade(user, res.response.offer.id, socket);
						});
					});
				} else {
					socket.emit('message', {
						type: 'error',
						error: 'Error: There was an error sending your trade offer. Please try again later.'
					});
					logger.error(err);
				}
			});
		} else return socket.emit('message', {type: 'error', error: 'You do not have enough balance to withdraw these items!'});
	});
}


//WITHDRAW
function checkWithdrawTrade(user, trade_id, socket) {
	var tries = 0;
	var done = setInterval(function() {
		tries++;

		var now_url = 'https://api-trade.opskins.com/ITrade/GetOffer/v1?offer_id=' + trade_id;
		vgo.opskins_api(now_url, 'GET', {}, function(res) {
			var state = res.response.offer.state;
			if(state == 3) {
				pool.query('UPDATE trades SET status = "accepted" WHERE tradeId = ' + pool.escape(trade_id), function(err1) {
					if(err1) return logger.error(err1);

					offers[trade_id]['status'] = 'accepted';
					socket.emit('message', { type: 'checkOffer', mtype: 'accepted', code: offers[trade_id]['code'], id: trade_id, bot: withdraws[offers[trade_id]['steamid']]['bot'] });
					socket.emit(offers[trade_id]['steamid']);

					if(withdraws[offers[trade_id]['steamid']] !== undefined) withdraws[offers[trade_id]['steamid']]['active'] = false;
					logger.debug('[BOT] Offer #' + res.response.offer.id + " is accepted << Withdraw");
					getItems();
					clearInterval(done);
				});
			}
		});

		if(tries == 30) {
			var now_url = 'https://api-trade.opskins.com/ITrade/CancelOffer/v1?offer_id' + trade_id;
			vgo.opskins_api(now_url, 'GET', {}, function(res) {
					clearInterval(done);
					pool.query('UPDATE trades SET status = "declined" WHERE tradeId = ' + pool.escape(trade_id), function(err1) {
						if(err1) return logger.error(err1);

						offers[trade_id]['status'] = 'declined';

						pool.query('UPDATE users SET balance = balance + ' + pool.escape(offers[trade_id]['total']) + ', available = available + ' + pool.escape(offers[trade_id]['total']) + ' WHERE steamid = ' + pool.escape(user.steamid), function(err2) {
							if(err2) return logger.error(err2);

							getBalance(user.steamid);

							socket.emit('message', { type: 'checkOffer', mtype: 'declined', code: offers[trade_id]['code'], id: trade_id, bot: deposits[offers[trade_id]['steamid']]['bot'] });
							if(deposits[offers[trade_id]['steamid']] !== undefined) deposits[offers[trade_id]['steamid']]['active'] = false;
							logger.debug('[BOT] Offer #' + trade_id + " is declined >> Deposit");
						});
					});
			});
		}
	}, 1000);
}


//DEPOSIT
function checkDepositTrade(user, trade_id, socket) {
	var tries = 30;
	var done = setInterval(function() {
		tries++;

		var now_url = 'https://api-trade.opskins.com/ITrade/GetOffer/v1?offer_id=' + trade_id;
		vgo.opskins_api(now_url, 'GET', {}, function(res) {
			var state = res.response.offer.state;
			if(state == 3) {
				pool.query('UPDATE trades SET status = "accepted" WHERE tradeId = ' + pool.escape(trade_id), function(err1) {
					if(err1) return logger.error(err1);

					var total = 0;
					offers[trade_id]['status'] = 'accepted';
					socket.emit('message', { type: 'checkOffer', mtype: 'accepted', code: offers[trade_id]['code'], id: trade_id, bot: deposits[offers[trade_id]['steamid']]['bot'] });

					for(var z in res.response.offer.recipient.items) {
						var itm = res.response.offer.recipient.items[z];
						var $price = itm.suggested_price;
						$price = ($price);
						total += parseInt($price*10);
					}

					pool.query('UPDATE users SET balance = balance + ' + pool.escape(total) + ', countDeposits = countDeposits + 1, totalDeposits = totalDeposits + ' + pool.escape(total) + ' WHERE steamid = ' + pool.escape(user.steamid), function(err3) {
						if(err3) return logger.error(err3);

						getBalance(user.steamid);

						if(deposits[offers[trade_id]['steamid']] !== undefined) deposits[offers[trade_id]['steamid']]['active'] = false;
						logger.debug('[BOT] Offer #' + trade_id + " is accepted >> Deposit");
						getItems();
						clearInterval(done);
					});
				});
			}
		});

		if(tries == 30) {
			var now_url = 'https://api-trade.opskins.com/ITrade/CancelOffer/v1?offer_id' + trade_id;
			vgo.opskins_api(now_url, 'GET', {}, function(res) {
					clearInterval(done);
					pool.query('UPDATE trades SET status = "declined" WHERE tradeId = ' + pool.escape(trade_id), function(err1) {
						if(err1) return logger.error(err1);

						offers[offer_id]['status'] = 'declined';

						socket.emit('message', { type: 'checkOffer', mtype: 'declined', code: offers[trade_id]['code'], id: trade_id, bot: deposits[offers[trade_id]['steamid']]['bot'] });
						if(deposits[offers[trade_id]['steamid']] !== undefined) deposits[offers[trade_id]['steamid']]['active'] = false;
						logger.debug('[BOT] Offer #' + trade_id + " is declined >> Deposit");
					});
			});
		}
	}, 1000);
}




//GET USER INV
function getMyInv(user, socket){
	var now_url = 'https://api-trade.opskins.com/ITrade/GetUserInventoryFromSteamId/v1?steam_id=' + user.steamid + '&app_id=1';
	var totalItems = [];
	vgo.opskins_api(now_url, 'GET', {}, function(res) {
		var items = res.response.items;
		for(var z in items) {
			var itm = items[z];
			var $price = itm.suggested_price;
			$price = ($price);
			totalItems.push({
				id: itm.id,
				name: itm.name,
				price: parseInt($price*10),
				image: itm.image["600px"]
			});
		}
		socket.emit('message', {type: 'userInv', items: totalItems});
		if(totalItems.length > 0) socket.emit('message', {type: 'alert', alert: 'Inventory loaded!'});
		else socket.emit('message', {type: 'error', error: 'No items in the inventory!'});

		invUserD[user.steamid] = {
			time: time()+60,
			items: totalItems
		};

		logger.info('User ' + user.steamid + ' has ' + totalItems.length + ' items!');

		socket.emit('message', {type: 'waitInv', time: 60});
	});
}

//GET BOT INV
function getBotInv(socket) {
	if(itemsWithdraw.length > 0) socket.emit('message', {type: 'alert', alert: 'Inventory loaded!'});
	else socket.emit('message', {type: 'error', error: 'No items in the inventory!'});
	socket.emit('message', {type: 'userInv', items: itemsWithdraw});
}
//

function time(){
  return parseInt(new Date().getTime()/1000);
}

function makeCode() {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for(var i=0; i < 6; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function getProxy(){
  return "https://" + proxies[random(0,proxies.length-1)];
}

function random(min, max) {
 return Math.floor(Math.random() * (max - min + 1)) + min;
}

function query(sql, callback) {
	if (typeof callback === 'undefined') {
		callback = function() {};
	}
	pool.getConnection(function(err, connection) {
		if(err) return callback(err);
		connection.query(sql, function(err, rows) {
			if(err) return callback(err);
			connection.release();
			return callback(null, rows);
		});
	});
}