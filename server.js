const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
var io = require('socket.io')(http);

var Game = require('./src/Game').Game;

rooms = {}
player_sockets = {}
games = {}

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});

io.on('connection', function(socket){
    socket.on('disconnect', function(){
        // TODO: garder la connection en cas de refresh
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
        player_sockets[socket.id] =  socket;
        if (!(id in rooms)) {
            socket.pseudo = 'K';
            rooms[id] = [socket];
            console.log(socket.pseudo + ' crée une partie');
        } else {
            socket.pseudo = 'L';
            rooms[id].push(socket);
            socket.opp = rooms[id][0].id;
            player_sockets[socket.opp].opp = socket.id;
            console.log(socket.pseudo + ' affronte ' + player_sockets[socket.opp].pseudo);
            games[id] = new Game(rooms[id]);
            games[id].start_game()
        }
    });

    socket.on('join_room', function(id){
        socket.join(id)
        socket.room = id;
        player_sockets[socket.id] = socket;
        if (id == socket.id) {
            rooms[id] = [socket];
            console.log(socket.pseudo + ' crée une partie');
        } else {
            rooms[id].push(socket);
            socket.opp = id;
            player_sockets[id].opp = socket.id;
            console.log(socket.pseudo + ' affronte ' + player_sockets[socket.opp].pseudo);
            games[id] = new Game(rooms[id]);
            games[id].start_game()
        }
    });

    socket.on('choix_prodige', function(prodige){
        let game = games[socket.room];
        let player = game.players[socket.id]
        console.log(player.pseudo + ' joue ' + prodige);
        if (game.choix == 'prodige' && prodige in player.prodiges) {
            let p = player.prodiges[prodige]
            if (p.available) {
                player.played_prodige = p;
                p.available = false;
                console.log('... validé')
                socket.emit('drop_validated');
            } else {
                console.log('...non validé (!available)')
                socket.emit('drop_not_validated');
            }
        } else {
            console.log('...non validé (choix invalide ou prodige not in prodiges)')
            socket.emit('drop_not_validated');
        }
    });

    socket.on('valide_choix_prodige', function(){
        // TODO: CONTINUE       
    });

    // FOR DEBUG ONLY =====================
    socket.on('cmd', function(data) {
        // boomerang vers client
        socket.emit(data.cmd, data.data);
    });
    // ====================================
});

app.use(express.static('.'));
http.listen(8080, function(){
    console.log('listening on *:8080');
});
