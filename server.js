const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
var io = require('socket.io')(http);

rooms = {}
players = {}

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
        console.log(socket.id + ' -> ' + pseudo)
        for (let key in rooms) {
            if (rooms[key].length == 1){
                list_names.push({'id': key, 'pseudo': rooms[key][0].pseudo})
            }
        }
        list_names.push({'id': socket.id, 'pseudo': 'Nouvelle partie'})
        socket.emit('list_rooms', list_names);
    });

    socket.on('join_room', function(id){
        rooms[id] = (id == socket.id) ? [] : rooms[id]
        socket.join(id);
        rooms[id].push(socket);
        console.log(socket.pseudo + ' rejoint ' + id);
    });
});

app.use(express.static('.'));
http.listen(8080, function(){
    console.log('listening on *:8080');
});
