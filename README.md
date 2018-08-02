# Texas Hold’em poker 
I create server and client for playing poker. And it's works!
# How to start?
 You need install on you'r PC node.js (min: 8.11.3 LTS).
 You need to start server. In cmd writte (node <path>\server.js )
 Install on your server pc mysql and create table: 
 ##example: "create table clients (`id` int(11) not null auto_increment, `name` char(128) CHARACTER SET utf8 COLLATE utf8_bin, `password` char(128) not null, `money` int(32), primary key (`id`));"
 Now in server.js set your db_name, db_password and db_ip. Congratulations, you start poker-server.
# Connect
 If you want connect to you server from you PC you need write on connect.js in connect.ip pole you'r ip, i.e. "localhost"
 If you want connect to remote server then you need write on connect.js in connect.ip pole remote server ip.
# Language
 Server written for native of Russian on Russian language.
# Help
 To start play you need write in console ".help" and you get all commands available on server.
