var mysql = require('mysql');
var log4js = require('log4js');
var fs = require('fs');
var options = {
	key: fs.readFileSync('ssl/key.pem'),
	cert: fs.readFileSync('ssl/cert.crt'),
	requestCert: false,
	rejectUnauthorized: false
};
var html = '<html><head> <title>websocket</title></head></html>';
var server = require('https').createServer(options, function (request, response) {
	response.writeHeader(200, {
		'Access-Control-Allow-Origin': '*',
		"Content-Type": "text/html"
	});
	response.write(html);
	response.end();
});
var io = require('socket.io')(server);
server.listen(8443);
var request = require('request');
var fs = require('fs');
var md5 = require('md5');
var sha256 = require('sha256');
var math = require('mathjs');
var config = require('./config.json');
var logger = log4js.getLogger();
var crypto = require('crypto');

updateLog();
function updateLog() {
	logger.debug('New log...');

	log4js.configure({
		appenders: {
			out: { type: 'console' },
			app: { type: 'file', filename: 'logs/site/site_' + time() + '.log' }
		},
		categories: {
			default: { appenders: ['out', 'app'], level: 'all' }
		}
	});
	setTimeout(function () {
		updateLog();
	}, 24 * 3600 * 1000);
}

var pool = mysql.createPool({
	database: config.database["database"],
	host: config.database["host"],
	user: config.database["user"],
	password: config.database["password"]
});


process.on('uncaughtException', function (err) {
	logger.trace('Strange error');
	logger.debug(err);
});



//FOR ALL GAMES
var canPlayersBet = 1;
var amountGiveaway = 100;

var maxbet = config.optionsSite["maxbet"];
var minbet = config.optionsSite["minbet"];

var needLevelToSendCoins = config.optionsSite["needLevelToSendCoins"]; //For send coins
var delayLoadPrices = config.optionsSite["delayLoadPrices"] //in Hours
var xpPerLevel = config.optionsSite["xpPerLevel"];

var groupId = config.optionsSite["groupId"];
var coinGroupR = config.optionsSite["coinGroupR"];
var coinNameR = config.optionsSite["coinNameR"];
var coinCodeR = config.optionsSite["coinCodeR"];
var coinFriendR = config.optionsSite["coinFriendR"];
var AppID = config.optionsSite["AppID"];
var ApiKey = config.optionsSite["ApiKey"];

var nameForGame = config.optionsSite["nameForGame"];
var nameSite = config.optionsSite["nameSite"];

var timeGiveaway = config.optionsSite["timeGiveaway"]; //hours

var timeJPot = config.optionsSite["timeJPot"];	//time wait round

var timerRoulette = config.optionsSite["timerRoulette"]; //seconds

var maxCoinflips = config.optionsSite["maxCoinflips"]; //per user

var waitStartingCrash = config.optionsSite["waitStartingCrash"]; //seconds


/* CONNECT TO SOCKET */
io.on('connection', function (socket) {
	var user = false;
	socket.on('hash', function (hash) {
		query('SELECT `steamid`, `rank`, `balance`, `name`, `avatar`, `banPlay` FROM `users` WHERE `hash` = ' + pool.escape(hash), function (err, row) {
			if ((err) || (!row.length)) {
				return socket.disconnect();
			} else {
				user = row[0];
				users[user.steamid] = {
					socket: socket.id,
					balance: parseInt(user.balance)
				}
				socket.join(user.steamid);
				timesFlooding[user.steamid] = 0;

				//100 ROLLS ROULETTE
				socket.emit('message', {
					type: '100rolls',
					rolls: historyRolls100
				});


				//FIRST DATES
				var sendRHash;
				if (roundedHash == null) {
					sendRHash = '0';
				} else {
					sendRHash = roundedHash;
				}

				socket.emit('message', {
					type: 'hello',
					count: timer - wait,
					maxbet: maxbet,
					minbet: minbet,
					roundedHash: sendRHash,
					rolls: historyRolls,
					balance: user.balance,
					rank: user.rank,
					user: user.steamid
				});

				//ROULETTE
				if (currentBets.length > 0) {
					currentBets.forEach(function (itm) {
						socket.emit('message', {
							type: 'bet',
							bet: {
								amount: itm.amount,
								betid: itm.betid,
								icon: itm.icon,
								lower: itm.lower,
								upper: itm.upper,
								name: itm.name,
								user: itm.user,
								level: itm.level,
								won: null
							},
							sums: {
								0: currentSums['0-0'],
								1: currentSums['1-7'],
								2: currentSums['8-14']
							}
						});
					});
				}

				//MESSAGES
				if (msgChatHist.length > 0) {
					msgChatHist.forEach(function (itm) {
						socket.emit('message', {
							type: 'chat',
							msg: itm.msg,
							name: itm.name,
							icon: itm.icon,
							user: itm.user,
							rank: itm.rank,
							lang: itm.lang,
							hide: itm.hide,
							level: itm.level,
							id: itm.id,
							time: itm.time
						});
					});
				}

				//USERS ONLINE
				io.sockets.emit('message', {
					type: 'logins',
					count: Object.size(io.sockets.connected)
				});

				//CRASH
				if (crashState == 'STARTED') {
					socket.emit('message', {
						type: 'startedCrash',
						elapsed: new Date().getTime() - startCrashTime
					});

					if (betsCrash.length > 0) {
						betsCrash.forEach(function (bet) {
							socket.emit('message', {
								type: 'crbet',
								bet: {
									id: bet.id,
									amount: bet.amount,
									icon: bet.icon,
									name: bet.name,
									level: bet.level
								}
							});

							if (usersCrash[bet.user] !== undefined) {
								if (usersCrash[bet.user]['cashedOut'] == true) {
									io.sockets.emit('message', {
										type: 'betCrashWin',
										id: bet.id,
										cashout: usersCrash[bet.user]['autoCashout'],
										profit: usersCrash[bet.user]['profit']
									});
								}
							}
						});
					}
				} else if (crashState == 'ENDED') {
					socket.emit('message', {
						type: 'crashed',
						number: crashAt,
						time: endedCrashTime
					});
				}

				if (usersCrash[user.steamid] !== undefined) {
					var win = usersCrash[user.steamid]['amount'] + usersCrash[user.steamid]['profit'];
					socket.emit('message', {
						type: 'btnCrashWin',
						amount: win
					});
				}


				//MINES
				if (gamesMines[user.steamid] !== undefined && !gamesMines[user.steamid]['lose'] && !gamesMines[user.steamid]['cashout'] && gamesMines[user.steamid]['bombsWin'].length > 0) {
					var xSum = 0;
					gamesMines[user.steamid]['bombsWin'].forEach(function (itm) {
						socket.emit('message', {
							type: 'getBomb',
							mtype: 'win',
							buttons: itm,
							stake: gamesMines[user.steamid]['amountWin'],
							next: gamesMines[user.steamid]['sums'][gamesMines[user.steamid]['bombsWin'].length],
							amount: gamesMines[user.steamid]['sums'][xSum],
							new: false
						});
						xSum++;
					});
				}


				//GIVEAWAY
				if (usersEntered.length > 0) {
					usersEntered.forEach(function (itm) {
						socket.emit('message', {
							type: 'joinGiveaway',
							player: {
								avatar: itm.avatar,
								steamid: itm.user,
								name: itm.name
							}
						});
					});
				}

				socket.emit('message', {
					type: 'timerGiveaway',
					mod: 'timer',
					time: timerGAWAY,
					last: lastWinnerGiveaway
				});
				socket.emit('message', {
					type: 'amountGiveaway',
					amount: amountGiveaway
				});

				//JACKPOT
				if ((usersJPot[user.steamid] !== undefined) && (usersJPot[user.steamid] >= 1)) {
					var change = parseFloat(100 * amountJPot[user.steamid] / totalJPot).toFixed(2);

					socket.emit('message', {
						type: 'addChangeJPot',
						change: change
					});
				}
				if (betsJPot.length > 0) {
					betsJPot.forEach(function (itm) {
						socket.emit('message', {
							type: 'addBetJPot',
							bet: {
								user: itm.user,
								avatar: itm.avatar,
								name: itm.name,
								amount: itm.amount,
								tick1: itm.tick1,
								tick2: itm.tick2
							},
							total: totalJPot
						});
					});
				}

				socket.emit('message', {
					type: 'lastWinnerJP',
					last: lastWinnerJP
				});
			}
		});
	});
	socket.on('mes', function (m) {
		if (!user) return;

		if (users[user.steamid] === undefined) return;

		if (canPlayersBet == 0) {
			socket.emit('message', {
				type: 'error',
				enable: false,
				error: 'Error: The server are now offline. Please try again later!'
			});
			return;
		}

		if (user.banPlay == 1) {
			socket.emit('message', {
				type: 'error',
				enable: false,
				error: 'Error: You are banned to playing!'
			});
			return;
		}

		logger.debug(user.name + " (" + user.steamid + ")");
		logger.debug(m);

		if (user.rank != 100) { //OWNER
			if (last_message[user.steamid] + 1 >= time()) {
				timesFlooding[user.steamid] += 1;
				if (timesFlooding[user.steamid] == 3) {
					delete timesFlooding[user.steamid];
					logger.debug('<< New Flood from ' + user.steamid + ' >>');
					socket.emit('message', {
						type: 'error',
						enable: false,
						error: 'Disconnected!'
					});
					return socket.disconnect();
				}
				socket.emit('message', {
					type: 'error',
					enable: false,
					error: 'Too fast!'
				});
				return;
			} else {
				last_message[user.steamid] = time();
			}
		}


		if (m.type == "verifyAcc") return verifyAcc(user, socket);

		if (m.type == "availableR") return availableR(m, user, socket);
		if (m.type == "groupR") return groupR(m, user, socket);
		if (m.type == "nameR") return nameR(m, user, socket);
		if (m.type == "codeR") return codeR(m, user, socket);
		if (m.type == "bonusR") return bonusR(m, user, socket);
		if (m.type == "createR") return createR(m, user, socket);

		if (m.type == "createBonus") return createBonus(m, user, socket);

		if (m.type == "tradeurl") return saveTradelink(m, user, socket);

		if (m.type == "joinJackpot") return joinJackpot(m, user, socket);

		if (m.type == "joinInG") return joinInGiveaway(user, socket);

		if (m.type == "mines") {
			if (m.mtype == 'play') {
				return playMines(m, user, socket);
			} else if (m.mtype == 'cashout') {
				return cashoutMines(user, socket);
			} else if (m.mtype == 'getBomb') {
				return getBombMines(m, user, socket);
			}
		}

		if (m.type == "crbet") {
			if (m.mtype == 'joinCrash') {
				return crashBet(m, user, socket);
			} else if (m.mtype == 'withdraw') {
				return crashCashout(m, user, socket);
			}
		}

		if (m.type == "bet") return setBet(m, user, socket);

		if (m.type == "getMsg") return getMsg(user, socket);
		if (m.type == "balance") return getBalance(user.steamid, socket);
		if (m.type == "chat") return ch(m, user, socket);
		if (m.type == "plus") return plus(user, socket);

		if (m.type == "createcfgame") return createCFGame(m, user, socket);
		if (m.type == "joincfgame") return joinCFGame(m, user, socket);
		if (m.type == "watchcfgame") return watchCFGame(m, user, socket);
	});

	socket.on('disconnect', function () {
		io.sockets.emit('message', {
			type: 'logins',
			count: Object.size(io.sockets.connected)
		});

		delete users[user.steamid];
		socket.leave(user.steamid);
	});
});
/* END CONNECT TO SOCKET */
/* CHAT */
var msgChatHist = [];
var msgCurently = 0;
var last_message = {};
var timesFlooding = {};

function getMsg(user, socket) {
	socket.emit('message', {
		type: 'chatEmpty'
	});
	if (msgChatHist.length > 0) {
		msgChatHist.forEach(function (itm) {
			socket.emit('message', {
				type: 'chat',
				msg: itm.msg,
				name: itm.name,
				icon: itm.icon,
				user: itm.user,
				rank: itm.rank,
				lang: itm.lang,
				hide: itm.hide,
				level: itm.level,
				id: itm.id,
				time: itm.time
			});
		});
	}
}
function ch(m, user, socket) {
	if (m.msg) {
		query('SELECT `bets`, `balance`, `rank`, `mute` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err, row) {
			if ((err) || (!row.length)) {
				logger.error('Failed to get the person in the database');
				logger.debug(err);
				socket.emit('message', {
					type: 'error',
					enable: false,
					error: 'Error: User not in DB!'
				});
				return;
			}

			var n = parseFloat(row[0].bets % Math.pow(10, 3));
			var xx = ((parseInt((row[0].bets - n) / xpPerLevel)) * xpPerLevel);
			var levelA = xx / xpPerLevel;

			var res = null;
			if (res = /^\/send ([0-9]*) ([0-9]*)/.exec(m.msg)) {
				logger.trace('We need to send coins from ' + res[2] + ' to ' + res[1]);

				if (res[1] == user.steamid) {
					socket.emit('message', {
						type: 'error',
						enable: false,
						error: 'Error: You can\'t send coins to yourself!'
					});
					return;
				}
				if (levelA < needLevelToSendCoins) {
					socket.emit('message', {
						type: 'error',
						enable: false,
						error: 'Error: You need to have level ' + needLevelToSendCoins + ' to send coins!'
					});
					return;
				}
				if (row[0].rank == 8 || row[0].rank == 5) {
					// YOUTUBER OR STREAMER
					socket.emit('message', {
						type: 'error',
						enable: false,
						error: 'Error: You dont have permission to send coins because you have test coins!'
					});
					return;
				}
				if (row[0].balance < res[2]) {
					socket.emit('message', {
						type: 'error',
						enable: false,
						error: 'Error: Insufficient funds!'
					});
					return;
				}
				if (res[2] < minbet || res[2] > maxbet) {
					socket.emit('message', {
						type: 'error',
						enable: false,
						error: 'Error: Invalid bet amount [' + minbet + '-' + maxbet + ']!'
					});
					return;
				}
				query('SELECT `name` FROM `users` WHERE `steamid` = ' + pool.escape(res[1]), function (err2, row2) {
					if ((err2) || (!row2.length)) {
						logger.error('Failed to get the STEAMID');
						logger.debug(err2);
						socket.emit('message', {
							type: 'error',
							enable: false,
							error: 'Error: Unknown receiver!'
						});
						return;
					}
					query('UPDATE `users` SET `balance` = `balance` - ' + res[2] + ' WHERE `steamid` = ' + pool.escape(user.steamid));
					query('UPDATE `users` SET `balance` = `balance` + ' + res[2] + ' WHERE `steamid` = ' + pool.escape(res[1]));
					query('INSERT INTO `transfers` SET `from1` = ' + pool.escape(user.steamid) + ', `to1` = ' + pool.escape(res[1]) + ', `amount` = ' + pool.escape(res[2]) + ', `time` = ' + pool.escape(time()));
					socket.emit('message', {
						type: 'alert',
						alert: 'You sent ' + res[2] + ' coins to ' + row2[0].name + '.'
					});
					getBalance(user.steamid, socket);

					io.sockets.in(res[1]).emit('message', {
						type: 'refBalanceSend',
						amount: res[2]
					});
					io.sockets.in(res[1]).emit('message', {
						type: 'alert',
						alert: 'You received ' + res[2] + ' coins from ' + user.name + '!'
					});
				});
			} else if (res = /^\/ban ([0-9]*) ([a-zA-Z0-9]*)/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 100) { //ADMIN && OWNER
					query('UPDATE `users` SET `banPlay` = 1, `reasonBanPlay` = ' + pool.escape(res[2]) + ' WHERE `steamid` = ' + pool.escape(res[1]));
					socket.emit('message', {
						type: 'alert',
						alert: user.name + ' banned ' + res[1] + ' for ' + res[2] + '!'
					});
					io.sockets.in(res[1]).emit('message', {
						type: 'alert',
						alert: 'You have banned for ' + res[2] + '!'
					});
					io.sockets.in(res[1]).emit('message', {
						type: 'refreshPage'
					});
				}
			} else if (res = /^\/mute ([0-9]*) ([0-9]*)/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 2 || user.rank == 100) { //ADMIN && OWNER && MODERATOR
					var t = time();
					query('UPDATE `users` SET `mute` = ' + parseInt(time() + res[2]) + ' WHERE `steamid` = ' + pool.escape(res[1]));
					socket.emit('message', {
						type: 'alert',
						alert: 'You mute ' + res[1] + ' to ' + res[2]
					});

					io.sockets.in(res[1]).emit('message', {
						type: 'alert',
						alert: 'You have muted for ' + res[2] + ' seconds!'
					});
				}
				//CHAT
			} else if (res = /^\/deletemsg ([0-9]*)/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 2 || user.rank == 100) { //ADMIN && OWNER && MODERATOR
					if (res[1] && res[1] <= msgCurently) {
						delete msgChatHist[res[1]];
						socket.emit('message', {
							type: 'alert',
							alert: 'Message deleted!'
						});
						io.sockets.emit('message', {
							type: 'deleteMsg',
							id: res[1]
						});
					} else {
						socket.emit('message', {
							type: 'error',
							enable: false,
							error: 'Error: You are inserted an incorrect id!'
						});
						return;
					}
				}
			} else if (res = /^\/clearchat/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 2 || user.rank == 100) { //ADMIN && OWNER && MODERATOR
					if (msgCurently > 0) {
						msgChatHist = [];
						socket.emit('message', {
							type: 'alert',
							alert: 'Chat cleared!'
						});
						io.sockets.emit('message', {
							type: 'deleteAllMsg',
							rank: user.rank
						});
						msgCurently = 0;
					} else {
						socket.emit('message', {
							type: 'error',
							enable: false,
							error: 'Error: There are no messages!'
						});
						return;
					}
				}
				//GIVEAWAY
			} else if (res = /^\/pickwinner/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 100) { //ADMIN && OWNER
					timerGAWAY = 0;
					socket.emit('message', {
						type: 'alert',
						alert: 'Giveaway picking'
					});
				}
			} else if (res = /^\/amountg ([0-9.]*)/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 100) { //ADMIN && OWNER
					if (res[1] > 0) {
						amountGiveaway = res[1];
						io.sockets.emit('message', {
							type: 'amountGiveaway',
							amount: amountGiveaway
						});
						socket.emit('message', {
							type: 'alert',
							alert: 'Amount giveaway setted to ' + amountGiveaway
						});
					} else {
						socket.emit('message', {
							type: 'error',
							enable: false,
							error: 'Error: Amount need be > 0!'
						});
						return;
					}
				}
				//CRASH
			} else if (res = /^\/nextcrash ([0-9.]*)/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 100) { //ADMIN && OWNER
					riggedMode = true;
					riggedValue = parseInt(res[1] * 100);

					socket.emit('message', {
						type: 'alert',
						alert: 'Next crash set: ' + (riggedValue / 100).toFixed(2) + 'x [Good luck !]'
					});
				}
			} else if (res = /^\/crashnow/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 100) { //ADMIN && OWNER
					if (crashState == 'STARTED') {
						crashAt = pointCrash * 100;

						socket.emit('message', {
							type: 'alert',
							alert: 'Crashed now, successfully!'
						});
					} else {
						socket.emit('message', {
							type: 'error',
							error: 'Error: The game needs to be started!'
						});
						return;
					}
				}
				//BETS FOR ALL
			} else if (res = /^\/stopbets/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 100) { //ADMIN && OWNER
					canPlayersBet = 0;
					io.sockets.emit('message', {
						type: 'alert',
						alert: 'The bets are now offline'
					});
				}
			} else if (res = /^\/startbets/.exec(m.msg)) {
				if (user.rank == 1 || user.rank == 100) { //ADMIN && OWNER
					canPlayersBet = 1;
					io.sockets.emit('message', {
						type: 'alert',
						alert: 'The bets are now online.'
					});
				}
				//MESSAGE
			} else {
				if (row[0].mute > time()) {
					socket.emit('message', {
						type: 'alert',
						alert: 'You are muted for ' + parseInt((row[0].mute - time()) / 3600) + ' hours'
					});
					return;
				}

				var timeMsgH = new Date().getHours();
				if (timeMsgH < 10) timeMsgH = '0'.concat(timeMsgH);
				var timeMsgM = new Date().getMinutes();
				if (timeMsgM < 10) timeMsgM = '0'.concat(timeMsgM);
				var timeMsg = timeMsgH + ":" + timeMsgM;

				io.sockets.emit('message', {
					type: 'chat',
					msg: safe_tags_replace(m.msg),
					name: user.name,
					icon: user.avatar,
					user: user.steamid,
					rank: user.rank,
					lang: m.lang,
					hide: m.hide,
					level: levelA,
					id: msgCurently,
					time: timeMsg
				});

				if (msgChatHist.length > 30) {
					msgChatHist.shift();
				}

				msgChatHist.push({
					msg: safe_tags_replace(m.msg),
					name: user.name,
					icon: user.avatar,
					user: user.steamid,
					rank: user.rank,
					lang: m.lang,
					hide: m.hide,
					level: levelA,
					id: msgCurently,
					time: timeMsg
				});
				msgCurently++;
			}
		});
	}
}
/* END CHAT */
/* REFRESH BALANCE */
function getBalance(steamid, socket) {
	query('SELECT `balance` FROM `users` WHERE `steamid` = ' + pool.escape(steamid), function (err, row) {
		if ((err) || (!row.length)) {
			logger.error('Failed to load your balance');
			logger.debug(err);
			socket.emit('message', {
				type: 'error',
				enable: false,
				error: 'Error: You are not DB!'
			});
			return;
		}
		socket.emit('message', {
			type: 'balance',
			balance: row[0].balance
		});
		users[steamid].balance = parseInt(row[0].balance);
	});
}
/* END REFRESH BALANCE */
/* TRADE LINK */
function saveTradelink(m, user, socket) {
	if (!m.url) {
		socket.emit('message', {
			type: 'error',
			mtype: 'tradeLink',
			enable: true,
			error: 'Error: Tradelink cannot be empty!'
		});
		return;
	}

	if (m.url.includes('https://trade.opskins.com/t/') == false) {
		socket.emit('message', {
			type: 'error',
			mtype: 'tradeLink',
			enable: true,
			error: 'Error: Tradelink is invalid!'
		});
		return;
	}

	query('UPDATE `users` SET `tradeLink` = ' + pool.escape(m.url) + ' WHERE `steamid`=' + pool.escape(user.steamid), function (err, row) {
		if (err) {
			logger.error(err);
			return;
		}
	});

	socket.emit('message', {
		type: 'alert',
		alert: 'Tradelink saved!'
	});
}
/* END TRADE LINK */
/* REWARDS */

function availableR(m, user, socket) {
	request('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=' + ApiKey + '&steamid=' + user.steamid + '&format=json', function (err1, response1) {
		if (err1) {
			logger.error(err1);
			return;
		}

		var csgo = true;
		var res = JSON.parse(response1.body);
		var games = res.response.games;

		if (games !== undefined) {
			games.forEach(function (game) {
				if (game.appid == AppID) csgo = true;
			});
		}


		query('SELECT `code` FROM `codes` WHERE `user` = ' + pool.escape(user.steamid), function (err2, code) {
			if (err2) {
				socket.emit('message', {
					type: 'error',
					mtype: 'rewards',
					ptype: m.type,
					enable: true,
					error: 'Error: You don\'t have a code to collect the coins!'
				});
				return;
			}

			query('SELECT `referrals` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err3, coins) {
				if (err3) {
					logger.error(err3);
					return;
				}

				if (coins[0].referrals == 0) {
					socket.emit('message', {
						type: 'error',
						mtype: 'rewards',
						ptype: m.type,
						enable: true,
						error: 'Error: You do not have a coin to collect!'
					});
					return;
				}

				if (coins[0].referrals > 0) {
					query('UPDATE `users` SET `balance` = `balance` + ' + parseInt(coins[0].referrals) + ', `referrals` = 0 WHERE `steamid`=' + pool.escape(user.steamid), function (err4, row) {
						if (err4) {
							logger.error(err4);
							return;
						}

						getBalance(user.steamid, socket);
						socket.emit('message', {
							type: 'alert',
							alert: 'You collected ' + coins[0].referrals + ' coins!'
						});

						socket.emit('message', {
							type: 'refRewards'
						});
					});
					return;
				}
			});
		});
	});
}

function groupR(m, user, socket) {
	query('SELECT `groupR` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err1, row1) {
		if (err1) {
			logger.error(err1);
			return;
		}

		if (parseInt(row1[0].nameR)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'rewards',
				ptype: m.type,
				enable: true,
				error: 'Error: You already collect the reward!'
			});
			return;
		}

		request('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=' + ApiKey + '&steamid=' + user.steamid + '&format=json', function (err2, response2) {
			if (err2) {
				logger.error(err2);
				return;
			}

			var csgo = true;
			var res = JSON.parse(response2.body);
			var games = res.response.games;

			if (games !== undefined) {
				games.forEach(function (game) {
					if (game.appid == AppID) csgo = true;
				});
			}


			request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + ApiKey + '&steamids=' + user.steamid, function (err3, response3) {
				if (err3) {
					logger.error(err3);
					return;
				}

				var res = JSON.parse(response3.body);
				var idGroup = res.response.players[0].primaryclanid;

				if (idGroup != groupId) {
					socket.emit('message', {
						type: 'error',
						mtype: 'rewards',
						ptype: m.type,
						enable: true,
						error: 'Error: Please join to ' + nameSite + ' Group and set primary group!'
					});
					return;
				}

				query('UPDATE `users` SET `balance` = `balance` + ' + parseInt(coinGroupR) + ', `groupR` = 1 WHERE `steamid`=' + pool.escape(user.steamid), function (err4, row4) {
					if (err4) {
						logger.error(err4);
						return;
					}

					getBalance(user.steamid, socket);
					socket.emit('message', {
						type: 'alert',
						alert: 'You claimed ' + coinGroupR + ' coins!'
					});

					socket.emit('message', {
						type: 'refRewards'
					});
				});
			});
		});
	});
}

function nameR(m, user, socket) {
	query('SELECT `nameR` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err1, row1) {
		if (err1) {
			logger.error(err1);
			return;
		}

		if (parseInt(row1[0].nameR)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'rewards',
				ptype: m.type,
				enable: true,
				error: 'Error: You already collect the reward!'
			});
			return;
		}

		request('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=' + ApiKey + '&steamid=' + user.steamid + '&format=json', function (err2, response2) {
			if (err2) {
				logger.error(err2);
				return;
			}

			var csgo = true;
			var res = JSON.parse(response2.body);
			var games = res.response.games;

			if (games !== undefined) {
				games.forEach(function (game) {
					if (game.appid == AppID) csgo = true;
				});
			}


			request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + ApiKey + '&steamids=' + user.steamid, function (err3, response3) {
				if (err3) {
					logger.error(err3);
					return;
				}

				var res = JSON.parse(response3.body);
				var name = res.response.players[0].personaname;

				if (!/PUBGSponsio.com/.exec(name)) {
					socket.emit('message', {
						type: 'error',
						mtype: 'rewards',
						ptype: m.type,
						enable: true,
						error: 'Error: Please add ' + nameSite + ' to your Steam name!'
					});
					return;
				}

				query('UPDATE `users` SET `balance` = `balance` + ' + parseInt(coinNameR) + ', `nameR` = 1 WHERE `steamid`=' + pool.escape(user.steamid), function (err4, row4) {
					if (err4) {
						logger.error(err4);
						return;
					}

					getBalance(user.steamid, socket);
					socket.emit('message', {
						type: 'alert',
						alert: 'You claimed ' + coinNameR + ' coins!'
					});

					socket.emit('message', {
						type: 'refRewards'
					});
				});
			});
		});
	});
}

function codeR(m, user, socket) {
	query('SELECT `codeR` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err1, row1) {
		if (err1) {
			logger.error(err1);
			return;
		}

		if (parseInt(row1[0].codeR)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'rewards',
				ptype: m.type,
				enable: true,
				error: 'Error: You already collect the reward!'
			});
			return;
		}

		request('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=' + ApiKey + '&steamid=' + user.steamid + '&format=json', function (err2, response) {
			if (err2) {
				logger.error(err2);
				return;
			}

			var csgo = true;
			var res = JSON.parse(response.body);
			var games = res.response.games;

			if (games !== undefined) {
				games.forEach(function (game) {
					if (game.appid == AppID) csgo = true;
				});
			}


			query('SELECT `user` FROM `codes` WHERE `code` = ' + pool.escape(m.code), function (err3, row3) {
				if (!row3[0]) {
					socket.emit('message', {
						type: 'error',
						mtype: 'rewards',
						ptype: m.type,
						enable: true,
						error: 'Error: Code not found!'
					});
					return;
				}

				if (row3[0].user == user.steamid) {
					socket.emit('message', {
						type: 'error',
						mtype: 'rewards',
						ptype: m.type,
						enable: true,
						error: 'Error: This is you referal code!'
					});
					return;
				}

				query('UPDATE `users` SET `balance` = `balance` + ' + parseInt(coinCodeR) + ', `codeR` = ' + pool.escape(row3[0].user) + ' WHERE `steamid` = ' + pool.escape(user.steamid), function (err4, row4) {
					if (err4) {
						logger.error(err4);
						return;
					}

					getBalance(user.steamid, socket);
					socket.emit('message', {
						type: 'alert',
						alert: 'You claimed ' + coinCodeR + ' coins!'
					});

					socket.emit('message', {
						type: 'refRewards'
					});
				});

				query('UPDATE `users` SET `referrals` = `referrals` + ' + parseInt(coinFriendR) + ' WHERE `steamid` = ' + pool.escape(row3[0].user), function (err5, row5) {
					if (err5) {
						logger.error(err5);
						return;
					}
				});
			});
		});
	});
}

function bonusR(m, user, socket) {
	query('SELECT * FROM `bonus` WHERE `steamid` = ' + pool.escape(user.steamid), function (err1, row1) {
		if (err1) {
			logger.error(err1);
			return;
		}

		if (row1[0]) {
			socket.emit('message', {
				type: 'error',
				mtype: 'rewards',
				ptype: m.type,
				enable: true,
				error: 'Error: You already claimed the bonus code!'
			});
			return;
		}

		query('SELECT `max_useds`, `useds`, `amount` FROM `bonus` WHERE `code` = ' + pool.escape(m.code), function (err2, row2) {
			if (!row2[0]) {
				socket.emit('message', {
					type: 'error',
					mtype: 'rewards',
					ptype: m.type,
					enable: true,
					error: 'Error: This code is invalid!'
				});
				return;
			}

			if (row2[0].useds >= row2[0].max_useds) {
				socket.emit('message', {
					type: 'error',
					mtype: 'rewards',
					ptype: m.type,
					enable: true,
					error: 'Error: The code is already maximum used!'
				});
				return;
			}

			request('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=' + ApiKey + '&steamid=' + user.steamid + '&format=json', function (err3, response3) {
				if (err3) {
					logger.error(err3);
					return;
				}

				var csgo = true;
				var res = JSON.parse(response3.body);
				var games = res.response.games;

				if (games !== undefined) {
					games.forEach(function (game) {
						if (game.appid == AppID) csgo = true;
					});
				}


				query('UPDATE `users` SET `balance` = `balance` + ' + parseInt(row2[0].amount) + ' WHERE `steamid`=' + pool.escape(user.steamid), function (err4, row4) {
					if (err4) {
						logger.error(err4);
						return;
					}

					getBalance(user.steamid, socket);
					socket.emit('message', {
						type: 'alert',
						alert: 'You claimed ' + parseInt(row2[0].amount) + ' coins!'
					});

					socket.emit('message', {
						type: 'refRewards'
					});
				});

				query('INSERT INTO `bonus` SET `steamid` = ' + pool.escape(user.steamid), function (err5, row5) {
					if (err5) {
						logger.error(err5);
						return;
					}
				});

				query('UPDATE `bonus` SET `useds` = `useds` + 1 WHERE `code` = ' + pool.escape(m.code), function (err6, row6) {
					if (err6) {
						logger.error(err6);
						return;
					}
				});
			});
		});
	});
}

function createR(m, user, socket) {
	request('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=' + ApiKey + '&steamid=' + user.steamid + '&format=json', function (err1, response) {
		if (err1) {
			logger.error(err1);
			return;
		}

		var csgo = true;
		var res = JSON.parse(response.body);
		var games = res.response.games;

		if (games !== undefined) {
			games.forEach(function (game) {
				if (game.appid == AppID) csgo = true;
			});
		}


		query('SELECT `user` FROM `codes` WHERE `code` = ' + pool.escape(m.code), function (err2, row2) {
			if (row2[0]) {
				socket.emit('message', {
					type: 'error',
					mtype: 'rewards',
					ptype: m.type,
					enable: true,
					error: 'Error: This code is already used!'
				});
				return;
			}

			if (!row2[0]) {
				query('SELECT * FROM `codes` WHERE `user` = ' + pool.escape(user.steamid), function (err3, row3) {
					if (row3[0]) {
						query('UPDATE `codes` SET `code` = ' + pool.escape(m.code) + ' WHERE `user`=' + pool.escape(user.steamid), function (err4, row4) {
							if (err4) {
								logger.error(err4);
								return;
							}

							socket.emit('message', {
								type: 'alert',
								alert: 'Code updated!'
							});

							socket.emit('message', {
								type: 'refRewards'
							});
						});
						return;
					}

					if (!row3[0]) {
						query('INSERT INTO `codes` SET `user` = ' + pool.escape(user.steamid) + ', `code` = ' + pool.escape(m.code), function (err4, row4) {
							if (err4) {
								logger.error(err4);
								return;
							}

							socket.emit('message', {
								type: 'alert',
								alert: 'Code created!'
							});
						});
						return;
					}
				});
			}
		});
	});
}

function createBonus(m, user, socket) {
	if (user.rank != 1 && user.rank != 2 && user.rank != 100) {
		socket.emit('message', {
			type: 'error',
			enable: false,
			error: 'Error: You don\'t have permission to use that!'
		});
		return;
	}

	if (!(/(^[0-9]*$)/.exec(m.amount))) {
		socket.emit('message', {
			type: 'error',
			enable: false,
			error: 'Error: Invalid amount!'
		});
		return;
	}

	if (!(/(^[0-9]*$)/.exec(m.maxuseds))) {
		socket.emit('message', {
			type: 'error',
			enable: false,
			error: 'Error: Invalid maximum users!'
		});
		return;
	}

	if (!(/(^[a-zA-Z0-9]*$)/.exec(m.code))) {
		socket.emit('message', {
			type: 'error',
			enable: false,
			error: 'Error: Invalid code!'
		});
		return;
	}

	query('SELECT * FROM `bonus` WHERE `code` = ' + pool.escape(m.code), function (err1, row1) {
		if (row1.length != 0) {
			socket.emit('message', {
				type: 'error',
				enable: false,
				error: 'Error: Code already exists!'
			});
			return;
		}

		query('TRUNCATE table `bonus`', function () {
			query('INSERT INTO `bonus` SET `code` = ' + pool.escape(m.code) + ', `amount` = ' + parseInt(m.amount) + ', `max_useds` = ' + parseInt(m.maxuseds) + ', `useds` = 0', function (err2, row2) {
				if (err2) {
					logger.error(err2);
					return;
				}

				socket.emit('message', {
					type: 'alert',
					alert: 'Code created!'
				});
			});
		});
	});
}
/* END REWARDS */
/* VERIFY ACC */
function verifyAcc(user, socket) {
	request('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=' + ApiKey + '&steamid=' + user.steamid + '&format=json', function (err1, response) {
		if (err1) {
			logger.error(err1);
			return;
		}

		var csgo = true;
		var res = JSON.parse(response.body);
		var games = res.response.games;

		if (games !== undefined) {
			games.forEach(function (game) {
				if (game.appid == AppID) csgo = true;
			});
			if (csgo === false) {
				socket.emit('message', {
					type: 'alert',
					alert: 'Error: you dont own ' + nameForGame + '!'
				});
			}
		} else {
			socket.emit('message', {
				type: 'alert',
				alert: 'Error: no games found!'
			});
		}


		query('SELECT `verified` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err2, row2) {
			if (row2[0].verified == 1) {
				socket.emit('message', {
					type: 'error',
					mtype: 'account',
					enable: true,
					error: 'Error: Your account is already verified!'
				});
				return;
			}

			query('UPDATE `users` SET `verified` = 1 WHERE `steamid` = ' + pool.escape(user.steamid), function (err3, row3) {
				if (err3) {
					logger.error(err3);
					return;
				}

				socket.emit('message', {
					type: 'alert',
					alert: 'Account successfully verified!'
				});

				socket.emit('message', {
					type: 'refAccount'
				});
			});
		});
	});
}
/* END VERIFY ACC */











/* -------------- GAMES --------------*/





// CRASH
var userCrash = {};
var betsCrash = [];

var riggedmode = false;
var riggedValue;

var crashState = 'ENDED';

var crasAr = 0;
var pointCrash = 0;

var hashCodeCrash = '';
var secretCodeHash = '';
var loteryCodeHash = '';

var timerIntCrash;
var startCrashTime = 0;
var endedCrashTime = 0;

hashCrash();

function crashBet(m, user, socket) {
	if (userCrash[user.steamid] !== undefined && usersCrash[user.steamid]['play']) {
		socket.emit('message', {
			type: 'error',
			mtype: 'crash',
			enable: 'true',
			error: 'Error: You have alredy joined the crash!'
		});
		return;
	}
	if (!(/(^[0-9.]*$)/.exec(m.autoCrash))) {
		socket.emit('message'), {
			type: 'error',
			mtype: 'crash',
			enable: 'true',
			error: 'Error: Cashout needs to be more than 1.00x!'
		});
		logger.warn(user.steamid + ' try to cheating to CRASH CASHOUT_AMOUNT');
		return;
	}
	if ((m.amount < winbet || (m.amount) > maxbet)) {
		socket.emit('message', {
			type: 'error',
			mtype: 'crash',
			enable: 'true',
			error: 'Error: Invalid bet amount [' + minbet + '-' + maxbet + ']!'
		});
		return;
	}
	if (/(a|b|c|d|e|f|g|h|i|j|k|l|m|n|ñ|o|p|q|r|s|t|u|w|y|z)/.exec(m.amount)) {
		socket.emit('message', {
			type: 'error',
			mtype: 'crash',
			enable: 'true',
			error: 'Error: Invalid bet amount!'

		});
		logger.warn(user.steamid + ' try to cheating to CRASH BET_AMOUNT');
		return;
	}
	if (crashState != 'STARTING') {
		socket.emit('message', {
			type: 'error',
			mtype: 'crash',
			enable: 'true',
			error: 'Error: The game have been alredy started!'
		});
		return;
	}
	var start_time = new Data();
	query('SELECT balance, countDeposits, bet FROM users WHERE steamid = +'
		+ pool.escape(user.steamid), function (err, row) {
			if ((err) || (!row.length)) {
				logger.error('Failed to find DB');
				logger.debug(err);
				socket.emit('message', {
					type: 'error',
					mtype: 'crash',
					enable: 'true',
					error: 'Error: You are not on the DB'
				});
				return;
			}
		})
	var n = parseFloar(row[0].bets % Math.pow(10, 3));
	var xx = ((parseInt((row[0].bets - n) / xpPerLevel)) * cpPerLevel;
	var levelA = xx/xpPerLevel;

	if(row[0].balance >= m.amount) {
		query('UPDATE users SET balance = balance - '+parseInt(m.amount)














	/* JACKPOT */
	var usersJPot = {};
	var amountJPot = {};
	var betsJPot = [];
	var totalJPot = 0;
	var btJPot = 5;
	var currentlyTick = 0;

	var widthJPot = 100; //do not modify
	var stageJPot = 'WAIT';

	var jackpotId = 0;
	var lastWinnerJP = { name: 'None', steamid: 0, avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg', chance: 0, coins: 0 };

	function getAvatarsWin(avatar, bets, tickets) {
		var array = [];
		var totalAvatars = 100;

		for (var i = 0; i < totalAvatars; i++) {
			var randomAvatar = getRandomInt(1, tickets);

			var avatarA;

			if (bets.length > 0) {
				bets.forEach(function (itm) {
					if ((randomAvatar >= itm.tick1) && (randomAvatar <= itm.tick2)) {
						avatarA = itm.avatar;
					}
				});
			}

			array.push(avatarA);
		}
		array[95] = avatar;

		return array;
	}

	function joinJackpot(m, user, socket) {
		if (stageJPot == 'PICKING') {
			socket.emit('message', {
				type: 'error',
				mtype: 'jackpot',
				enable: true,
				error: 'Error: Wait for preparing a new round!'
			});
			return;
		}

		if ((usersJPot[user.steamid] !== undefined) && (usersJPot[user.steamid] == btJPot)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'jackpot',
				enable: true,
				error: 'Error: You\'ve already entered in this jackpot for ' + btJPot + ' times!'
			});
			return;
		}

		if ((m.amount < minbet) || (m.amount > maxbet)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'jackpot',
				enable: true,
				error: 'Error: Invalid bet amount [' + minbet + '-' + maxbet + ']!'
			});
			return;
		}

		if (/(a|b|c|d|e|f|g|h|j|i|k|l|m|n|o|p|q|r|s|t|v|u|w|x|y|z)/.exec(m.amount)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'jackpot',
				enable: true,
				error: 'Error: Invalid bet amount!'
			});
			logger.warn(user.steamid + ' try to cheating to JACKPOT BET_AMOUNT');
			return;
		}

		var start_time = new Date();
		query('SELECT `balance`, `countDeposits` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err, row) {
			if ((err) || (!row.length)) {
				logger.error('Failed to find DB');
				logger.debug(err);
				socket.emit('message', {
					type: 'error',
					mtype: 'jackpot',
					enable: true,
					error: 'Error: You are not DB!'
				});
				return;
			}

			if (row[0].balance >= m.amount) {
				query('UPDATE `users` SET `balance` = `balance` - ' + parseInt(m.amount) + ' WHERE `steamid` = ' + pool.escape(user.steamid), function (err2, row2) {
					if (err2) {
						logger.error('Error in withdraw');
						logger.debug(err2);
						socket.emit('message', {
							type: 'error',
							mtype: 'jackpot',
							enable: true,
							error: 'Error: You dont have enough points!'
						});
						return;
					}

					if (row[0].countDeposits >= 1) query('UPDATE `users` SET `available` = `available` + ' + parseInt(m.amount / 1.3) + ', `bets` = `bets` + ' + parseInt(m.amount) + ' WHERE `steamid` = ' + pool.escape(user.steamid));

					if (usersJPot[user.steamid] === undefined) {
						usersJPot[user.steamid] = 1;
						amountJPot[user.steamid] = m.amount;
					} else {
						usersJPot[user.steamid]++;
						amountJPot[user.steamid] += m.amount;
					}

					totalJPot += m.amount;

					betsJPot.push({
						user: user.steamid,
						avatar: user.avatar,
						name: user.name,
						amount: m.amount,
						tick1: (currentlyTick + 1),
						tick2: (parseInt(m.amount / 10) + currentlyTick)
					});

					if (betsJPot.length > 0) {
						betsJPot.forEach(function (itm) {
							var change = parseFloat(100 * amountJPot[itm.user] / totalJPot).toFixed(2);

							io.sockets.in(itm.user).emit('message', {
								type: 'addChangeJPot',
								change: change
							});
						});
					}

					socket.emit('message', {
						type: 'betConfJPot',
						amount: m.amount,
						br: usersJPot[user.steamid],
						tbr: btJPot
					});

					io.sockets.emit('message', {
						type: 'addBetJPot',
						bet: {
							user: user.steamid,
							avatar: user.avatar,
							name: user.name,
							amount: m.amount,
							tick1: (currentlyTick + 1),
							tick2: (parseInt(m.amount / 10) + currentlyTick)
						},
						total: totalJPot
					});

					currentlyTick = currentlyTick + parseInt(m.amount / 10);
					startJPot();

					logger.debug('Jackpot Bet confirmed Amount: ' + m.amount + ' | User: ' + pool.escape(user.steamid));

					getBalance(user.steamid, socket);
				});
			} else {
				socket.emit('message', {
					type: 'error',
					mtype: 'jackpot',
					enable: true,
					error: 'Error: You dont have any money!'
				});
			}
		});
	}

	var minusWJPot = (widthJPot / timeJPot).toFixed(2);

	function startJPot() {
		if (betsJPot.length >= 2 && Object.keys(usersJPot).length > 1) {
			if (stageJPot == 'WAIT') {
				stageJPot = 'STARTED';
				var timerJPot = timeJPot;

				var intJPot = setInterval(function () {
					if (timerJPot >= 0) {
						io.sockets.emit('message', {
							type: 'setTimesJPot',
							text: timerJPot + 's',
							start: true,
							width: widthJPot
						});

						widthJPot -= minusWJPot;
						timerJPot--;
					} else {
						clearInterval(intJPot);
						stageJPot = 'PICKING';

						io.sockets.emit('message', {
							type: 'setTimesJPot',
							text: 'Picking winner!',
							start: false
						});

						setTimeout(function () {
							pickingWinnerJPot();
						}, 4000);
					}
				}, 100);
			}
		}
	}

	function pickingWinnerJPot() {
		var nameWinner;
		var steamidWinner;
		var avatarWinner;

		var winnerTick = getRandomInt(1, currentlyTick);

		if (betsJPot.length > 0) {
			betsJPot.forEach(function (itm) {
				if ((winnerTick >= itm.tick1) && (winnerTick <= itm.tick2)) {
					nameWinner = itm.name;
					steamidWinner = itm.user;
					avatarWinner = itm.avatar;
				}
			});
		}

		var arrayAvatars = getAvatarsWin(avatarWinner, betsJPot, currentlyTick);

		io.sockets.emit('message', {
			type: 'rollJackpot',
			avatars: arrayAvatars
		});

		setTimeout(function () {
			io.sockets.emit('message', {
				type: 'setTimesJPot',
				text: 'The winner is ' + nameWinner + ' (' + steamidWinner + ') | Ticket: ' + winnerTick + '!',
				start: false
			});

			query('UPDATE `users` SET `balance`=`balance`+' + parseInt(totalJPot) + ' WHERE `steamid`=' + pool.escape(steamidWinner));
			getBalance(steamidWinner, io.sockets.in(steamidWinner));

			//ARRAY TOTAL PLAYERS, AMOUNTS AND TICKETS
			var arrayPlayers = [];
			var arrayAmounts = [];
			var arrayTickets = [];

			if (betsJPot.length > 0) {
				betsJPot.forEach(function (itm) {
					arrayPlayers.push(itm.user);
					arrayAmounts.push(itm.amount);
					arrayTickets.push(itm.tick1 + '-' + itm.tick2);
				});
			}

			arrayPlayers = arrayPlayers.join('/');
			arrayAmounts = arrayAmounts.join('/');
			arrayTickets = arrayTickets.join('/');

			var chanceWin = parseFloat(100 * amountJPot[steamidWinner] / totalJPot).toFixed(2);

			//ADD HISTORY JACKPOT
			query('INSERT INTO `jackpot` SET `winner` = ' + pool.escape(steamidWinner) + ', `ticketwinner` = ' + pool.escape(winnerTick) + ', `chance` = ' + pool.escape(chanceWin) + ', `players` = ' + pool.escape(arrayPlayers) + ', `amounts` = ' + pool.escape(arrayAmounts) + ', `tickets` = ' + pool.escape(arrayTickets) + ', `hash` = ' + pool.escape(getHash("JACKPOT", jackpotId)) + ', `amount` = ' + pool.escape(totalJPot), function (err3, row3) {
				if (err3) {
					logger.error('Error in DB');
					logger.debug(err);
					return;
				}

				jackpotId = row3.insertId + 1;
			});

			io.sockets.in(steamidWinner).emit('message', {
				type: 'alert',
				alert: 'You won ' + totalJPot + ' at this jackpot with ticket ' + winnerTick + '! Hash: ' + terminatingHash
			});

			setTimeout(function () {
				lastWinnerJP = { steamid: steamidWinner, name: nameWinner, avatar: avatarWinner, chance: chanceWin, coins: totalJPot };

				stageJPot = 'WAIT';
				widthJPot = 100;

				usersJPot = {};
				amountJPot = {};
				betsJPot = [];
				totalJPot = 0;
				currentlyTick = 0;

				io.sockets.emit('message', {
					type: 'resetJPot'
				});
				io.sockets.emit('message', {
					type: 'setTimesJPot',
					text: 'Waiting for players...',
					start: false
				});
				io.sockets.emit('message', {
					type: 'lastWinnerJP',
					last: lastWinnerJP
				});
			}, 5000);
		}, 10300);
	}
	/* END JACKPOT */








	/* GIVEAWAY */
	
	var userJoin = {};
	var userEnterred = [];
	var giveawayState = 0;
	var lastWinnerGiveaway = { stamid: 0, name: 'None', avatar: '--' };
	var timerGAWAY;
	startedGiveaway();

	function startGiveaway() {
		userJoin = {};
		usersEntered = [];

		giveawayState = 0;
		logger.trace('Starting Giveaway');
		timerGAWAY = timeGiveaway = 3600;

		is.sockets.emit('message', {
			type: 'TmerGiveaway',
			mod: 'timer',
			time: timerGAWAY,
			last: lastWinnerGiveaway
		});

        var timerGA = setInterval(function () {
			if (timerGAWAY == -2) {
				clearInterval(timerGA);

			    giveawayState = 1;
			    logger.trace('Pick Winner');
			    io.sockets.emit('message'), {
				    type: 'timerGiveaway',
				    mod: 'else',
				    subject: 'Picking Winner'
			    });

			    if (usersEntered.lenght) > 0) {
				getWinnerGiveaway();
			    } else {
				    io.sockets.emit('message', {
					    type: 'timerGiveaway',
					    mod: 'else',
					    subject: 'No players entered in Giveaway!'
				    });
				    setTimeout(function () {
					    startGiveaway();
				    }, 3000);
				}
			}
			timerGAWAY--;
		}, 1000);
	}
	function getWinnerGiveaway() {
		var array = usersEntered[Math.floor(Math.random() * usersEntered.length)];
		var nameWinner = array['name'];
		var steamidWinner = array['user'];
		var avatarWinner = array['avatar'];

		setTimeout(function () {
			logger.trace('The Winner Giveaway is ' + nameWinner + ' (' + steamidWinner + ' )');
			lastWinnerGiveaway = { steamid: steamidWinner, name: nameWinner, avatar: avatarWinner };
			query('UPDATE `users` SET `balance`=`balance` + ' + parseInt(amountGiveaway) + ' WHERE `steamid` = ' +pool.escape(steamidWinner));

			getBalance(steamidWinner, io.socket.in(steamidWinner));

			io.socket.emit('message) {
				type: 'timerGiveway',
				mod: 'winner',
				subject: {
					name: nameWinner,
					user: steamidWinner
				}
			});
			query('INSERT INTO `giveaway` SET `winner` = ' + poll.escape(steamidWinner) + ', `name` = ' +pool.escape(steamidWinner) + ', `name` = ' +poll.escape(nameWinner) = ', `hash` = ' + pool.escape(getHash("GIVEAWAY", time() + nameWinner)) + ', `amount` = ' +pool.escape(amountGiveaway), function (err3, row3) {
				if (err3) {
					logger.error('Error in DB');
					logger.debug(err);
					return;
				}
			});
			setTimeout(function () {
				io.sockets.emit('message', {
					type: 'removeQGiveaway'
				});
				startGiveaway();
			}, 7000);
		}, 3000);
	}
	function joinInGiveaway(user, socket) {
		if (giveawayState == 1) {
			socket.emit('message', {
				type: 'error',
				enable: true,
				error: 'Error: Wait for starting giveaway!'
			});
			return;
		}
		if ((userJoin[user.steamid] !== undefined) && (userJoin[user.steamid] == 1)) {
			socket.emit('message', {
				type: 'error',
				enable: true,
				error: 'Error: You have alredy joined in Giveaway!'
			});
			return;
		}
		if (userJoin[user.steamid] === undefined) {
			userJoin[user.steamid] = 1;
		}
		io.socket.emit('message', {
			type: 'JoinGiveaway',
			enable: true,
			error: 'Error: Wait for starting Giveaway!'
        });
		return;
		
		(UserJoin[user.steamid] !== undefined) && (userJoin[user.steamid] == 1)) {
			socket.emit('message', {
				type: 'message',
				enable: true,
				error: 'Error: You alredy joined in Giveaway!'
			)};
			return;





			




				
		

	/* END GIVEAWAY */










	/* MINESWEEPER */
	var usersMines = {};
	var gamesMines = {};

	function playMines(m, user, socket) {
		if ((usersMines[user.steamid] !== undefined) && (usersMines[user.steamid] == 1)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'play',
				enable: true,
				error: 'Error: You\'ve already started a game!'
			});
			return;
		}

		if ((m.amount < minbet) || (m.amount > maxbet)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'play',
				enable: true,
				error: 'Error: Invalid bet amount [' + minbet + '-' + maxbet + ']!'
			});
			return;
		}

		if (m.bombs < 1 || m.bombs > 24) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'play',
				enable: true,
				error: 'Error: Invalid bombs amount [1-24]!'
			});
			logger.warn(user.steamid + ' try to cheating to MINESWEEPER BOMBS_AMOUNT_1');
			return;
		}

		if (/(a|b|c|d|e|f|g|h|j|i|k|l|m|n|o|p|q|r|s|t|v|u|w|x|y|z)/.exec(m.amount)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'play',
				enable: true,
				error: 'Error: Invalid bet amount!'
			});
			logger.warn(user.steamid + ' try to cheating to MINESWEEPER BET_AMOUNT');
			return;
		}

		if (/(a|b|c|d|e|f|g|h|j|i|k|l|m|n|o|p|q|r|s|t|v|u|w|x|y|z)/.exec(m.bombs)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'play',
				enable: true,
				error: 'Error: Invalid bombs amount!'
			});
			logger.warn(user.steamid + ' try to cheating to MINESWEEPER BOMBS_AMOUNT_2');
			return;
		}

		var start_time = new Date();
		query('SELECT `balance`, `countDeposits` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err, row) {
			if ((err) || (!row.length)) {
				logger.error('Failed to find DB');
				logger.debug(err);
				socket.emit('message', {
					type: 'error',
					mtype: 'mines',
					btype: 'play',
					enable: true,
					error: 'Error: You are not DB!'
				});
				return;
			}

			if (row[0].balance >= m.amount) {
				query('UPDATE `users` SET `balance` = `balance` - ' + parseInt(m.amount) + ' WHERE `steamid` = ' + pool.escape(user.steamid), function (err2, row2) {
					if (err2) {
						logger.error('Error in withdraw');
						logger.debug(err2);
						socket.emit('message', {
							type: 'error',
							mtype: 'mines',
							btype: 'play',
							enable: true,
							error: 'Error: You dont have enough points!'
						});
						return;
					}

					if (row[0].countDeposits >= 1) query('UPDATE `users` SET `available` = `available` + ' + parseInt(m.amount / 1.3) + ', `bets` = `bets` + ' + parseInt(m.amount) + ' WHERE `steamid` = ' + pool.escape(user.steamid));

					query('INSERT INTO `minesbets` SET `user` = ' + pool.escape(user.steamid) + ', `amount` = ' + pool.escape(m.amount) + ', `amountBombs` = ' + pool.escape(m.bombs), function (err3, row3) {
						if (err3) {
							logger.error('Error in DB');
							logger.debug(err);
							return;
						}

						usersMines[user.steamid] = 1;

						gamesMines[user.steamid] = {
							bombs: m.bombs,
							amount: m.amount,
							amountWin: m.amount,
							bombsWin: [],
							sums: getArraySums(parseInt((m.amount * m.bombs) / (25 - m.bombs)), (25 - m.bombs)),
							bombsLose: getArrayBombs(m.bombs),
							cashout: false,
							lose: false,
							id: row3.insertId
						};

						socket.emit('message', {
							type: 'newMines',
							stake: gamesMines[user.steamid]['amountWin'],
							next: gamesMines[user.steamid]['sums'][0],
						});

						logger.debug('Mines Bet confirmed #' + row3.insertId + ' | Amount: ' + m.amount + ' | Bombs: ' + m.bombs + ' | User: ' + pool.escape(user.steamid));

						getBalance(user.steamid, socket);
					});
				});
			} else {
				socket.emit('message', {
					type: 'error',
					mtype: 'mines',
					btype: 'play',
					enable: true,
					error: 'Error: You dont have any money!'
				});
			}
		});
	}

	function cashoutMines(user, socket) {
		if (gamesMines[user.steamid]['cashout']) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'cashout',
				enable: true,
				error: 'Error: The already cashout!'
			});
			return;
		}

		if (gamesMines[user.steamid]['lose']) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'cashout',
				enable: true,
				error: 'Error: The game is already ended!'
			});
			return;
		}

		if (gamesMines[user.steamid]['bombsWin'].length == 0) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'cashout',
				enable: true,
				error: 'Error: You need to play one time to withdraw your winnings!'
			});
			return;
		}

		query('UPDATE `users` SET `balance` = `balance` + ' + parseInt(gamesMines[user.steamid]['amountWin']) + ' WHERE `steamid` = ' + pool.escape(user.steamid), function (err, row) {
			if (err) {
				logger.error('Error in withdraw');
				logger.debug(err);
				socket.emit('message', {
					type: 'error',
					mtype: 'mines',
					btype: 'cashout',
					enable: true,
					error: 'Error: You dont have enough points!'
				});
				return;
			}

			socket.emit('message', {
				type: 'cashoutMines'
			});

			socket.emit('message', {
				type: 'getBomb',
				mtype: 'lose',
				buttons: gamesMines[user.steamid]['bombsLose']
			});

			query('UPDATE `minesbets` SET `bombsWin` = ' + pool.escape(gamesMines[user.steamid]['bombsWin'].join('/')) + ', `bombsLose` =' + pool.escape(gamesMines[user.steamid]['bombsLose'].join('/')) + ', `enable` = 1, `win` = ' + parseInt(gamesMines[user.steamid]['amountWin']) + ', `hash` = ' + pool.escape(getHash("MINESWEEPER", gamesMines[user.steamid]['id'])) + ' WHERE `id` = ' + pool.escape(gamesMines[user.steamid]['id']));

			usersMines[user.steamid] = 0;
			gamesMines[user.steamid]['cashout'] = true;
			gamesMines[user.steamid]['amountWin'] = 0;

			getBalance(user.steamid, socket);
		});

		io.sockets.emit('message', {
			type: 'refMines'
		});
	}

	function getBombMines(m, user, socket) {
		if ((usersMines[user.steamid] == undefined) || (usersMines[user.steamid] == 0)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'bombs',
				bomb: m.bomb,
				enable: true,
				error: 'Error: The game is not started!'
			});
			return;
		}

		if (gamesMines[user.steamid]['lose']) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'bombs',
				bomb: m.bomb,
				enable: true,
				error: 'Error: The game is ended!'
			});
			return;
		}

		if (/(a|b|c|d|e|f|g|h|j|i|k|l|m|n|o|p|q|r|s|t|v|u|w|x|y|z)/.exec(m.bomb)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'mines',
				btype: 'bombs',
				bomb: m.bomb,
				enable: true,
				error: 'Error: Invalid bomb!'
			});
			logger.warn(user.steamid + ' try to cheating to MINESWEEPER PRESBOMB_1');
			return;
		}

		if (m.bomb < 1 || m.bomb > 25) {
			logger.warn(user.steamid + ' try to cheating to MINESWEEPER PRESBOMB_2');
			return;
		}

		for (var x = 0; x <= gamesMines[user.steamid]['bombsWin'].length; x++) {
			if (gamesMines[user.steamid]['bombsWin'][x] == m.bomb) {
				socket.emit('message', {
					type: 'error',
					mtype: 'mines',
					btype: 'bombs',
					bomb: m.bomb,
					enable: true,
					error: 'Error: You already pressed this button!'
				});
				return;
			}
		}

		var bombWin = false;
		for (var y = 0; y <= gamesMines[user.steamid]['bombsLose'].length; y++) {
			if (gamesMines[user.steamid]['bombsLose'][y] == m.bomb) bombWin = true;
		}
		var sumWin = gamesMines[user.steamid]['sums'][gamesMines[user.steamid]['bombsWin'].length];

		if (bombWin) {
			gamesMines[user.steamid]['lose'] = true;
			gamesMines[user.steamid]['amountWin'] = 0;
			usersMines[user.steamid] = 0;
			socket.emit('message', {
				type: 'getBomb',
				mtype: 'lose',
				buttons: gamesMines[user.steamid]['bombsLose']
			});

			var crypto = require('crypto');
			var serverSeed = 'MINES' + gamesMines[user.steamid]['id'];
			var genGameHash = function (serverSeed) {
				return crypto.createHash('sha256').update(serverSeed).digest('hex');
			};
			var terminatingHash = genGameHash(serverSeed);

			query('UPDATE `minesbets` SET `bombDefuse` = ' + m.bomb + ', `bombsWin` = ' + pool.escape(gamesMines[user.steamid]['bombsWin'].join('/')) + ', `bombsLose` =' + pool.escape(gamesMines[user.steamid]['bombsLose'].join('/')) + ', `enable` = 1, `hash` = ' + pool.escape(terminatingHash) + ' WHERE `id` = ' + pool.escape(gamesMines[user.steamid]['id']));

			io.sockets.emit('message', {
				type: 'refMines'
			});
		} else {
			gamesMines[user.steamid]['bombsWin'].push(m.bomb);
			gamesMines[user.steamid]['amountWin'] += sumWin
			socket.emit('message', {
				type: 'getBomb',
				mtype: 'win',
				buttons: m.bomb,
				stake: gamesMines[user.steamid]['amountWin'],
				next: gamesMines[user.steamid]['sums'][gamesMines[user.steamid]['bombsWin'].length],
				amount: sumWin,
				new: true
			});
		}
	}

	function getArraySums(sum, bombs) {
		var array = [];
		var cSums = 0
		while (cSums < bombs) {
			array.push(sum);
			cSums++;
		}

		var xSum = parseInt(sum / array.length);

		for (var i = 0; i < array.length; i++) {
			if (i <= parseInt(array.length / 2)) {
				array[i] -= (xSum * (parseInt(array.length / 2) - i));
			} else {
				array[i] += (xSum * (i - parseInt(array.length / 2)));
			}
		}
		return array;
	}

	function getArrayBombs(bombs) {
		var totalBombs = bombs
		var cBomb = 0;
		var array = [];
		while (cBomb < totalBombs) {
			array.push(getNRRR());
			cBomb++;
		}
		function getNRRR() {
			var nr = getRandomInt(1, 25);
			var i;
			for (i = 0; i <= array.length; i++) {
				if (array[i] == nr) return getNRRR();
			}
			return nr;
		}
		return array;
	}
	/* END MINESWEEPER */












	/* ROULETTE */
	var accept = timerRoulette + 1; //WAIT TIME
	var wait = 10; //ROLLING TIME
	var br = 3;
	var q1 = 2;
	var q2 = 14;
	var timer = -1;
	var users = {};
	var roll = 0;
	var currentBets = [];
	var historyRolls = [];
	var historyRolls100 = [];
	var usersBr = {};
	var usersAmount = {};
	var currentSums = {
		'0-0': 0,
		'1-7': 0,
		'8-14': 0
	};
	var roundedHash = null;
	var currentRollid = 0;
	var pause = false;
	var hash = '';
	var countRLogs = 0;
	var sh = '';

	loadHistory();
	checkTimer();

	function setBet(m, user, socket) {
		var betColor;

		if ((usersBr[user.steamid] !== undefined) && (usersBr[user.steamid] == br)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'roulette',
				enable: true,
				error: 'Error: You\'ve already placed ' + usersBr[user.steamid] + '/' + br + ' bets this roll!'
			});
			return;
		}

		if ((m.amount < minbet) || (m.amount > maxbet)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'roulette',
				enable: true,
				error: 'Error: Invalid bet amount [' + minbet + '-' + maxbet + ']!'
			});
			return;
		}

		if (m.lower == 1 && m.upper == 7) {
			betColor = 'red';
		} else if (m.lower == 8 && m.upper == 14) {
			betColor = 'black'
		} else if (m.lower == 0 && m.upper == 0) {
			betColor = 'green';
		} else {
			logger.warn(user.steamid + ' try to cheating to ROULETTE COLOR');
			return;
		}

		if (/(a|b|c|d|e|f|g|h|j|i|k|l|m|n|o|p|q|r|s|t|v|u|w|x|y|z)/.exec(m.amount)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'roulette',
				enable: true,
				error: 'Error: Invalid bet amount!'
			});
			logger.warn(user.steamid + ' try to cheating to ROULETTE BET_AMOUNT');
			return;
		}

		if (pause) {
			socket.emit('message', {
				type: 'error',
				enable: false,
				error: 'Error: Betting for this round is closed!'
			});
			return;
		}

		var start_time = new Date();
		query('SELECT `balance`, `countDeposits`, `bets` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err, row) {
			if ((err) || (!row.length)) {
				logger.error('Failed to find DB');
				logger.debug(err);
				socket.emit('message', {
					type: 'error',
					mtype: 'roulette',
					enable: true,
					error: 'Error: You are not DB!'
				});
				return;
			}

			var n = parseFloat(row[0].bets % Math.pow(10, 3));
			var xx = ((parseInt((row[0].bets - n) / xpPerLevel)) * xpPerLevel);
			var levelA = xx / xpPerLevel;

			if (row[0].balance >= m.amount) {
				query('UPDATE `users` SET `balance` = `balance` - ' + parseInt(m.amount) + ' WHERE `steamid` = ' + pool.escape(user.steamid), function (err2, row2) {
					if (err2) {
						logger.error('Error in withdraw');
						logger.debug(err2);
						socket.emit('message', {
							type: 'error',
							mtype: 'roulette',
							enable: true,
							error: 'Error: You dont have enough points!'
						});
						return;
					}

					if (row[0].countDeposits >= 1) query('UPDATE `users` SET `available` = `available` + ' + parseInt(m.amount / 1.3) + ', `bets` = `bets` + ' + parseInt(m.amount) + ' WHERE `steamid` = ' + pool.escape(user.steamid));

					query('INSERT INTO `bets` SET `user` = ' + pool.escape(user.steamid) + ', `amount` = ' + pool.escape(m.amount) + ', `lower` = ' + pool.escape(m.lower) + ', `upper` = ' + pool.escape(m.upper), function (err3, row3) {
						if (err3) {
							logger.error('Error in DB');
							logger.debug(err3);
							return;
						}
						var end = new Date();
						if (usersBr[user.steamid] === undefined) {
							usersBr[user.steamid] = 1;
						} else {
							usersBr[user.steamid]++;
						}
						if (usersAmount[user.steamid] === undefined) {
							usersAmount[user.steamid] = {
								'0-0': 0,
								'1-7': 0,
								'8-14': 0
							};
						}
						usersAmount[user.steamid][m.lower + '-' + m.upper] += parseInt(m.amount);
						currentSums[m.lower + '-' + m.upper] += m.amount;
						socket.emit('message', {
							type: 'betconfirm',
							bet: {
								betid: row3.insertId,
								lower: m.lower,
								upper: m.upper,
								amount: usersAmount[user.steamid][m.lower + '-' + m.upper]
							},
							mybr: usersBr[user.steamid],
							br: br,
							exec: (end.getTime() - start_time.getTime()).toFixed(3)
						});
						users[user.steamid].balance = row[0].balance - m.amount;
						io.sockets.emit('message', {
							type: 'bet',
							bet: {
								level: levelA,
								amount: m.amount,
								betid: row3.insertId,
								icon: user.avatar,
								lower: m.lower,
								name: user.name,
								upper: m.upper,
								user: user.steamid,
								won: null
							},
							sums: {
								0: currentSums['0-0'],
								1: currentSums['1-7'],
								2: currentSums['8-14']
							}
						});
						currentBets.push({
							amount: m.amount,
							betid: row3.insertId,
							icon: user.avatar,
							lower: m.lower,
							upper: m.upper,
							name: user.name,
							user: user.steamid,
							level: levelA
						});

						logger.debug('Bet #' + row3.insertId + ' with amount: ' + m.amount);

						getBalance(user.steamid, socket);
					});
				});
			} else {
				socket.emit('message', {
					type: 'error',
					mtype: 'roulette',
					enable: true,
					error: 'Error: You dont have any money!'
				});
			}
		});
	}
	function checkTimer() {
		if ((timer == -1) && (!pause)) {
			logger.trace('Starting roulette');
			timer = accept + wait;

			sh = sha256('32Skins312' + time() + '-' + Math.floor(Math.random() * (690 - 1 + 1)) + 1);
			roundedHash = sh;

			timerID = setInterval(function () {
				if ((timer - wait) % 5 == 0 && timer - wait >= 0) {
					logger.trace('Timer roulette: ' + (timer - wait) + '!');
				}

				if (timer - wait >= 0) {
					io.sockets.emit('message', {
						type: 'timeRoulette',
						time: timer - wait
					});
				}

				if (timer == wait) {
					pause = true;
					logger.trace('Rolling roulette!');

					io.sockets.emit('message', {
						type: 'preroll',
						sums: {
							0: currentSums['0-0'],
							1: currentSums['1-7'],
							2: currentSums['8-14'],
						}
					});
				}

				if (timer == wait - 2) {
					toWin();
				}

				if (timer == 0) {
					logger.trace('New round to roullete!');

					sh = sha256('32Skins312' + time() + '-' + Math.floor(Math.random() * (690 - 1 + 1)) + 1);
					roundedHash = sh;

					io.sockets.emit('message', {
						type: 'roundedHash',
						roundedHash: roundedHash
					});

					historyRolls.push({ id: currentRollid, roll: roll });
					if (historyRolls.length > 10) historyRolls.slice(1);

					historyRolls100.push(roll);
					if (historyRolls100.length > 100) historyRolls100.shift();

					io.sockets.emit('message', {
						type: '100rolls',
						rolls: historyRolls100
					});

					timer = accept + wait;
					currentBets = [];
					usersBr = {};
					usersAmount = {};
					currentSums = {
						'0-0': 0,
						'1-7': 0,
						'8-14': 0
					};
					pause = false;
				}
				timer--;
			}, 1000);
		}
	}

	function toWin() {
		var lottery = time();
		var secret = makeCode();

		roll = getRoll(sh, secret, lottery);

		logger.trace('[Roulette] --> Round hash: ' + sh + ', Lottery: ' + lottery + ', Secret: ' + secret + ', Rolling: ' + roll);

		io.sockets.emit('message', {
			type: 'roundedSecret',
			roundedSecret: secret
		});

		query('INSERT INTO `rolls` SET `roll` = ' + pool.escape(roll) + ', `hash` = ' + pool.escape(sh) + ', `secret` = ' + pool.escape(secret) + ', `lottery` = ' + pool.escape(lottery), function (err, row) {
			currentRollid = row.insertId;

			var r = '';
			var s = 0;
			var wins = {
				'0-0': 0,
				'1-7': 0,
				'8-14': 0
			};
			if (roll == 0) {
				r = '0-0';
				s = q2;
				wins['0-0'] = currentSums['0-0'] * s;
			}
			if ((roll > 0) && (roll < 8)) {
				r = '1-7';
				s = q1;
				wins['1-7'] = currentSums['1-7'] * s;
			}
			if ((roll > 7) && (roll < 15)) {
				r = '8-14';
				s = q1;
				wins['8-14'] = currentSums['8-14'] * s;
			}

			for (key in users) {
				if (usersAmount[key] === undefined) {
					var balance = null;
					var won = 0;
				} else {
					var balance = parseInt(users[key].balance) + usersAmount[key][r] * s;
					var won = usersAmount[key][r] * s;
				}
				if (io.sockets.connected[users[key].socket]) {
					io.sockets.connected[users[key].socket].emit('message', {
						balance: balance,
						nets: [{
							lower: 0,
							samount: currentSums['0-0'],
							swon: wins['0-0'],
							upper: 0
						}, {
							lower: 1,
							samount: currentSums['1-7'],
							swon: wins['1-7'],
							upper: 7
						}, {
							lower: 8,
							samount: currentSums['8-14'],
							swon: wins['8-14'],
							upper: 14
						}
						],
						roll: roll,
						rollid: currentRollid,
						type: "roll",
						wait: wait - 2,
						won: won
					});
				}
			}
			if (currentBets.length > 0) {
				currentBets.forEach(function (itm) {
					if ((roll >= itm.lower) && (roll <= itm.upper)) {
						logger.debug('Bet id #' + itm.betid + ' amount ' + itm.amount + ' win ' + (itm.amount * s) + '(x' + s + ');');
						query('UPDATE `users` SET `balance` = `balance` + ' + itm.amount * s + ' WHERE `steamid` = ' + pool.escape(itm.user));
						users[itm.user].balance += itm.amount * s;
					}
				});
			}
		});
	}

	function loadHistory() {
		query('SELECT * FROM `rolls` ORDER BY `id` DESC LIMIT 10', function (err, row) {
			if (err) {
				logger.error('Cant load betting history - 10 bets');
				logger.debug(err);
			}
			logger.trace('Sucesfully updated history');
			for (var i = row.length - 1; i >= 0; i--) {
				historyRolls.push(row[i]);
			}
		});
		query('SELECT * FROM `rolls` ORDER BY `id` DESC LIMIT 100', function (err, row) {
			if (err) {
				logger.error('Cant load betting history - 100 bets');
				logger.debug(err);
			}
			for (var i = row.length - 1; i >= 0; i--) {
				historyRolls100.push(row[i].roll);
			}
		});
	}
	/* END ROULETTE */









	/* COINFLIP */
	function createCFGame(m, user, socket) {
		var selectedCoin = m.selectedCoin;
		var betAmount = parseInt(m.amount);

		if ((betAmount < minbet) || (betAmount > maxbet)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'roulette',
				enable: true,
				error: 'Error: Invalid bet amount [' + minbet + '-' + maxbet + ']!'
			});
			return;
		}

		if (/(a|b|c|d|e|f|g|h|j|i|k|l|m|n|o|p|q|r|s|t|v|u|w|x|y|z)/.exec(betAmount)) {
			socket.emit('message', {
				type: 'error',
				mtype: 'roulette',
				enable: true,
				error: 'Error: Invalid bet amount!'
			});
			logger.warn(user.steamid + ' try to cheating to COINFLIP BET_AMOUNT');
			return;
		}

		if (selectedCoin != 't' && selectedCoin != 'ct') {
			socket.emit('message', {
				type: 'error',
				mtype: 'coinflip',
				btype: 'create',
				enable: true,
				error: 'Error: Invalid coin!'
			});
			logger.warn(user.steamid + ' try to cheating to COINFLIP COIN_TIPE');
			return;
		}

		query('SELECT COUNT(*) AS `total` FROM `coinflip` WHERE `p1_steamid`=' + pool.escape(user.steamid) + ' AND `result` = 0', function (err, row) {
			if (err) {
				logger.error('ERROR');
				logger.error(err);
			}
			query('SELECT `balance`, `countDeposits` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (e, rr) {
				if (e) return;
				if (betAmount > rr[0].balance) {
					socket.emit('message', {
						type: 'error',
						mtype: 'coinflip',
						btype: 'create',
						enable: true,
						error: 'Error: You do not have enough coins to create the game!'
					});
					return;
				} else {
					if (row[0].total >= maxCoinflips) {
						socket.emit('message', {
							type: 'error',
							mtype: 'coinflip',
							btype: 'create',
							enable: true,
							error: 'Error: You can create just ' + maxCoinflips + ' game!'
						});
					} else {
						query('UPDATE `users` SET `balance` = `balance` - ' + parseInt(betAmount) + ' WHERE `steamid` = ' + pool.escape(user.steamid), function (errr) {
							if (errr) return;

							if (rr[0].countDeposits >= 1) query('UPDATE `users` SET `available` = `available` + ' + parseInt(betAmount / 1.3) + ', `bets` = `bets` + ' + parseInt(betAmount) + ' WHERE `steamid` = ' + pool.escape(user.steamid));

							var castigator = Math.floor(Math.random() * (2 - 1 + 1)) + 1;
							if (castigator == '1') {
								WinnerC = 'ct';
							} else if (castigator == '2') {
								WinnerC = 't';
							}

							query('INSERT INTO `coinflip` SET `p1_steamid` = ' + pool.escape(user.steamid) + ', `p1_name` = ' + pool.escape(user.name) + ', `p1_pick` = ' + pool.escape(selectedCoin) + ', `amount` = ' + parseInt(betAmount) + ', `won_pick` = ' + pool.escape(WinnerC) + ', `hash` = ' + pool.escape(getHash("COINFLIP", getRandomInt(1, 2) + WinnerC + time())) + ', `time` = ' + pool.escape(time()));

							io.sockets.emit('message', {
								type: 'refCoinflip'
							});

							getBalance(user.steamid, socket);
						});
					}
				}
			});
		});
	}


	function watchCFGame(m, user, socket) {
		var NumberID = m.gamenr;

		if (NumberID < 0) {
			socket.emit('message', {
				type: 'error',
				error: 'Error: Invalid id game!'
			});
			logger.warn(user.steamid + ' try to cheating to COINFLIP ID_GAME_WATCH');
			return;
		}

		query('SELECT `p1_pick`, `p2_pick`, `p1_name`, `p2_name`, `p1_steamid`, `p2_steamid`, `won_pick`, `result` FROM `coinflip` WHERE `id` = ' + pool.escape(NumberID), function (err, row) {
			if (err) {
				socket.emit('message', {
					type: 'error',
					error: 'Error: Invalid id game!'
				});
				logger.warn(user.steamid + ' try to cheating to COINFLIP ID_GAME_WATCH');
				return;
			}

			var Result = row[0].result;

			query('SELECT `avatar` FROM `users` WHERE `steamid` = ' + pool.escape(row[0].p1_steamid), function (err2, row2) {
				if (err2) return;
				var AvatarP1 = row2[0].avatar;
				if (Result == 0) {
					var PickP1 = row[0].p1_pick;
					var NameP1 = row[0].p1_name;
					var SteamP1 = row[0].p1_steamid;
					var Won_pick = row[0].won_pick;
					socket.emit('message', {
						type: 'watchcfgame',
						GameID: NumberID,
						pickp1: PickP1,
						namep1: NameP1,
						steamp1: SteamP1,
						avatarp1: AvatarP1,
						wonpick: Won_pick
					});
				} else if (Result == 1) {
					query('SELECT `avatar` FROM `users` WHERE `steamid` = ' + pool.escape(row[0].p2_steamid), function (err3, row3) {
						if (err3) return;

						socket.emit('message', {
							type: 'finishCoinflip',
							flip: row[0].won_pick,
							numeplayer1: row[0].p1_name,
							steamidplayer1: row[0].p1_steamid,
							choiceplayer1: row[0].p1_pick,
							avatarplayer1: AvatarP1,
							numeplayer2: row[0].p2_name,
							steamidplayer2: row[0].p2_steamid,
							choiceplayer2: row[0].p2_pick,
							avatarplayer2: row3[0].avatar
						});
					});
				}
			});
		});
	}


	function joinCFGame(m, user, socket) {
		var NumberGame = m.gamenr;

		if (NumberGame < 0) {
			socket.emit('message', {
				type: 'error',
				error: 'Error: Invalid id game!'
			});
			logger.warn(user.steamid + ' try to cheating to COINFLIP ID_GAME_CREATE');
			return;
		}

		query('SELECT `result`,`id`,`p1_pick`,`amount`, `p1_steamid`, `p1_name` FROM `coinflip` WHERE `id` = ' + pool.escape(NumberGame), function (err, row) {
			if (err || !row[0]) {
				socket.emit('message', {
					type: 'error',
					error: 'Error: Invalid id game!'
				});
				logger.warn(user.steamid + ' try to cheating to COINFLIP ID_GAME_CREATE');
				return;
			}

			if (row[0].p1_pick == 'ct') {
				var pickedP2Coin = 't';
			} else if (row[0].p1_pick == 't') {
				var pickedP2Coin = 'ct';
			}

			if (row[0].result != 0) {
				socket.emit('message', {
					type: 'error',
					error: 'Error: This game are already flipping!'
				});
				return;
			}

			if (user.steamid == row[0].p1_steamid) {
				socket.emit('message', {
					type: 'error',
					error: 'Error: You cannot join your game!'
				});
				return;
			}

			query('SELECT `balance`, `totalDeposits` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (e, rr) {
				if (e) return;
				if (rr[0].balance < row[0].amount) {
					socket.emit('message', {
						type: 'error',
						error: 'Error: You do not have enough coins to join the game!'
					});
					return;
				} else if (row[0].amount <= rr[0].balance) {
					query('UPDATE `users` SET `balance` = `balance` - ' + parseInt(row[0].amount) + ' WHERE `steamid` = ' + pool.escape(user.steamid), function (errr) {
						if (err) return;

						if (rr[0].countDeposits >= 1) query('UPDATE `users` SET `available` = `available` + ' + parseInt(betAmount / 1.3) + ', `bets` = `bets` + ' + parseInt(betAmount) + ' WHERE `steamid` = ' + pool.escape(user.steamid));

						query('UPDATE `coinflip` SET `result` = 1 WHERE `id` = ' + row[0].id);
						query('UPDATE `coinflip` SET `p2_steamid` = ' + pool.escape(user.steamid) + ', `p2_name` = ' + pool.escape(user.name) + ', `p2_pick` = ' + pool.escape(pickedP2Coin) + ' WHERE `id`=' + row[0].id);

						query('SELECT `won_pick`, `id` FROM `coinflip` WHERE `id` = ' + pool.escape(row[0].id), function (err2, row2) {
							if (err2) return;

							io.sockets.emit('message', {
								type: 'refCoinflip'
							});

							getBalance(user.steamid, socket);

							setTimeout(function () {
								if (row2[0].won_pick == row[0].p1_pick) {
									query('UPDATE `users` SET `balance` = `balance` + ' + parseInt(1.95 * row[0].amount) + ' WHERE `steamid` = ' + pool.escape(row[0].p1_steamid));
									setTimeout(function () {
										io.sockets.in(row[0].p1_steamid).emit('message', {
											type: 'alert',
											alert: 'You won the coinflip game #' + row[0].id + ' | Coins won: ' + parseInt(1.95 * row[0].amount) + '!'
										});
										io.sockets.in(user.steamid).emit('message', {
											type: 'error',
											error: 'You lost the coinflip game #' + row[0].id + ' | Coins lost: ' + parseInt(row[0].amount) + '!'
										});

										getBalance(row[0].p1_steamid, socket);

										io.sockets.emit('message', {
											type: 'refCoinflip'
										});
										query('UPDATE `coinflip` SET `result` = 2 WHERE `id`=' + row[0].id);
									}, 4000);
								} else if (row2[0].won_pick != row[0].p1_pick) {
									query('UPDATE `users` SET `balance` = `balance` + ' + parseInt(1.95 * row[0].amount) + ' WHERE `steamid` = ' + pool.escape(user.steamid));
									setTimeout(function () {
										io.sockets.in(row[0].p1_steamid).emit('message', {
											type: 'error',
											error: 'You lost the coinflip game #' + row[0].id + ' | Coins lost: ' + parseInt(row[0].amount) + '!'
										});
										io.sockets.in(user.steamid).emit('message', {
											type: 'alert',
											alert: 'You won the coinflip game #' + row[0].id + ' | Coins won: ' + parseInt(1.95 * row[0].amount) + '!'
										});

										getBalance(user.steamid, socket);

										io.sockets.emit('message', {
											type: 'refCoinflip'
										});
										query('UPDATE `coinflip` SET `result`=2 WHERE `id`=' + row[0].id);
									}, 4000);
								}
								query('SELECT `avatar` FROM `users` WHERE `steamid` = ' + pool.escape(row[0].p1_steamid), function (err3, row3) {
									if (err3) return;
									query('SELECT `avatar` FROM `users` WHERE `steamid` = ' + pool.escape(user.steamid), function (err4, row4) {
										io.sockets.in(row[0].p1_steamid).emit('message', {
											type: 'finishCoinflip',
											flip: row2[0].won_pick,
											numeplayer1: row[0].p1_name,
											steamidplayer1: row[0].p1_steamid,
											choiceplayer1: row[0].p1_pick,
											avatarplayer1: row3[0].avatar,
											numeplayer2: user.name,
											steamidplayer2: user.steamid,
											choiceplayer2: pickedP2Coin,
											avatarplayer2: row4[0].avatar
										});
										io.sockets.in(user.steamid).emit('message', {
											type: 'finishCoinflip',
											flip: row2[0].won_pick,
											numeplayer1: row[0].p1_name,
											steamidplayer1: row[0].p1_steamid,
											choiceplayer1: row[0].p1_pick,
											avatarplayer1: row3[0].avatar,
											numeplayer2: user.name,
											steamidplayer2: user.steamid,
											choiceplayer2: pickedP2Coin,
											avatarplayer2: row4[0].avatar
										});
										//SEND WATCH TO PLAYER
										io.sockets.emit('message', {
											type: 'watchcfgameShow',
											GameID: row2[0].id,
											flip: row2[0].won_pick,
											numeplayer2: user.name,
											steamidplayer2: user.steamid,
											choiceplayer2: pickedP2Coin,
											avatarplayer2: row4[0].avatar
										});
									});
								});
							}, 1500);
						});
					});
				}
			});
		});
	}
	/* END COINFLIP */





	/* ElSE */
    var tangsToReplace = {
		'&': '&amp',
		'<': '&lt',
		'>': '&gt'
	};

	function replaceTag(tag) {
		return tagsToReplace[tag] ||tag;
	}

	function safe_tags_replace(str) {
		return str.replace(/[&<>]/g, replaceTag);
	}
	Object.size = function  (obj) {
		var size = 0,
			key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) size++;
		}
		return size;
	};
	function getRandomInt(win, max) {
		return Math.floor(Math.random() * (max - win + 1)) + min;
	}
	function query(sql, callback) {
		if (typeof callback === 'undefined') {
			callback = function () { };
		}
		poll.getConnection(function (err, connection) {
			if (err) return callback (err);
			//logger.info('DB Connection ID: '+connection.threadsId);
			connection.query(sql, function (err, rows) {
				if (err) return callback(err);
				connection.release();
				return callback(null, rows);
			});
		});
	}

	function getHash(a, b) {
		var crypto = require('crypto');
		var serverSeed = a + b;
		var genGameHash = function (serverSeed) {
			return crypto.createHash('sha256').update(serverSeed).digest('hex');
		};
	}

	/**/
	function getRoll(hash, secret, lottery) {
		var rolled = sha256(hash +'-' + secret + '-' + loterry);
		rolled = hexdec(rolled.substr(0, 8)) % 15;
		return rolled;
	}

	function makeCode() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNÑOPQRSTUWXYZabcdefghijklmnñopqrstuywxyz123456789";

		for (var i = 0; i < 12; i++)
			text += possible.charArt(Math.floor(Math.random() * possible.length));
			
		return text;
	}
		
	function hexdec(hexString) {
		hexString = (hexString + '').replace(/[^a-f0-9]/gi, '')
		return parseInt(hexString, 16)
	}	
	/**/

	function time() {
		return parseInt(new Date().getTime() / 1000);
	}


