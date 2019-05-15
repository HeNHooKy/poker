const net = require('net');
const md5 = require('md5');
var mysql = require('mysql');

var allClients = [];
var allRooms = [];
const restartTime = 10000;
var timesOut
//Поле alredyInGame;

var _Client = function(name, password) {
	this.name = name;
	this.id;
	this.money;
	this.password = password;
	this.clientCore;
	this.room = null;
	this.yourStep = false;
	this.inGame = false;
	this.moneySpent = 0;
	this.isCheck = false;
	this.isNowJoined = false;
	this.card1;
	this.card2;
	this.onServer = true;
	this.allIn = false;
	this.lastMessegeTime = new Date(milliseconds);
}

const winSet = ['Старшая карта', 'Пара', 'Две пары', 'Сет', 'Стрит', 'Флеш', 'Фулл хаус', 'Каре', 'Стрит флеш', 'Роял флеш'];
		//	0   1   2   3   4   5   6   7   8   9  10   11
const H = ['2','3','4','5','6','7','8','9','J','Q','K','A'];//HEARTS
const D = ['2','3','4','5','6','7','8','9','J','Q','K','A'];//DIAMONDS
const C = ['2','3','4','5','6','7','8','9','J','Q','K','A'];//CLUBS
const S = ['2','3','4','5','6','7','8','9','J','Q','K','A'];//SPADES
const cards = [H,D,C,S];
H.name = 'H';
D.name = 'D';
C.name = 'C';
S.name = 'S';



var dbClient = mysql.createConnection({
	host: 'localhost',
	user: '',
	password: '',
	database: '',
	charset: 'utf8'
});



/*
dbClient.connect(function(err) {
  if (err) throw err;
  console.log("Connected to database!");
});
dbClient.query('INSERT INTO clients  (name, password) VALUES ("test", "hanhjest");', (err,result)=> {
	console.log(err);
	console.log(result);
});
*/
dbClient.query("SELECT * FROM clients", (err, resultArray)=> {
	if (err) throw err;
	for(var result of resultArray) {
		if(result.name && result.password) {
			var client = new _Client(result.name, result.password);
			client.money = result.money;
			client.onServer = false;
			allClients.push(client);
		}
		
	}
	
	
});


const server = net.createServer((cc)=> {
	var _Room = function(name) {
	this.name = name.toString();
	this.timeStart = new Date();
	this.timeEnd;
	this.id = Math.floor(Math.random()*1000);
	this.bank = 0;
	this.bet = 0;
	this.clientList = [];
	this.cardsOnGame = [];
	this.gameContinuously = false;
	this.roomAdministrator = client;
	this.stepNow;
	this.cardsOnTable = [];
	this.stage;
	this.nameClientsOnRoom = [];
}

	var client = new _Client('', '');
	client.clientCore = cc;

	console.log("some user was connected");
	cc.write(JSON.stringify({message: "Добро пожаловать. \nВведите имя и пароль дважды через пробел. Если вы уже зарегистрированны - введите имя и пароль."}));
	cc.write(JSON.stringify({message: 'Для регистрации пиши: <имя> <пароль> <пароль>. Для авторизации <имя> <пароль>'}));

	//Обработка ответов пользователей
	cc.on('data', (data)=> {
		
		//registration
		if(client.name == '') {
			registration(data, cc);
		}
		else {
			if(data.toString().substring(0,1).indexOf('.') + 1) {
				//fold command
				if(data.toString().substring(0,5).indexOf('.fold')+1) {
					gameFold();
				}
				else if(data.toString().substring(0,6).indexOf('.money')+1) {
					moneyCommand();
				}
				else if(data.toString().substring(0,5).indexOf('.help')+1) {
					helpCommand();
				}
				//up and check command
				else if(data.toString().substring(0,4).indexOf('.up ')+1) {
					gameUp(data.toString().substring(4,data.toString().length-1));
				}
				else if(data.toString().substring(0,6).indexOf('.check')+1) {
					gameUp(client.room.bet);
				}
				//create command							
				else if(data.toString().substring(0,8).indexOf('.create ')+1) {
					createNewRoom(data.toString().substring(8,data.toString().length-1));
					joinRoom(data.toString().substring(8,data.toString().length-1));
				}

				//exit command
				else if(data.toString().substring(0,5).indexOf('.exit')+1) {
					exitRoom(client);
				}

				//join command								
				else if(data.toString().substring(0,6).indexOf('.join ')+1) {
					joinRoom(data.toString().substring(6,data.toString().length-1));
				}

				//start command
				else if(data.toString().substring(0,7).indexOf('.start ')+1) {
					gameStart(data.toString().substring(7,data.toString().length-1));
				}

				else if(data.toString().substring(0,6).indexOf('.rlist')+1) {
					roomList();
				}

				//userList command
				else if(data.toString().substring(0,6).indexOf('.ulist')+1) {
					userList();
				}	else {
					var mes = {message: 'Неизвестная команда. Напиши ".help", чтобы увидеть список доступных команд'};
					cc.write(JSON.stringify(mes));
				}


			} else {
				var timeNow = new Date(milliseconds);
				if(timeNow - client.lastMessegeTime >= 30){
					sendMessageToAllClients({message: data.toString().replace(/\r?\n/g, '')}, client.room);
					client.lastMessegeTime = timeNow;
				}
				else {
					cc.write({message: 'Писать в чат можно только раз в 30 секунд!'});
				}
				
			}
		}
	});




	cc.on('close', ()=>{
		console.log('client closed connection');
		client.onServer = false;
		exitRoom(client);
	});

	cc.on('error', (err)=> {
		console.log(err);
	});

	function roomList() {
		var list = "Список комнат: ";
		for(var room of allRooms)
			list += room.name.replace("\r","")+"; ";
		client.clientCore.write(JSON.stringify({message: list}));
	}

	function moneyCommand() {
		client.clientCore.write(JSON.stringify({message: 'У вас на счету: ' + client.money, money: client.money, name: client.name}));
	}

	function helpCommand() {
		var help = "Команды используемые на сервере: \n";
		help+= "'.ulist' - получить список пользователей на сервере. \n";
		help+= "'.create <name>' - создать новую игровую комнату. И присоеденится к ней. \n";
		help+= "'.join <name>' - подключится к комнате. \n";
		help+= "'.rlist' - получить список комнат. \n";
		help+= "''.start <bet>' - начать игру со ставкой <bet> в комнате. Минимальная ставка - 10. \n";
		help+= "'.exit' - покинуть комнату. \n";
		help+= "'.up <value>' - поднять ставку до <value>. \n";
		help+= "'.exit' - покинуть комнату. \n";
		help+= "'.money' - получить свой счет. \n";
		help+= "'.check' - поддержать ставку. \n";
		help+= "'.fold' - сбросить карты и выйти из игры.";
		message = {message: help, type: "ctc"};
		message.name = "help";
		client.clientCore.write(JSON.stringify(message));
	}

	function gameFold() {
		var myRoom = client.room;

		if(myRoom != null) {
			if(client.inGame) {
				serverSendMessage({message: client.name + " сбросил карты.", name: client.name, step: -1}, client.room);
				client.inGame = false;
				var inGameCount = 0;
				for(var member of myRoom.clientList) {
					if(member.inGame) 
						inGameCount++;
				}
				if(inGameCount == 1) {
					var winner = [];
					for(var member of myRoom.clientList) {
						if(member.inGame) {
							winner.push(member);
							gameWin(myRoom,winner,false);
						}
					}
				}
				nextStep();
			}	else {
				if(client.onServer) 
					client.clientCore.write(JSON.stringify({message: 'Вы не в игре.'}));
			}
		}//необходимо так-же проверить не остался ли лишь один игрок в игре, так-же не ход ли this.client :: присвоить ход следующему игроку в игре
	}
	function gameUp(data) {
		var myRoom = client.room;
		var myBet = parseInt((data.toString().split(' '))[0]);
		var yourStep = client.yourStep;
		
//myRoom.clientList.indexOf(client)+i
//ход должен перейти к следующему игроку комнаты


		if(myRoom != null) {
			if(myRoom.gameContinuously) {
				
				if(yourStep) {
					if(myBet >= myRoom.bet) {	//miss
						if(myRoom.bet == client.moneySpent && myRoom.bet == myBet) {
							client.isCheck = true;
							serverSendMessage({message: client.name + " пропустил.",step: 1}, client.room);
							checkNextGameStage(myRoom);
							nextStep();
						}	else
						if(myBet == myRoom.bet) {	//check
							client.isCheck = true;	
							if(client.money > myBet) {
								client.money -= myBet - client.moneySpent;
								myRoom.bank += myBet - client.moneySpent;
								client.moneySpent = myBet;
								serverSendMessage({message: client.name + " уравнял.", bet: myRoom.bet.toString().replace("\r",""), bank: myRoom.bank, name: client.name, step: 1, money: client.money, yourBet: myBet}, client.room);	
								checkNextGameStage(myRoom);
								nextStep();
							}	else {//myBet>client.money
								myBet = client.money + client.moneySpent;
								myRoom.bank += client.money;
								client.moneySpent += client.money;
								nextStep();
								client.allIn = true;
								serverSendMessage({message: client.name + " пошел ва-банк и поставил: " + myBet.toString().replace("\r",""), bet: myRoom.bet.toString().replace("\r",""), bank: myRoom.bank, name: client.name, step: 1, money: 0, yourBet: myBet}, client.room);
								client.money = 0;
								checkNextGameStage(myRoom);
							}
						}	else {					//up
							if(client.money > myBet) {
								client.money -= myBet - client.moneySpent;
								myRoom.bank += myBet - client.moneySpent;
								client.moneySpent = myBet;
								myRoom.bet = myBet;
								checkDown(myRoom);
								serverSendMessage({message: client.name + " поднял до " + myBet, bet: myRoom.bet.toString().replace("\r",""), bank: myRoom.bank, name: client.name, step: 2, money: client.money, yourBet: myBet}, client.room);
								nextStep();
							}	else {
								myBet = client.money + client.moneySpent;
								myRoom.bank += client.money;
								client.moneySpent += client.money;
								if(myBet >= myRoom.bet)
									myRoom.bet = myBet;
								nextStep();
								client.allIn = true;
								serverSendMessage({message: client.name + " пошел ва-банк и поставил: "+ client.money.toString().replace("\r",""), bet: myRoom.bet.toString().replace("\r",""), bank: myRoom.bank, name: client.name, step: 1, money: 0, yourBet: myBet}, client.room);
								client.money = 0;
							}	
						}
						
					}	else {
						client.clientCore.write(JSON.stringify({message: "Ваша ставка слишком низкая. Ставка в игре: " + myRoom.bet, bet: myRoom.bet}));
					}
				}	else {
					client.clientCore.write(JSON.stringify({message: 'Сейчас не ваш ход.'}));
				}
			}	else {
				client.clientCore.write(JSON.stringify({message: 'Игра еще не началась. ".start" - начать игру.'}));
			}
		}
	}
	//Сбросить клиента
	function clientDown(client) {
		client.yourStep = false;
		client.inGame = false;
		client.isCheck = false;
		client.card1 = null;
		client.card2 = null;
		client.moneySpent = 0;
		client.isCheck = false;
		client.allIn = false;
		if(client.room == null) {
			client.isNowJoined = false;
		}
		serverSendMessage({name: client.name, yourBet: null, money: client.money, card1: null, card2: null}, client.room);
	}
	//сбросить комнату
	function roomDown(room) {
		room.bank = 0;
		room.bet = 0;
		room.cardsOnGame = [];
		room.gameContinuously = false;
		room.stepNow = null;
		room.cardsOnTable = [];
		room.stage = null;
		serverSendMessage({bank: null, bet: null, step: null, cardsOnTable: [], nextStep: null}, room);
	}

	function writeCardOnTable(room) {
		if(room != null) {
			serverSendMessage({cardsOnTable: room.cardsOnTable},room);
		}
	}

	function checkDown(room) {
		for(var member of room.clientList) {
			member.isCheck = false;
		}
	}

	function checkNextGameStage(room) {
		var getNextStage = true;
		for(var member of room.clientList) {
			if(!member.isCheck) 
				getNextStage = false;
		}											//проверили все ли готовы перейти на след этап
		if(getNextStage) {
			checkDown(room);
			if(room.stage == 0) {
				room.stage++;
				room.cardsOnTable.push(getCard(room));
				room.cardsOnTable.push(getCard(room));
				room.cardsOnTable.push(getCard(room));
				writeCardOnTable(room);
			}	else if(room.stage == 1 || room.stage == 2) {
				room.stage++;
				room.cardsOnTable.push(getCard(room));
				writeCardOnTable(room);
			}	else if(room.stage == 3) {
				//конец игры идет подсчёт:
				var winner = [];
				for(var member of room.clientList)
					if(member.inGame)
						winner.push(member);
				gameWin(room,winner,true);
			}
		}

	}

	function gameWin(room,winnerArray, isGameEnd) {
		console.log('Игра окончена');
		var winnerValue = [];
		if(isGameEnd) {
			for(var member of winnerArray) {
				var value = getSetCard(member);
				value.member = member;
				winnerValue.push(value);
				serverSendMessage({crown: value.crown, topCard: value.top, kicker: value.kicker, name: value.member.name}, room);
			}

			winnerValue.sort((a,b)=> {
				if(a.crown == b.crown) {
					if(a.top == b.top) 
							return b.kicker - a.kicker;
					else 
						return b.top - a.top;
				}	else 
					return b.crown - a.crown;
			});

			var cleanWinner = [winnerValue[0]];
			for(var value of winnerValue) {
				serverSendMessage({message: value.member.name + " собрал " + value.member.card1.suit+value.member.card1.card+":"+value.member.card2.suit+value.member.card2.card + " - " + winSet[value.crown]}, room);
				if(cleanWinner[0].crown === value.crown && cleanWinner[0].kicker === value.kicker && cleanWinner[0].top === value.top && cleanWinner[0].member != value.member) 
					cleanWinner.push(value);
			}
			serverSendMessage({message: "Игра окончена. Банк составил: " + room.bank}, room);
			var gain = room.bank/cleanWinner.length;
			var message = "Победили: ";
			for(var winner of cleanWinner) {
				message += winner.member.name + "; ";
				winner.member.money += gain;
				room.bank -= gain;
				serverSendMessage({name: winner.member.name, money: winner.member.money, bank: room.bank}, room);
			}
			serverSendMessage({message: message+"\n"+"Выйгрышь составил: " + gain}, room);
		}	else {
			winnerArray[0].money += room.bank;
			serverSendMessage({message: "Победил: " + winnerArray[0].name + ". И забирает банк в размере: " + room.bank, name: winnerArray[0].name, money: winnerArray[0].money}, room);
		}

		for(var member of room.clientList) {
			dbClient.query("UPDATE clients SET `money`='" + member.money + "' WHERE `name` LIKE '"+member.name+"'", (err)=> {
				if(err) throw err;
			});
		}
		var time = restartTime;
		room.gameContinuously = false;

		timesOut = setInterval(()=>{
			time-=1000;
			
			if(time <= 0) {
				for(var member of room.clientList)//Сбросить всё
					clientDown(member);
				roomDown(room);
				serverSendMessage({message: "Игра закончилась", type: "stc"}, room);
				clearInterval(timesOut);
			}	else
				serverSendMessage({message: "Игра законичится через "+ time/1000 +" секунд", type: "stc"}, room);
					
		}, 1000);

		return null;
	}

	function nextStep() {
		var myRoom = client.room;
		var myPosList = myRoom.clientList.indexOf(client);
		var nextStep;
		var yourStep = client.yourStep;


		if(yourStep) {										///переработать
			client.yourStep = false;
			var i = 1;
			if(i+myPosList > myRoom.clientList.length-1)
				i = -myPosList;							//i+myPosList = 0;
			while(!myRoom.clientList[i+myPosList].inGame || myRoom.clientList[i+myPosList].allIn) {
				i++;
				if(i+myPosList > myRoom.clientList.length-1)
					i = -myPosList;						//i+myPosList = 0;
			}
			nextStep = i+myPosList;							///переработать. Может произойти зацикливание
			if(nextStep == myPosList) {
				console.log('игра окончена');
				for(var i = client.room.cardsOnTable.length; i < 5; i++) 
					client.room.cardsOnTable.push(getCard(client.room));
				var winner = [];
				for(var member of client.room.clientList)
					if(member.inGame)	
						winner.push(member);
				gameWin(client.room,winner,true);
			}	else {
				myRoom.clientList[nextStep].yourStep = true;
				serverSendMessage({message: "Ход перешел к " + myRoom.clientList[nextStep].name, nextStep: myRoom.clientList[nextStep].name}, client.room);
			}
		}
	}

	function gameStart(data) {
		var minBet = data.split(' ')[0];
		if(minBet < 10) 
			minBet = 10;
		var room = client.room;

		for(var member of room.clientList)//Сбросить всё
			clientDown(member);
		roomDown(room);
		clearInterval(timesOut);


		if(room != null) {
			if(room.roomAdministrator == client) {	//Только администратор комнаты может начать игру
				if(client.isNowJoined && !room.gameContinuously) {//если клиент находится в какой-нибудь комнате и игра в комнате еще не начата
					if(room.clientList.length >= 2) {//если игроков в комнате больше 2-ух
						room.gameContinuously = true;//игра началась
						room.clientList[0].yourStep = true; //нулевой игрок получит первый ход
						for(var member of room.clientList) {
							member.room.bet = minBet;	//Установим минимальную ставку
							member.inGame = true;		//Клиент в игре
							member.card1 = getCard(room);//раздать карты
							member.card2 = getCard(room);
							member.clientCore.write(JSON.stringify({message: 'Игрок ' + client.name + ' начал игру в этой комнате.\n'+('Начальная ставка в игре: ' + minBet).replace("\r",""), bet: minBet.toString().replace("\r",""),name: member.name, card1: member.card1, card2: member.card2}));
							//message: 'Ваши карты: ' + member.card1.suit+member.card1.card + '; ' + member.card2.suit+member.card2.card
						}
						room.stage = 0;
						writeCardOnTable(room);
						serverSendMessage({message: "Ходит: " + room.clientList[0].name, nextStep: room.clientList[0].name}, room);

					}	else {
						client.clientCore.write(JSON.stringify({message: 'для начала игры необходимо 2 и более человека.'}));
					}
				}	else {
					client.clientCore.write(JSON.stringify({message: 'Игру можно начать только находясь в комнате, и только если игра ещё не идет.'}));
				}
			}	else {
				client.clientCore.write(JSON.stringify({message: 'Только администратор комнаты может начать игру.'}));
			}
		}	else {
			client.clientCore.write(JSON.stringify({message: "Игру можно начать только в комнате."}));
		}
	}

	function exitRoom(client) {
		if(client.room != null) {
			client.isNowJoined = false;
			if(client.onServer) {
				gameFold();
				client.room.clientList.splice(client.room.clientList.indexOf(client), 1);
				//удаление комнаты или смена администратора
				if(client.name === client.room.roomAdministrator.name){
					var newRoomAdministrator = null;
					for(var member of client.room.clientList) 
						newRoomAdministrator = member;
					if(newRoomAdministrator != null) {
						client.room.roomAdministrator = newRoomAdministrator;
						serverSendMessage({message: "Игрок " + newRoomAdministrator.name + " стал новым администратором комнаты."}, client.room);
					}
					else 
						for(var selectRoom of allRooms) 
							if(selectRoom.clientList.length == 0)
								allRooms.splice(allRooms.indexOf(selectRoom), 1);//комната больше не существует
				}
				client.room.nameClientsOnRoom.splice(client.room.nameClientsOnRoom.indexOf(client.name));
				serverSendMessage({message: "Игрок " + client.name + " покинул комнату",clientsOnRoom: client.room.nameClientsOnRoom},client.room);
				client.clientCore.write(JSON.stringify({message: 'Вы покинули комнату: ' + client.room.name}));
				
				clientDown(client);
				client.room = null;
			}	else {
				gameFold();
				client.room.clientList.splice(client.room.clientList.indexOf(client), 1);
				client.room.nameClientsOnRoom.splice(client.room.nameClientsOnRoom.indexOf(client.name));
				serverSendMessage({message: "Игрок " + client.name + " покинул комнату",clientsOnRoom: client.room.nameClientsOnRoom},client.room);
				clientDown(client);
			}
		}	else {
			var clientsOnNullRoom = [];
			for(var member of allClients) 
				if(member.room == null && member.onServer)
					clientsOnNullRoom.push(member.name);
			serverSendMessage({clientsOnRoom: clientsOnNullRoom}, null);
			
		}
		
	}

	function joinRoom(name) {
		var isRoomExist = false;
		if(!client.isNowJoined) {
			for(var room of allRooms) {
				if(room.name == name) {
					isRoomExist = true;
					if(room.clientList.length <= 5) {
						room.clientList.push(client);
						room.nameClientsOnRoom.push(client.name);
						client.room = room;
						//рассказать всем, что я ушел
						var clientsOnNullRoom = [];
						for(var member of allClients) 
							if(member.room == null && member.onServer)
								clientsOnNullRoom.push(member.name);
						serverSendMessage({clientsOnRoom: clientsOnNullRoom}, null);

						serverSendMessage({message: "Игрок " + client.name + " вошел в комнату ("+room.clientList.length+"/6)",clientsOnRoom: room.nameClientsOnRoom}, room);
						client.clientCore.write(JSON.stringify({message: 'Вы подключились к комнате: ' + room.name, room: room.name}));
						client.isNowJoined = true;
					}	else {
						client.clientCore.write(JSON.stringify({message: 'В комнате слишком много участвников.'}));
					}
				}
			}
			if(!isRoomExist) {
				client.clientCore.write(JSON.stringify({message: 'Комната не существует'}));
			}
		}
		else {
			client.clientCore.write(JSON.stringify({message: 'Вы уже состоите в комнате: ' + client.room.name, room: client.room.name}));
		}
	}

	function createNewRoom(name) {
		var isNotExist = true;
		for(var room of allRooms) 
			if(room.name == name) 
				isNotExist = false;
		if(isNotExist) {
			var room = new _Room(name);
			allRooms.push(room);
			console.log("Игрок: " + client.name+":" + " - создал комнату: " + room.name);
			serverSendMessage({message: "Игрок: " + client.name+ " - создал комнату: " + room.name, type: "stc"}, null);
		}
		
	}

	function userList() {	//Начало древнего кода
		var allCL = 'Сейчас на сервере: ';
		var iteration = 0;
		for(var client of allClients) {
			if(client.onServer) {
				if(iteration != 0) 
					allCL += ', ';
				allCL += client.name;
				iteration++;
			}
		}
		allCL += ';'

		cc.write(JSON.stringify({message: allCL}));
	}						//конец древнего кода

	function registration(data) {
		var namePass = data.toString().split(' ');
		var name = namePass[0].replace(/\r?\n/g, '').replace(' ', '');	

		if(namePass.length > 2) {//регистрация
			var password = md5(namePass[1].replace(/\r?\n/g, ''));
			var rePassword = md5(namePass[2].replace(/\r?\n/g, ''));
			password = password.replace(' ', '');
			rePassword = rePassword.replace(' ', '');

			if(namePass[0] != '' && namePass[1] != '') {

				if(password == rePassword) {
					var nameIsExist = false;//если имя не зянято
					for(var member of allClients) {
						if(member.name == name)
							nameIsExist = true;
					}
					if(!nameIsExist) {
						client.name = name;
						client.password = password;
						client.clientCore = cc;
						client.money = 10000;	//Нужно как-то фармить деньги
						client.onServer = true;

						allClients.push(client);
						var clientsOnNullRoom = [];
						for(var member of allClients) 
							if(member.room == null && member.onServer)
								clientsOnNullRoom.push(member.name);
						
						dbClient.query('INSERT INTO clients  (name, password, money) VALUES ("'+ client.name +'", "'+ client.password +'", "'+ client.money + '");', (err,result)=> {
							if (err) throw err;
						});

						cc.write(JSON.stringify({message: 'Регистрация прошла успешно', yourName: client.name, money: client.money, room: null, name: client.name}));
						cc.write(JSON.stringify({message: "Узнай как начать играть, пиши: .help!", yourName: client.name, money: client.money, room: null, name: client.name}));
						serverSendMessage({message: client.name + " подключился к серверу"}, null);
						serverSendMessage({clientsOnRoom: clientsOnNullRoom}, null);
						console.log('Registered new user: ' + name);
					}	else {
						cc.write(JSON.stringify({message: 'Это имя уже занято'}));
					}
				}	else {
					cc.write(JSON.stringify({message: 'Пароли не совпадают'}));
				}	
			}	else {
					cc.write(JSON.stringify({message: 'Имя и пароль не может быть пустым.'+'Для регистрации пиши: <имя> <пароль> <пароль>. Для авторизации <имя> <пароль>'}));
			}
		}	else if(namePass.length == 2) {//авторизация
			var password = md5(namePass[1].replace(/\r?\n/g, '').replace(' ', ''));
			var isTruePass = false;
			for(var member of allClients) {
				if(member.name == name && member.password == password) {
					client = member;
					client.money = member.money;
					client.name = name;
					client.clientCore = cc;
					client.onServer = true;
					serverSendMessage({message: client.name + " подключился к серверу"}, null);
					client.clientCore.write(JSON.stringify({message: 'С возвращением, ' + client.name, yourName: client.name, money: client.money, name: client.name}));
					console.log('User authentication done: ' + name);
					isTruePass = true;
				}
			}
			if(!isTruePass) {
					cc.write(JSON.stringify({message: 'Неправильный логин или пароль'}));
				}
		}	else {
			cc.write(JSON.stringify({message: 'Для регистрации пиши: <имя> <пароль> <пароль>. Для авторизации <имя> <пароль>'}));
		}	
	}

	function sendMessageToAllClients(message, room) {
		console.log(cc.address().address + ": " + message.message);

		for(var member of allClients) {
			if(member.onServer)
				if(member.room == room) {
					if(room == null) {
						message.name = client.name;
						message.room = null;
						message.type = "ctc";//client to client
						member.clientCore.write(JSON.stringify(message));
					}
					else {
						message.room = room.name.replace("\r","");
						message.name = client.name;
						message.type = "ctc";//client to client
						member.clientCore.write(JSON.stringify(message));
					}
				}
		}
	}

	function serverSendMessage(message, room) {
		for(var member of allClients) {
			if(member.room == room) {
				if(member.onServer)
					member.clientCore.write(JSON.stringify(message));
			}
		}
	}

	function getSetCard(client) {
		var CrownValue = 0;	// 0 - 9
		var kicker = 0;
		var topCard = 0;
		var room = client.room;
		var cards = [];
		var cardsOnHand = [];
		var suitsName = [];
		var valueCounts = [];
		var countH = 0;
		var countC = 0;
		var countD = 0;
		var countS = 0;
		//стрит:
		var allStreet = [];
		//хаус.
		var allChaos = [];
		cardsOnHand.push({card: client.card1, value: H.indexOf(client.card1.card)});
		cardsOnHand.push({card: client.card2, value: H.indexOf(client.card2.card)});

		cards.push({card: client.card1, value: H.indexOf(client.card1.card)});
		cards.push({card: client.card2, value: H.indexOf(client.card2.card)});
		suitsName.push(client.card1.suit);
		suitsName.push(client.card2.suit);
		for(var i = 0; i<5; i++) {
			cards.push({card: room.cardsOnTable[i], value: H.indexOf(room.cardsOnTable[i].card)});
			suitsName.push(room.cardsOnTable[i].suit);
		}
									// Имеем все карты доступные для клиента
		for(var i = 0; i<7; i++) {	//Считаем количество повторений одной масти
			if(suitsName[i] == 'H') 
				countH++;
			else if(suitsName[i] == 'C')
				countC++;
			else if(suitsName[i] == 'D')
				countD++;
			else if(suitsName[i] == 'S')
				countS++;
		}


		cards.sort((a,b)=> {
			return a.value - b.value;
		});								//сортируем по возрастанию
		
		var valuesArray = [];			//получаем чистые значения карт
		for(var i = 0; i < 7; i++) 
			valuesArray.push(cards[i].value);

		for(var i = 0; i < 7; i++) {	//считаем количество всех значений
			var count = 0;
			for(var j = 0; j < 7; j++) {
				if(valuesArray[i] == valuesArray[j]) 
					count++;
			}
			valueCounts.push({value: valuesArray[i], count: count});
		}
		
		for(var i = 0; i < 7; i++)			//все случаи стрита
			allStreet.push(valuesArray.indexOf(i) != -1 && valuesArray.indexOf(i+1) != -1 && valuesArray.indexOf(i+2) != -1 && valuesArray.indexOf(i+3) != -1 &&  valuesArray.indexOf(i+4)  != -1);
		var fullChaos = (valueCounts[0].count == 3 || valueCounts[1].count == 3 || valueCounts[2].count == 3 || valueCounts[3].count == 3 || valueCounts[4].count == 3 ||valueCounts[5].count == 3 || valueCounts[6].count == 3) && (valueCounts[0].count == 2 || valueCounts[1].count == 2 || valueCounts[2].count == 2 || valueCounts[3].count == 2 || valueCounts[4].count == 2 ||valueCounts[5].count == 2 || valueCounts[6].count == 2);
		var setNumber = 0;
		while(setNumber < 7 && valueCounts[setNumber].count != 3) {
			setNumber++;
		}

		var duoNumber = 0;
		while(duoNumber <7 && valueCounts[duoNumber].count != 2)
			duoNumber++;

		//младший - нулевой
		if(countH >= 5 || countC >= 5 || countD >= 5 || countS >= 5) {//Роял флеш(бродвей): 
			if(valuesArray.indexOf(11) != -1 && valuesArray.indexOf(10) != -1 && valuesArray.indexOf(9) != -1 && valuesArray.indexOf(8) != -1 && valuesArray.indexOf(7) != -1) {
				CrownValue = 9;	//Р-Ф

			}	else if(allStreet[0] || allStreet[1] || allStreet[2] || allStreet[3] || allStreet[4] || allStreet[5] || allStreet[6]) {
				CrownValue = 8;	//street флеш

			}	else {
				CrownValue = 5;	//флеш
				topCard = cardsOnHand[0].value > cardsOnHand[1].value ? cardsOnHand[0].value : cardsOnHand[1].value;
				kicker = cardsOnHand[0].value > cardsOnHand[1].value ? cardsOnHand[1].value : cardsOnHand[0].value;

			}
		}	else if(valueCounts[0].count == 4 || valueCounts[1].count == 4 || valueCounts[2].count == 4 || valueCounts[3].count == 4 || valueCounts[4].count == 4 || valueCounts[5].count == 4 || valueCounts[6].count == 4) {
			CrownValue = 7;//каре
			var i = 0;
			var j = 6;

			while(valueCounts[i].count != 4 && i < 7) 
				i++;
			while(valueCounts[j].value == valueCounts[i] && j>=0)
				j--;

			kicker = valueCounts[j].value;
		}	else if(fullChaos) {
			var i = 0;	//фх
			var j = 0;

			while(valueCounts[i].count != 3 && i < 7) 
				i++;
			while(valueCounts[j].count != 2 && j < 7)
				j++;
			topCard = valueCounts[i].value;
			kicker = valueCounts[j].value;
			CrownValue = 6;
		}	else if(allStreet[0] || allStreet[1] || allStreet[2] || allStreet[3] || allStreet[4] || allStreet[5] || allStreet[6]) {
			CrownValue = 4;
			var i = 6;

			while(allStreet[i] && i >= 0)
				i--;
			topCard = i+4;
		}	else if(setNumber < 7) {
			CrownValue = 3;
			topCard = valueCounts[setNumber].value;
			var i = 6;

			while(valuesArray[i] == valueCounts[setNumber].value && i>=0)
				i--;
			kicker = valuesArray[i];
		}	else if(duoNumber < 7) {
			var duoNumber2 = duoNumber+2;

			while(duoNumber2 < 7 && valueCounts[duoNumber2].count != 2) 
				duoNumber2++;
			
			if(duoNumber2 < 7) {
				CrownValue = 2;
				topCard = cardsOnHand[0].value > cardsOnHand[1].value ? cardsOnHand[0].value : cardsOnHand[1].value;
				kicker = cardsOnHand[0].value != topCard ? cardsOnHand[0].value : cardsOnHand[1].value;
			}	else {
				CrownValue = 1;
				topCard = valueCounts[duoNumber].value;
				kicker = cardsOnHand[0].value != topCard ? cardsOnHand[0].value : cardsOnHand[1].value;
			}
		}	else {
			CrownValue = 0;
			topCard = cardsOnHand[0].value > cardsOnHand[1].value ? cardsOnHand[0].value : cardsOnHand[1].value;
			kicker = cardsOnHand[0].value > cardsOnHand[1].value ? cardsOnHand[1].value : cardsOnHand[0].value;
		}
		
		return {crown: CrownValue, top: topCard, kicker: kicker};

	}

	function getCard(room) {
		var suit = cards[randomInteger(0,3)].name;
		var card = {suit: suit, card: H[randomInteger(0,11)]};
		var cardString = card.suit+card.card;

		while(room.cardsOnGame.indexOf(cardString) != -1) {
			suit = cards[randomInteger(0,3)].name;
			card = {suit: suit, card: H[randomInteger(0,11)]};
			cardString = card.suit+card.card;
		}

		room.cardsOnGame.push(cardString);
		
		return card;
	}

	function randomInteger(min, max) {
	    var rand = min - 0.5 + Math.random() * (max - min + 1)
	    rand = Math.round(rand);
	    return rand;
	}


}).listen('7000');

console.log('listening on port 7000');



///задачи
/*
	1) подключить к sql
	2) написать ядро игры (объект)
	3) написать комманды
	4) 
*/



//	function gameIteration(room) {
		//игрока минимум 2
		//игрока максимум 5
		//раздаются карты
		//пока все не чек - идет игра
		//все чек - открыть 3 карты
		//				_____________________________________________________________________________
		//				|ВРЕМЯ | счет | рука  | карты на столе | Общаг 		| мин. ставка | статус  |
		// 				|16:34 | 5000 | H5 CA | ** ** ** ** ** | 300		| 20		  | ваш ход |
		//
		//пока все не чек - идет игра
		//все чек - открыть 1 карту
		//пока все не чек - идет игра
		//все чек - открыть 1 карту
		//пока все не чек - идет игра
		//все чек - открыть карты игроков
		//раздать общаг
		//var clients = room./clientList;
		//var needOpenCard = false;
		//var isHandsEmpty = false;




		//if(clients.length >=2) {
		//	if(!cardsHanedOut) {
		//		for(var client of clients) {
		//			if(!needOpenCard) {
		//				var suit1 = randomInteger(0,3);
		//				var suit2 = randomInteger(0,3);
//
//						client.card1 = cards(suit1)[randomInteger(0,11)];
//						client.card2 = cards(suit1)[randomInteger(0,11)];
//					}
//					if()
//				}
//			}
//			
//			for(var client of clients) {
//				if(client.gameStatus == 'check') {
//					needOpenCard = true;
//				}
//			}
//			if(cardsOnTable.length < 5 && needOpenCard) {
//				if(cardsOnTable.length == 0) {
//					//открыть 3
//				}
//				if(cardsOnTable.length == 3) {
//					//открыть 1
//				}
//				if(cardsOnTable.length == 4) {
//					//открыть 1
//				}
//			}
//

			



//		}
