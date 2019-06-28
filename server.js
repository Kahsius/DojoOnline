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
        let player = socket.player;
        console.log(player.pseudo + ' joue ' + prodige);
        if (game.choix == 'prodige' && prodige in player.prodiges) {
            let p = player.prodiges[prodige]
            if (p.available) {
                if (player.played_prodigy != null){
                    player.played_prodigy.available = true;
                }
                player.played_prodigy = p;
                p.available = false;
                console.log('... validé')
                socket.emit('drop_validated');
            } else {
                console.log('...non validé (!available)')
                socket.emit('drop_not_validated', p.name + ' n\'est plus disponible');
            }
        } else {
            console.log('...non validé (choix invalide ou prodige not in P.prodiges)')
            socket.emit('drop_not_validated', p.name + ' n\'est pas dans votre main');
        }
    });

    socket.on('retire_prodige', function(prodige){
        console.log(socket.player.pseudo + ' retire ' + prodige);
        let player = socket.player;
        socket.emit('drop_validated');
        player.played_prodigy.available = true;
        player.played_prodigy = null;
    });

    socket.on('valide_choix_prodige', function(){
        let game = games[socket.room];
        let player = socket.player;
        let prodige = player.played_prodigy.name;
        console.log(player.pseudo + ' valide ' + prodige);
        player_sockets[socket.opp].emit('choix_prodige_adverse', prodige)
        if (player === game.first_player) {
            console.log(game.players[socket.opp].pseudo + ' choisi son Prodige');
            player_sockets[socket.opp].emit('init_choix_prodige');
        } else {
            console.log('Application des Talents');
            game.applique_talents();
            console.log('Début choix des Glyphes');
            for (player_id in game.players){
                player_sockets[player_id].emit('init_choix_glyphes');
            }
        }
    });

    socket.on('choix_glyphe', function(data){
        let voie = data['voie'].split('-')[1];
        let valeur = parseInt(data['valeur']);
        let player = socket.player;
        let opp = player_sockets[socket.opp];
        let hand = player.hand;
        console.log(player.pseudo + ' joue ' + valeur + ' sur ' + voie);
        if (valeur in hand){
            let g = player.played_glyphs[voie]
            let offset = (g != -1) ? g : 0;
            console.log(voie);
            if (player.sum_played_glyphs() + valeur - offset 
                <= player.played_prodigy.puissance){
                console.log('... validé');
                hand.splice(hand.indexOf(valeur), 1);
                if (g >= 0){
                    player.hand.push(g);
                }
                player.played_glyphs[voie] = valeur
                socket.emit('drop_validated');
                if (opp.player.has_regard && voie == opp.player.played_prodigy.element){
                    opp.emit('choix_glyphe_opp_regard', {'voie': voie, 'valeur': valeur});
                } else {
                    opp.emit('choix_glyphe_opp', voie);
                }
            } else {
                console.log('... non valide ( > puissance)');
            }
        } else {
            socket.emit('drop_not_validated', 'Le glyphe n\'est pas dans votre main');
            console.log('... non validé (pas dans p.hand)');
        }
    });

    socket.on('retire_glyphe', function(voie){
        voie = voie.split('-')[1];
        let player = socket.player;
        console.log(socket.player.pseudo + ' retire '
            + player.played_glyphs[voie] + ' de la voie ' + voie);
        if (player.played_glyphs[voie] != -1){
            player.hand.push(player.played_glyphs[voie]);
            player.played_glyphs[voie] = -1;
            socket.emit('drop_validated');
            player_sockets[socket.opp].emit('retire_glyphe_opp', voie);
        }
    });

    socket.on('valide_choix_glyphes', function(){
        socket.player.ready = true;
        let game = games[socket.room]
        if (game.players[socket.opp].ready){
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
