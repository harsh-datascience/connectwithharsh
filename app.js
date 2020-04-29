const fs = require('fs')
const express = require('express')
const http = require('http')
var cors = require('cors')
const app = express()
const bodyParser = require('body-parser')
const path = require("path")

var server = http.createServer(app);
var io = require('socket.io')(server);

app.use(cors())
app.use(bodyParser.json())

if(process.env.NODE_ENV==='production'){
	app.use(express.static(__dirname+"/build"))
	app.get("*", (req, res, next) => {
		res.sendFile(path.join(__dirname+"/build/index.html"))
	})
}
app.set('port', (process.env.PORT || 4001))


connections = {}

messages = {}

io.on('connection', function(socket){

	socket.on('join-call', (path) => {
		if(connections[path] === undefined){
			connections[path] = []
		}
		connections[path].push(socket.id);

		for(let a = 0; a < connections[path].length; ++a){
			io.to(connections[path][a]).emit("user-joined", socket.id, connections[path]);
		}

		if(messages[path] !== undefined){
			for(let a = 0; a < messages[path].length; ++a){
				io.to(socket.id).emit("chat-message", messages[path][a]['data'], messages[path][a]['sender']);
			}
		}

		console.log(connections)
	});

	socket.on('signal', (toId, message) => {
		io.to(toId).emit('signal', socket.id, message);
	});

	// socket.on("message", function(data){
	// 	io.sockets.emit("broadcast-message", socket.id, data);
	// })

	socket.on('chat-message', function(data) {
		var key;
		var ok = false
		for (const [k, v] of Object.entries(connections)) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k
					ok = true
				}
			}
		}

		if(ok === true){
			if(messages[key] === undefined){
				messages[key] = []
			}
			messages[key].push({"sender": socket.id, "data": data})

			for(let a = 0; a < connections[key].length; ++a){
				io.to(connections[key][a]).emit("chat-message", data, socket.id);
			}
		}
	})

	socket.on('disconnect', function() {
		var key;
		for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k

					for(let a = 0; a < connections[key].length; ++a){
						io.to(connections[key][a]).emit("user-left", socket.id);
					}
			
					var index = connections[key].indexOf(socket.id);
					connections[key].splice(index, 1);
				}
			}
		}
	})
});


server.listen(app.get('port'), () => {
	console.log("listening on", app.get('port'))
})