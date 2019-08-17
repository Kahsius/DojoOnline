const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const Game = require('./src/Game').Game;
const fs = require('fs');
const images_path = path.join(__dirname, 'images');

global.io = require('socket.io')(http);
global.players = {};
global.games = {};
global.rooms = {};
global.players_connections = {};

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname + '/index2.html'));
});

io.on('connection', function(socket){
    socket.on('disconnect', function(){
        console.log(socket.pseudo + ' disconnected');
        if (players[socket.pseudo]) players[socket.pseudo].disconnected = true;
    });

    socket.on('debug', function(cmd){
        console.log('Get debug cmd : ' + cmd);
        socket.emit('debug', eval(cmd));
    });

    socket.on('init', function(pseudo){
        socket.pseudo = pseudo;
        if (pseudo in games) {
            if (players[pseudo].disconnected){
                players[pseudo].disconnected = false;
                console.log(socket.pseudo + ' : reconnection');
                players[pseudo].socket = socket;
                socket.emit('reconnect', games[socket.pseudo].get_state(socket.pseudo));
                return;
            } else {
                socket.emit('error_reconnection');
            }
        } else {
            let list_names = [];
            console.log('Récupère liste parties : ' + pseudo);
            for (let key in rooms) {
                if (rooms[key].length === 1){
                    let pseudo = rooms[key][0].pseudo;
                    list_names.push({'id': pseudo, 'pseudo': pseudo});
                }
            }
            list_names.push({'id': socket.pseudo, 'pseudo': 'Nouvelle partie'});
            socket.emit('list_rooms', list_names);
        }
    });

    socket.on('init_debug', function() {
        id = 'banana';
        socket.join(id);
        socket.room = id;
        if (!(id in rooms)) {
            socket.pseudo = 'K';
            rooms[id] = [socket];
            console.log(socket.pseudo + ' crée une partie');
        } else {
            socket.pseudo = 'L';
            rooms[id].push(socket);
            console.log(socket.pseudo + ' affronte ' + rooms[id][0].pseudo);
            game = new Game(rooms[id]);
            games[rooms[id][0].pseudo] = game;
            games[rooms[id][1].pseudo] = game;
            for (let player of game.players) {
                let me = {
                    'pseudo': player.pseudo,
                    'hp': player.hp,
                    'hand': player.hand,
                    'prodiges': player.get_prodiges_front()
                };
                let opp = {
                    'hp': players[player.opp].hp,
                    'hand': players[player.opp].hand,
                    'prodiges': players[player.opp].get_prodiges_front()
                };
                player.socket.emit('init_game', {'me': me, 'opp': opp});
            }
            game.update_lists_glyphs();
            game.state.label = 'wait_prodige';
            game.state.order = 0;
            game.get_player_by_order(0).socket.emit('text_log', 'Choix du Prodige');
        }
    });

    socket.on('join_room', function(id){
        socket.join(id);
        if (id === socket.pseudo) {
            rooms[id] = [socket];
            console.log(socket.pseudo + ' crée une partie');
        } else {
            rooms[id].push(socket);
            p1 = rooms[id][0];
            p2 = rooms[id][1];
            players_connections[p1.pseudo] = {'id': p1.id};
            players_connections[p2.pseudo] = {'id': p2.id};
            console.log(socket.pseudo + ' affronte ' + rooms[id][0].pseudo);
            game = new Game(rooms[id]);
            games[rooms[id][0].pseudo] = game;
            games[rooms[id][1].pseudo] = game;
            for (let player of game.players) {
                let me = {
                    'pseudo': player.pseudo,
                    'hp': player.hp,
                    'hand': player.hand,
                    'prodiges': player.get_prodiges_front()
                };
                let opp = {
                    'hp': players[player.opp].hp,
                    'hand': players[player.opp].hand,
                    'prodiges': players[player.opp].get_prodiges_front()
                };
                player.socket.emit('init_game', {'me': me, 'opp': opp});
            }
            game.update_lists_glyphs();
            game.state.label = 'wait_prodige';
            game.state.order = 0;
            game.get_player_by_order(0).socket.emit('text_log', 'Choix du Prodige');
        }
    });

    socket.on('validate_glyphes', function(){
        let player = players[socket.pseudo];
        let opp = players[player.opp];
        let game = games[socket.pseudo];
        player.ready = true;
        socket.emit('validate_button', false);
        if (game.both_players_ready()){
            player.socket.emit('reveal', opp.played_glyphs);
            opp.socket.emit('reveal', player.played_glyphs);
            game.broadcast_cmd('clean_regard');
            game.resolve_round();
        }
    });

    socket.on('drop_prodige', function(data){
        let game = games[socket.pseudo];
        let player = players[socket.pseudo];
        let opp = players[player.opp];
        let prodige = data.name;
        // If game is waiting for a prodige to be chosen
        if (game.state.label === 'wait_prodige'
            && game.state.order === player.order) {
            // If the prodige is played
            if (data.source === "hand_prodiges"
                && data.target === "empty_prodige") {
                console.log(player.pseudo + ' joue ' + prodige);
                let test = player.valide_choix_prodige(prodige);
                if (test.valid) {
                    // Display le choix du Prodige pour l'adversaire
                    opp.socket.emit('choix_prodige_adverse', prodige);
                    socket.emit('drop_validated');
                    if (game.state.order === 0) {
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
        let game = games[socket.pseudo];
        let player = players[socket.pseudo];
        let opp = players[player.opp];
        let valeur = parseInt(data.value);
        let target = data.target;
        let source = data.source.split(' ')[0];
        let target_elem = data.target_elem;
        let source_elem = data.source_elem;
        if (game.state.label === 'choice_glyphes') {
            if (target === 'empty_voie'){
                if (source === 'empty_voie') {
                    let need_update = player.switch_glyphs(source_elem, target_elem);
                    if (need_update) {
                        let body = {'voie': target_elem, 'valeur': valeur, 'remove': false};
                        body['regard'] = (player.on_opp_regard(target_elem));
                        opp.socket.emit('choix_glyphe_opp', body);
                        opp.socket.emit('retire_glyphe_opp', source_elem);
                    }
                    socket.emit('drop_validated');
                } else if (source === 'hand_glyphes') {
                    console.log(player.pseudo + ' joue ' + valeur + ' sur ' + target_elem);

                    // Est-ce que le glyphe est valide ?
                    let valid = player.valide_choix_glyphe(target_elem, valeur);
                    if (valid) {
                        socket.emit('drop_validated');
                        // Est-ce que l'adversaire peut voir le glyphe ?
                        let body = {'voie': target_elem, 'valeur': valeur, 'regard': player.on_opp_regard(target_elem)};
                        opp.socket.emit('choix_glyphe_opp', body);
                    }
                    else socket.emit('drop_not_validated', 'Choix invalide');
                }
            } else if ( target === 'hand_glyphes') {
                if ( source === 'empty_voie' ) {
                    // Le joueur retire un glyphe
                    console.log(player.pseudo + ' retire '
                        + player.played_glyphs[source_elem] + ' de la voie ' + source_elem);
                    let valid = player.retire_glyphe(source_elem);
                    debugger;
                    if (valid) {
                        // Si l'adversaire avait déjà validé
                        if (opp.ready
                            && opp.has_regard
                            && opp.get_played_prodigy().element === source_elem) {
                            opp.ready = false;
                            opp.socket.emit('validate_button', true);
                        }
                        opp.socket.emit('retire_glyphe_opp', source_elem);
                        socket.emit('drop_validated');
                    }
                }
            }
        }
    });

    socket.on('check_validate_button', function(){
        let pg = players[socket.pseudo].played_glyphs;

        // Est-ce que toutes les voies sont pleines
        let notEmpty = 0;
        for ( let element in pg) {
            if ( pg[element] !== -1) {
                notEmpty++;
            }
        }
        let validate = notEmpty === 4;
        socket.emit('validate_button', validate);
    });

    socket.on('click', function(data){
        let game = games[socket.pseudo];
        let player = players[socket.pseudo];
        let opp = players[player.opp];
        let ss = (game.substate) ? game.substate : {};
        let talent = (game.state.label.split(':')[0] === 'talents');
        let voies = (game.state.label === 'execute_voie');

        if (player.order === game.state.order) {
            if (['air', 'feu', 'eau', 'terre'].includes(data.element)
                && game.state.label === 'choice_voie'
                && game.substate.label === 'none'
                && ['voie', 'prodige'].includes(data.target_zone)) {
                if (game.voies_players[player.order].map(x => x.element).includes(data.element)
                    && game.valid_effect(player.order, data)){
                    game.state.label = 'execute_voie';
                    game.state.element = data.element;
                    game.state.maitrise = data.maitrise;
                    game.apply_voies_players();
                }
            } else if (ss.label === 'paying_cost'
                && ss.cost_type === 'glyph'
                && data.target_zone === 'hand_glyphes'
                && data.value > 0) {
                let hand = player.hand;
                let value = parseInt(data.value);
                if (hand.includes(value)){
                    hand.splice(hand.indexOf(value), 1);
                    data = {
                        'status': 'done',
                        'label': 'remove_glyph_hand',
                        'value': value,
                        'target': 'own',
                        'me': true
                    };
                    game.broadcast('Coût payé');
                    player.socket.emit('capacity_resolution', data);
                    data.me = false;
                    opp.socket.emit('capacity_resolution', data); 
                    ss.capacity.cost_paid = true;
                    if (talent) game.apply_talents();
                    if (voies) game.apply_voies_players();
                }
            } else if (ss.label === 'waiting_choice'
                && data.target_zone === ss.target_zone) {
                let hand = player.hand;
                let value = data.value;
                let element = data.element;
                if (data.target_zone === 'empty_voie') {
                    if (player.played_glyphs[element] > 0
                        && player.played_glyphs[element] < 5
                        && ss.capacity.choice_available(element)) {
                        player.socket.emit('text_log', 'Cible choisie');
                        ss.capacity.choices.push({'element': element, 'value': value});
                        if (talent) game.apply_talents();
                        if (voies) game.apply_voies_players();
                    }
                } else if (data.target_zone === 'hand') {
                    if (player.hand.includes(value)
                        && value > 0
                        && ss.capacity.choice_available(value)) {
                        player.socket.emit('text_log', 'Cible choisie');
                        ss.capacity.choices.push(value);
                        if (talent) game.apply_talents();
                        if (voies) game.apply_voies_players();
                    }
                }
            }
        } else if (ss.target === 'opp'
            && ss.label === "waiting_choice"
            && data.target_zone === ss.target_zone) {
            let hand = player.hand;
            let value = parseInt(data.value);
            if (hand.includes(value)
                && value > 0
                && ss.capacity.choice_available(value)) {
                game.broadcast('Cible choisie');
                ss.capacity.choices.push(value);
                if (talent) game.apply_talents();
                if (voies) game.apply_voies_players();
            }
        }
    });

    socket.on('delete_game', function() {
        delete players[socket.pseudo];
        delete games[socket.pseudo];
    });

    socket.on('get_list_images', function() {
        fs.readdir(images_path, function(err, files) {
            if (err) console.log('impossible to read ' + images_path);
            else {
                files = files.map(x => 'images/' + x);
                socket.emit('list_images', files);
            }
        });
    });
});

app.use(express.static('.'));
http.listen(8080, function(){
    console.log('listening on *:8080');
});
