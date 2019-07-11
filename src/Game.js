const fs = require('fs');
const range = require('./utils').range;
const Player = require('./Player').Player;
const Voie = require('./Voie').Voie;

function get_json_data(path, key_id){
    let file = fs.readFileSync(path);
    let data = JSON.parse(file);
    let dict_data = {};
    for (point of data){
        dict_data[point[key_id]] = point;
    }
    return dict_data;
}

prodige_data = get_json_data('./data/prodigies.json', 'name');
voie_data = get_json_data('./data/voies.json', 'element');


module.exports.Game = class {
    constructor(room) {
        this.turn = 0;
        this.first_player = null;
        this.choix = 'prodige';
        this.score_voies = [];
        this.winner = null;
        this.pause = "nope";
        this.state = {};
        this.scores = {};
        this.voies_players = null;

        // Création des voies
        this.voies = {};
        for(let element in voie_data) {
            this.voies[element] = new Voie(voie_data[element]);
        }        

        // Création des joueurs
        let id0 = room[0].id;
        let id1 = room[1].id;

        var player0 = new Player(room[0], 0);
        player0.opp = id1;
        players[id0] = player0;

        var player1 = new Player(room[1], 1);
        player1.opp = id0;
        players[id1] = player1;

        // Création des prodiges
        // TODO /!\ DRAFT /!\
        player0.create_prodiges(["Amalrik", "Batsu", "Faine", "Asato"]);
        player1.create_prodiges(["Alissonne", "Fizz", "Rubis", "Svenn"]);

        // Assignation des joueurs à la partie
        this.players = [player0, player1]
    }

    get_player_by_order(order){
        for (let player of this.players){
            if (player.order == order) {
                return player;
            }
        }
    }

    apply_talents(){
        let t, order, player, p;

        if (this.state.label == 'talents:priority') {
            order = this.state.order;
            player = this.get_player_by_order(order);
            t = player.get_played_prodigy().talent;
            if (t.priority) {
                let state = t.execute_capacity(this.turn);
                this.update_front(state);
                if (state.status != 'done') {
                    this.substate = state;
                } else if (this.state.order == 0) {
                    this.state.order++;
                    this.apply_talents();
                } else {
                    this.state.label = 'talents:normal';
                    this.state.order = 0;
                    this.apply_talents();
                }
            } else if (this.state.order == 0) {
                this.state.order++;
                this.apply_talents();
            } else {
                this.state.label = 'talents:normal';
                this.state.order = 0;
                this.apply_talents();
            }
        } else if (this.state.label == 'talents:normal') {
            order = this.state.order;
            player = this.get_player_by_order(this.state.order);
            t = player.get_played_prodigy().talent;
            if (!t.priority && !t.need_winner) {
                let state = t.execute_capacity(this.turn);
                if (state.status != 'done') {
                    this.substate = state;
                    player.socket.emit('capacity_ongoing', state.label);
                } else if (this.state.order == 0) {
                    this.state.order++;
                    this.apply_talents();
                } else {
                    game.state.label = 'choice_glyphes';
                    io.to(player.socket.room).emit('text_log', 'Choix des Glyphes');
                }
            } else if (this.state.order == 0) {
                this.state.order++;
                this.apply_talents();
            } else {
                game.state.label = 'choice_glyphes';
                io.to(player.socket.room).emit('text_log', 'Choix des Glyphes');
            }
        } else if (this.state.label == 'talents:post_winner') {
            player = this.get_player_by_order(this.state.order);
            p = player.get_played_prodigy();
            if (p.talent.need_winner){
                let state = p.talent.execute_capacity(this.turn);
                if (state.status != 'done') {
                    this.substate = state;
                    player.socket.emit('capacity_ongoing', state.label);
                } else if (this.state.order == 0) {
                    this.state.order++;
                    this.apply_talents();
                } else {
                    this.state.label = 'apply_voies';
                    this.substate = {};            
                    this.get_voies_players();
                    io.to(player.socket.room).emit('text_log', 'Application des Voies');
                }
            } else if (this.state.order == 0) {
                this.state.order++;
                this.apply_talents();
            } else {
                this.state.label = 'apply_voies';
                this.state.order = 0;
                io.to(player.socket.room).emit('text_log', 'Application des Voies');
                this.get_voies_players();
            }
        }
    }

    resolve_round(){
        // Score sur les voies
        let scores = {};
        let p1 = this.get_player_by_order(0);
        let g1 = p1.played_glyphs;
        let p2 = this.get_player_by_order(1);
        let g2 = p2.played_glyphs;
        console.log('Résolution du round');
        for (let element in g1) {
            let winner = 0;
            if (p1.played_glyphs[element] > p2.played_glyphs[element]) {winner = -1}
            else if (p1.played_glyphs[element] < p2.played_glyphs[element]) {winner = 1}
            else {
                if (p1.get_played_prodigy().initiative){winner = -1}
                else if (p2.get_played_prodigy().initiative) {winner = -1}
            }
            scores[element] = winner;
        }
        this.scores = scores;

        // Détermination du gagnant
        let winner = this.get_winner(scores, p1, p2);

        // Attribution du statut de victoire
        let players = [p1, p2];
        players[winner % 2].winner = true
        players[(winner + 1) % 2].winner = (winner != 2) ? false : true

        // Application des Talents éventuels
        this.state.label = 'talents:post_winner';
        this.state.order = 0;
        this.apply_talents();
    }

    get_voies_players(){
        console.log('Application des Voies');
        let element_ok, not_stopped, effect, p, v, p1_win, p2_win, i, j, scores, effects;

        scores = this.scores;
        effects = [[],[]];
        for (i of range(0, 2)) {
            p = this.get_player_by_order(i);
            // On étudie toutes les voies
            for (j in this.voies) {
                v = this.voies[j];
                p1_win = (scores[v.element] == -1 && i == 0);
                p2_win = (scores[v.element] == 1 && i == 1);
                if ( p1_win || p2_win ) {
                    console.log(p.get_played_prodigy().name + "_" + p.order + " remporte " + v.element);
                    // S'il peut activer sa maîtrise
                    element_ok = (v.element == p.get_played_prodigy().element);
                    not_stopped = !p.get_played_prodigy().maitrise.stopped;
                    effect = {'element': j, 'playable': true, 'display': true};
                    effect.maitrise = (element_ok && not_stopped) ? true : false
                    effects[i].push(effect);
                }
            }
        }
        this.voies_players = effects;
        this.state.label = 'init_choice_voie';
        this.substate = {'label': 'none'};
        this.apply_voies_players()
    }

    apply_voies_players(){
        let label = this.state.label;
        let order = this.state.order;
        let element = this.state.element;
        let player = this.get_player_by_order(order);
        let c, p;
        if(label == 'init_choice_voie'){
            let effects = this.voies_players[order];
            let still = false;
            for (let effect of this.voies_players[order]) {
                if (effect.playable) {
                    still = true;
                    break;
                } 
            }
            if (!still) {
                if(order == 0) {
                    player.socket.emit('text_log', 'Aucun effet à appliquer');
                    this.state.order++;
                    this.apply_voies_players();
                } else if (order == 1) {
                    player.socket.emit('text_log', 'Aucun effet à appliquer');
                    this.state.label = 'end_round';
                }
            } else {
                this.state.label = 'choice_voie';
                player.socket.emit('choices_voies', effects);
            }
        } else if (label == 'execute_voie') {
            for (let effect of this.voies_players[order]) {
                if (effect.element == element
                    && effect.playable) {
                    if (this.state.maitrise) {
                        p = player.get_played_prodigy();
                        c = p.maitrise;
                        this.broadcast('Application Maîtrise ' + p.name);
                    } else {
                        c = this.voies[element].capacity;
                        c.owner = this.get_player_by_order(order);
                        this.broadcast('Application voie ' + element);
                    }
                    effect.display = false;
                    player.socket.emit('choices_voies', this.voies_players[order]);
                    let state = c.execute_capacity();
                    if (state.status != 'done') {
                        this.substate = state;
                        player.socket.emit('capacity_ongoing', state.label);
                    } else {
                        // TODO mettre à jour l'état de la partie pour les deux joueurs
                        effect.playable = false;
                        this.state.label = 'init_choice_voie';
                        this.substate = {'label': 'none'};
                        this.apply_voies_players();
                    }
                }
            }
        }
    }

    get_winner(scores, p1, p2){
        let winner = 0;
        for (let elem in scores) {
            winner += scores[elem];
        }

        // Qui a gagné le plus de Voies
        if (winner < 0) {
            return 0;
        } else if (winner > 0) {
            return 1;
        } else {
            // Est-ce qu'un joueur a l'avantage
            if (p1.get_played_prodigy().advantaged) {
                return 0;
            } else if (p2.get_played_prodigy().advantaged) {
                return 1;
            } else {
                // Est-ce qu'un joueur a moins de pv que son opp
                if (p1.hp < p2.hp) {
                    return 0;
                } else if (p1.hp > p2.hp) {
                    return 1;
                } else {
                    // Si jamais il y a une parfaite égalité
                    return 2;
                }
            }
        }
    }

    both_players_ready(){
        for (let player of this.players){
            if (!player.ready) {
                return false;
            }
        }
        return true;
    }

    broadcast(msg) {
        io.to(this.players[0].room).emit('text_log', msg);
    }

    get_state_front(id) {
        let player = players[id];
        let opp = players[player.opp];
        let state = {};
        state.hand = player.hand;
        state.played_glyphs = player.played_glyphs;

        let prodiges = {};
        for (let p in player.prodiges) {
            prodiges[p.name] = {'name': p.name, 'available': p.available};
        }
        prodiges[p.played_prodigy].played = true;
        state.prodiges = prodiges;

        prodiges = {};
        for (let p in opp.prodiges) {
            prodiges[p.name] = {'name': p.name, 'available': p.available};
        }
        prodiges[p.played_prodigy].played = false;
        state.prodiges_opp = prodiges;

        state.hand_opp = opp.get_hand_state();
        state.hp = player.hp;
        state.hp_opp = opp.hp;
    }    

    update_front(state) {
        for (let player of this.players) {
            state.me = (state.owner == player.socket.id) ? true : false;
            socket.emit('capacity_resolution', state);
        }
    }
}
