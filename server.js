const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const Game = require('./src/Game').Game;



global.io = require('socket.io')(http);
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
        socket.emit('debug', eval(cmd));
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
            game.state.label = 'wait_prodige';
            game.state.order = 0;
            game.get_player_by_order(0).socket.emit('text_log', 'Choix du Prodige');
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
            game.get_player_by_order(0).socket.emit('init_choix_prodige');
        }
    });

    socket.on('validate_glyphes', function(){
        let player = players[socket.id];
        let opp = players[player.opp];
        let game = games[socket.id]
        player.ready = true;
        socket.emit('validate_button', false);
        if (game.both_players_ready()){
            player.socket.emit('reveal', opp.played_glyphs);
            opp.socket.emit('reveal', player.played_glyphs);
            game.resolve_round();
        }
    });

    socket.on('drop_prodige', function(data){
        let game = games[socket.id];
        let player = players[socket.id];
        let opp = players[player.opp];
        let prodige = data.name;
        // If game is waiting for a prodige to be chosen
        if (game.state.label == 'wait_prodige'
            && game.state.order == player.order) {
            // If the prodige is played
            if (data.source == "hand_prodiges"
                && data.target == "empty_prodige") {
                console.log(player.pseudo + ' joue ' + prodige);
                let test = player.valide_choix_prodige(prodige);
                if (test.valid) {
                    // Display le choix du Prodige pour l'adversaire
                    opp.socket.emit('choix_prodige_adverse', prodige);
                    socket.emit('drop_validated');
                    if (game.state.order == 0) {
                        game.state.order++;
                        opp.socket.emit('text_log', 'Choix du Prodige');
                    } else {
                        game.state = {'label': 'talents:priority', 'order': 0};
                        io.to(player.socket.room).emit('text_log', 'Application des Talents');
                        game.apply_talents();
                    }
                }
                else socket.emit('drop_not_validated', test.text);
            } 
        }
    });

    socket.on('drop_glyphe', function(data){
        let game = games[socket.id];
        let player = players[socket.id];
        let hand = player.hand;
        let opp = players[player.opp];
        let voie = data.voie;
        let valeur = parseInt(data.value);
        let target = data.target;
        if (game.state.label == 'choice_glyphes') {
            if ( target == 'empty_voie'){
                console.log(player.pseudo + ' joue ' + valeur + ' sur ' + voie);

                // Est-ce que le glyphe est valide ?
                let valid = player.valide_choix_glyphe(voie, valeur)
                if (valid) {
                    socket.emit('drop_validated');
                    // Est-ce que l'adversaire peut voir le glyphe ?
                    let body = {'voie': voie, 'valeur': valeur, 'regard': false}
                    if (player.on_opp_regard(voie)) body['regard'] = true;
                    opp.socket.emit('choix_glyphe_opp', body);
                }
                else socket.emit('drop_not_validated', 'Choix invalide');
            } else if ( target == 'hand_glyphes') {
                // Le joueur retire un glyphe
                console.log(player.pseudo + ' retire '
                    + player.played_glyphs[voie] + ' de la voie ' + voie);
                let valid = player.retire_glyphe(voie);
                if (valid) {
                    players[player.opp].socket.emit('retire_glyphe_opp', voie);
                    socket.emit('drop_validated');
                }
            }
        }
    });

    socket.on('check_validate_button', function(){
        let pg = players[socket.id].played_glyphs;

        // Est-ce que toutes les voies sont pleines
        let notEmpty = 0;
        for ( let element in pg) {
            if ( pg[element] != -1) {
                notEmpty++;
            }
        }
        let validate = notEmpty == 4;
        socket.emit('validate_button', validate);
    });

    socket.on('click', function(data){
        let game = games[socket.id];
        let player = players[socket.id];
        let ss = game.substate ? game.substate : {};
        let talent = (game.state.label.split(':')[0] == 'talents');
        let voies = (game.state.label == 'voies');

        if (player.order == game.state.order) {
            if (['air', 'feu', 'eau', 'terre'].includes(data.element)
                && game.state.label == 'choice_voie') {
                game.state.label = 'execute_voie';
                game.state.element = data.element;
                game.state.maitrise = data.maitrise;
                game.apply_voies_players();
            } 
            if (ss.label == 'paying_cost'
                && ss.cost_type == 'glyph'
                && data.target_zone == 'hand_glyphes') {
                let hand = player.hand;
                let value = data.value;
                if (hand.includes(value)){
                    hand.splice(hand.indexOf(value));
                    ss.capacity.cost_paid = true;
                    if (talent) game.apply_talents();
                }
            }
            if (ss.label == 'waiting_choice'
                && data.target_zone == ss.target_zone) {
                let hand = player.hand;
                let value = data.value;
                let element = data.element;
                if (data.target_zone == 'empty_voie') {
                    if (player.played_glyphs[element] > 0) {
                        ss.capacity.choice.push(element);
                        if (talent) game.apply_talents()
                    }
                } else if (data.target_zone == 'hand') {
                    if (player.hand.includes(value)
                        && value > 0) {
                        ss.capacity.choice.push(value);
                        if (talent) game.apply_talents()
                    }
                }
            }
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
