const net = require('net');
const connect = require('./connect');
var name = '';
const winSet = ['Старшая карта', 'Пара', 'Две пары', 'Сет', 'Стрит', 'Флеш', 'Фулл хаус', 'Каре', 'Стрит флеш', 'Роял флеш'];
			//Чер  буб пики  крес
const suit = ['H','D', 'S', 'C'];
const suitReplace = ['♥','♦','♠','♣'];
var me = {
	name: null, 		//personal
	card1: null,		//personal
	card2: null,		//personal
	cardsOnTable: [],
	bank: null,
	bet: null,
	nextStep: null,
	step: null,			//personal
	money: null,		//personal
	message: [],
	system: [],
	crown: null,		//personal
	topCard: null,		//personal
	kicker: null,		//personal
	yourBet: null		//personal
};
var clientsOnRoom = [];
var _Client = function(name) {
	this.name = name;	//personal
	this.yourBet;		//personal
	this.card1;			//personal
	this.card2;			//personal
	this.money;			//personal
	this.step;			//personal
	this.crown;			//personal
	this.topCard;		//personal
	this.kicker;		//personal
}
var interface = ["комната","счет","рука","банк","ставка - ваша","ход"];
interface = addStringSpace(interface);
var interfaceCardsOnTable = " карты на столе ";

//			
//			| комната | счет | рука  | карты на столе | банк 		| ставка - ваша | ход	   |
// 			| room    | 5000 | H5 CA | ** ** ** ** ** | 300		    |   20	 -	10	| ваш	   |
//

const client = new net.Socket();
client.setEncoding('utf8');
console.log("connecting to  "+ connect.ip+":"+connect.port+"....");
client.connect(connect.port, connect.ip);

process.stdin.resume();//Открываем консоль для ввода

client.on('close', ()=>{
	console.log('connection is closed');
});
//Отправка сообщений
process.stdin.on('data', (data)=> {
	
	
	client.write(data);
});
//Прием сообщений

client.on('data', function(data) {
	//console.log('\033[2J');
	var event = [];
	//менее говнокодистый говнокод
	data = data.replace(new RegExp("}{",'g'),'}|{');
	sData = data.split('|');
	for(var i = 0; i < sData.length; i++) 
		event.push(JSON.parse(sData[i]));
	
	for(var i = 0; i < event.length; i++) { //обработка json данных
		if(event[i].yourName) 
			me.name = event[i].yourName;
		if(event[i].message) {
			var message = event[i].message.split('\n');
			for(var mes of message) 
				if(event[i].type)
					if(event[i].type == "ctc")
						saveMessageToBuffer(event[i].name+": "+mes);
					else 
						saveSystemToBuffer(mes);
				else
					saveSystemToBuffer(mes);
		}
		if(event[i].clientsOnRoom) {
			clientsOnRoom = [];	//сбросим список игроков в комнате
			for(var nameClient of event[i].clientsOnRoom) 
				if(nameClient != me.name)
					clientsOnRoom.push(new _Client(nameClient));
			//Клиент создан. Список обновлен
		}
		if(typeof event[i].nextStep != 'undefined')
			if(event[i].nextStep != null)	me.nextStep = event[i].nextStep.replace("\r","");
			else me.nextStep = null;
		if(typeof event[i].bet != 'undefined')
			me.bet = event[i].bet;
		if(typeof event[i].bank != 'undefined')
			me.bank = event[i].bank;
		if(typeof event[i].room != 'undefined')	
			if(event[i].room != null) me.room = event[i].room.replace("\r","");
			else me.room = null;
		if(typeof event[i].cardsOnTable != 'undefined')
			me.cardsOnTable = event[i].cardsOnTable;


		if(event[i].name) {//Обработка всех личных данных
			var user;
			if(event[i].name == me.name) //Получили абстрактную модель, которой не важно с кем ей работать
				user = me;
			else 
				for(var client of clientsOnRoom) //извлекаем клиента из массива
					if(client.name == event[i].name)
						user = client;
			if(user) {
				if(typeof event[i].money != 'undefined') 
					user.money = event[i].money;
				if(typeof event[i].card1 != 'undefined')
					user.card1=event[i].card1;
				if(typeof event[i].card2 != 'undefined')
					user.card2=event[i].card2;
				if(typeof event[i].step != 'undefined')
					user.step = event[i].step;
				if(typeof event[i].crown != 'undefined')
					user.crown = event[i].crown;
				if(typeof event[i].topCard != 'undefined')
					user.topCard = event[i].topCard;
				if(typeof event[i].kicker != 'undefined')
					user.kicker = event[i].kicker;
				if(typeof event[i].yourBet != 'undefined')
					user.yourBet = event[i].yourBet;
			}
		}
	}
	return reloadScreenControl();
});

function reloadScreenControl() {
	//КОД ВЫПОЛНЯЕТСЯ СЛИШКОМ МЕДЛЕННО
	var card1 = me.card1;
	var card2 = me.card2;
	var bet = me.bet;
	var yourBet = me.yourBet;
	if(card1 == null) {
		var card1 = {};
		card1.suit = "*";
		card1.card = "*";
	}	
	if(card2 == null){
		var card2 = {};
		card2.suit = "*";
		card2.card = "*";
	}	
	for(var i = 0; i < 4; i++) {
		if(card1.suit == suit[i])
			card1.suit = suitReplace[i];
		if(card2.suit == suit[i])
			card2.suit = suitReplace[i];
	}
	if(bet == null)
		bet = "**";
	if(yourBet == null)
		yourBet = "**";
	if(!me.name)
		me.name == "**";
	var interfaceData = fullThePole([me.room, me.money, card1.suit+card1.card + " " + card2.suit+card2.card, me.bank, bet + " - " + yourBet, me.nextStep]);	//all data about game without data about cards on the table
	interfaceData = addStringSpace(interfaceData);
	var subInterface = interface.slice();//copy
	var cardsOnTable = me.cardsOnTable.slice();//copy //yeah, it's cards on the table

	interfaceData = equalizeArray(interfaceData, subInterface);
	subInterface = equalizeArray(subInterface, interfaceData);

	for(var i = 0; i < cardsOnTable.length; i++)
		for(var j = 0; j < 4; j++)
			if(cardsOnTable[i].suit == suit[j])
				cardsOnTable[i].suit = suitReplace[j];

	for(var i = cardsOnTable.length; i < 5; i++)//hide empty cards
		cardsOnTable.push({suit: "*", card: "*"});	
	reloadScreen(subInterface, interfaceData, interfaceCardsOnTable, cardsOnTable, me.message, me.system);
	//ПОКА ВЫПОЛНЯЕТСЯ КОД КЛИЕНТ МОЖЕТ ПРОПУСТИТЬ МНОЖЕСТВО СООБЩЕНИЙ
	//РЕШЕНИЕ: вынести этот код колбеком колбэка и обрабатывать только пока нет новых данных
	//Я поместил колбек в твой колбек, чтобы получать колбек пока ты получаешь колбэк
}

function reloadScreen(interface, interfaceData, interfaceCardsOnTable, cardsOnTable, messages, systems) {
	//нужно отрисовать дату в виде таблицы(построить ровную таблицу независящую от даты в ней)
	var lines = process.stdout.getWindowSize()[1];
	

	var underscoreLine = "";
	var width = process.stdout.getWindowSize()[0];
	for(var i = 0; i < width; i++)
		underscoreLine += "_";
	console.log(underscoreLine);
	
	var table = " ";
	for(var s of cardsOnTable) 
		table += s.suit+s.card + " ";
		
	var line = interface[0] + "|" + interface[1] + "|" + interface[2] + "|" + interface[3] + "|" + interfaceCardsOnTable + "|" + interface[4] + "|" + interface[5] + "| " + me.name + " |";
	console.log(line);
	line = interfaceData[0] + "|" + interfaceData[1] + "|" + interfaceData[2] + "|" + interfaceData[3] + "|" + table + "|" + interfaceData[4] + "|" + interfaceData[5] + "|";
	console.log(line);

	underscoreLine = "";
	var width = process.stdout.getWindowSize()[0];
	for(var i = 0; i < width; i++)
		underscoreLine += "_";
	console.log(underscoreLine);

	console.log("Система: ");
	var consoleSystems = [];
	//output systems
	var c = 8;
	if(width < 100) 
		c = 12;

	for(var i = c; i < lines/3+4; i++) {
		var sN = systems.length - lines/3-4;	//number to start write
		if(typeof systems[Math.floor(sN + i)] == "undefined") 
			consoleSystems.push("");
		else
			consoleSystems.push("s:" + systems[Math.floor(sN + i)]);
	}

	for(var i = 0; i < consoleSystems.length; i++)
		console.log(consoleSystems[i]);

	underscoreLine = "";
	var width = process.stdout.getWindowSize()[0];
	for(var i = 0; i < width; i++)
		underscoreLine += "_";
	console.log(underscoreLine);

	console.log("Сообщения: ");
	var consoleMessages = [];
	//output messages
	for(var i = 0; i < lines/3*2-4; i++) {
		var sN = messages.length - lines/3*2 + 4;	//number to start write
		if(typeof messages[Math.floor(sN + i)] == "undefined") 
			consoleMessages.push("");
		else
			consoleMessages.push(" *" + messages[Math.floor(sN + i)]);
	}
	

	for(var i = 0; i < consoleMessages.length; i++)
		console.log(consoleMessages[i]);
}

function saveMessageToBuffer(message) {
	var lines = process.stdout.getWindowSize()[1];
	if(me.message.length > lines/3*2) {
		me.message.splice(0, me.message.length-lines/3*2+1);
	}
	me.message.push(message.replace("\r",""));
}

function saveSystemToBuffer(message) {
	var lines = process.stdout.getWindowSize()[1];
	if(me.system.length > lines/3) {
		me.system.splice(0, me.system.length-lines/3+1);
	}
	me.system.push(message.replace("\r",""));
	console.log(me.system.length);
}

function randomInteger(min, max) {
    var rand = min - 0.5 + Math.random() * (max - min + 1);
    rand = Math.round(rand);
    return rand;
}

function addStringSpace(arrayStrings) {
		for(var i = 0; i < arrayStrings.length; i++) {
				arrayStrings[i] = " " + arrayStrings[i];
				arrayStrings[i] += " ";
		}

		return arrayStrings;
}

function fullThePole(arrayData) {
	for(var i = 0; i < arrayData.length; i++)
		if(arrayData[i] == null || arrayData[i] == "")
			arrayData[i] = "**";

	return arrayData;
}

function equalizeArray(first, second) {
	for(var i = 0; i < first.length; i++) {
		if(first[i].length > second[i].length) {
			var spaceLength =  (first[i].length - second[i].length)/2;
			second[i] = _equalizeString(second[i], spaceLength);
		}	else {
			var spaceLength = (second[i].length - first[i].length)/2;
			first[i] = _equalizeString(first[i], spaceLength);
		}
		
	}

	return first;
}

function _equalizeString(string, spaceLength) {
	if(spaceLength%2 == 0)
		for(var i = 0; i < spaceLength; i++) {
			string = " " + string;
			string += " ";
		}
	else  {
		for(var i = 0; i < spaceLength-1; i++) //если взять 5, то получим 2.5 так что придется разбить на 2 цикла.
			string = " " + string;
		for(var i = 0; i < spaceLength; i++) //во втором цикле вычтем 1, чтобы получились равные строки
			string += " ";
	}

	return string;
}
