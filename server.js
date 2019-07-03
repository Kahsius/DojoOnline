const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
var io = require('socket.io')(http);

var Game = require('./src/Game').Game;


global.players = {};
global.sockets = {};
global.games = {};
global.rooms = {};

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});

io.on('connection', function(socket){
    socket.on('disconnect', function(){
        // TODO: garder la connection en cas de refresh
        console.log(socket.id + ' disconnected');
    });

    socket.on('debug', function(cmd){
        console.log('Get debug cmd : ' + cmd)
        eval(cmd);
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
        sockets[socket.id] =  socket;
        if (!(id in rooms)) {
            socket.pseudo = 'K';
            rooms[id] = [socket];
            console.log(socket.pseudo + ' crée une partie');
        } else {
            socket.pseudo = 'L';
            rooms[id].push(socket);
            console.log(socket.pseudo + ' affronte ' + rooms[id][0].pseudo);
            game = new Game(rooms[id]);
            games[rooms[id][0].id] = game;
            games[rooms[id][1].id] = game;
            for (let player of game.players) {
                let me = {'hand': player.hand,
                    'prodiges': Object.keys(player.prodiges)};
                let opp = {'hand': players[player.opp].hand,
                    'prodiges': Object.keys(players[player.opp].prodiges)};
                player.socket.emit('init_game', {'me': me, 'opp': opp});
            }
            game.start_game()
        }
    });

    socket.on('join_room', function(id){
        socket.join(id)
        if (id == socket.id) {
            rooms[id] = [socket];
            console.log(socket.pseudo + ' crée une partie');
        } else {
            rooms[id].push(socket);
            console.log(socket.pseudo + ' affronte ' + sockets[id].pseudo);
            game = new Game(rooms[id]);
            games[socket.id] = game;
            games[id] = game;
            for (let player of game.players) {
                let me = {'hand': player.hand,
                    'prodiges': Object.keys(player.prodiges)};
                let opp = {'hand': players[player.opp].hand,
                    'prodiges': Object.keys(players[player.opp].prodiges)};
                player.socket.emit('init_game', {'me': me, 'opp': opp});
            }
            game.start_game()
        }
    });

    socket.on('choix_prodige', function(prodige){
        console.log(players[socket.id].pseudo + ' joue ' + prodige);
        let test = games[socket.id].valide_choix_prodige(socket.id, prodige);
        if (test.valid) socket.emit('drop_validated');
        else socket.emit('drop_not_validated', test.text);
    });

    socket.on('retire_prodige', function(prodige){
        let player = players[socket.id];
        console.log(player.pseudo + ' retire ' + prodige);
        socket.emit('drop_validated');
        player.played_prodigy.available = true;
        player.played_prodigy = null;
    });

    socket.on('valide_choix_prodige', function(){
        let game = games[socket.id];
        let player = players[socket.id];
        let opp = players[player.opp];
        let prodige = player.played_prodigy.name;

        console.log(player.pseudo + ' valide ' + prodige);
        
        // Display le choix du Prodige pour l'adversaire
        opp.socket.emit('choix_prodige_adverse', prodige);

        // Vérification de qui fait quoi
        if (player.order == 0) {
            console.log(opp.pseudo + ' choisi son Prodige');
            opp.socket.emit('init_choix_prodige');
        } else {
            console.log('Application des Talents');
            game.applique_talents();
            console.log('Début choix des Glyphes');
            for (player of game.players){
                player.socket.emit('init_choix_glyphes');
            }
        }
    });

    socket.on('choix_glyphe', function(data){
        let voie = data['voie'].split('-')[1];
        let valeur = parseInt(data['valeur']);
        let player = players[socket.id];
        let opp = players[player.opp];
        let hand = player.hand;
        console.log(player.pseudo + ' joue ' + valeur + ' sur ' + voie);

        // Est-ce que le glyphe est valide ?
        let valid = player.valide_choix_glyphe(voie, valeur)
        if (valid) socket.emit('drop_validated');
        else socket.emit('drop_not_validated', 'Choix invalide');

        // Est-ce que l'adversaire peut voir le glyphe ?
        let body = {'voie': voie, 'valeur': valeur, 'regard': false}
        if (player.on_opp_regard(voie)) body['regard'] = true;
        opp.socket.emit('choix_glyphe_opp', body);
    });

    socket.on('retire_glyphe', function(voie){
        voie = voie.split('-')[1];
        let player = players[socket.id];
        console.log(player.pseudo + ' retire '
            + player.played_glyphs[voie] + ' de la voie ' + voie);
        let valid = player.retire_glyphe(voie);
        if (valid) {
            players[player.opp].socket.emit('retire_glyphe_opp', voie);
            socket.emit('drop_validated');
        }
    });

    socket.on('valide_choix_glyphes', function(){
        let player = players[socket.id];
        player.ready = true;
        let game = games[socket.id]
        if (game.both_players_ready()){
            game.resolve_round();
        }
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
