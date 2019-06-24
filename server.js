const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
var io = require('socket.io')(http);

var Game = require('./src/Game').Game;

rooms = {}
players = {}
games = {}

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});

io.on('connection', function(socket){
    socket.on('disconnect', function(){
        console.log(socket.id + ' disconnected');
    });

    socket.on('debug', function(data){
        console.log('Get debug cmd : ' + data['cmd'])
        eval(data['cmd']);
    });

    socket.on('init', function(pseudo){
        let list_names = [];
        socket.pseudo = pseudo;
        console.log('Récupère liste parties : ' + pseudo)
        for (let key in rooms) {
            if (rooms[key].length == 1){
                list_names.push({'id': key, 'pseudo': rooms[key][0].pseudo})
            }
        }
        list_names.push({'id': socket.id, 'pseudo': 'Nouvelle partie'})
        socket.emit('list_rooms', list_names);
    });

    socket.on('init_debug', function() {
        id = 'banana';
        socket.join(id)
        socket.room = id;
        players[socket.id] =  socket;
        if (!(id in rooms)) {
            socket.pseudo = 'K';
            rooms[id] = [socket];
            console.log(socket.pseudo + ' crée une partie');
        } else {
            socket.pseudo = 'L';
            rooms[id].push(socket);
            socket.opp = rooms[id][0].id;
            players[socket.opp].opp = socket.id;
            console.log(socket.pseudo + ' affronte ' + players[socket.opp].pseudo);
            games[id] = new Game(rooms[id]);
            games[id].start_game()
        }
    });

    socket.on('join_room', function(id){
        socket.join(id)
        socket.room = id;
        players[socket.id] =  socket;
        if (id == socket.id) {
            rooms[id] = [socket];
            console.log(socket.pseudo + ' crée une partie');
        } else {
            rooms[id].push(socket);
            socket.opp = id;
            players[id].opp = socket.id;
            console.log(socket.pseudo + ' affronte ' + players[socket.opp].pseudo);
            games[id] = new Game(rooms[id]);
            games[id].start_game()
        }
    });

    // FOR DEBUG ONLY =====================
    socket.on('cmd', function(data) {
        socket.emit(data.cmd, data.data);
    });
    // ====================================
});

app.use(express.static('.'));
http.listen(8080, function(){
    console.log('listening on *:8080');
});
