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

        // Création des voies
        this.voies = [];
        for(let element in voie_data) {
            this.voies.push(new Voie(voie_data[element]));
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
            order = this.state.player;
            player = this.get_player_by_order(this.state.player);
            t = player.get_played_prodigy().talent;
            if (t.priority) {
                let state = t.execute_capacity(this.turn);
                if (state) {
                    this.substate = state;
                    player.socket.emit('capacity_ongoing', state.label);
                } else if (this.state.player == 0) {
                    this.state.player++;
                    this.apply_talents();
                } else {
                    this.state.label = 'talents:normal';
                    this.state.player = 0;
                    this.apply_talents();
                }
            } else if (this.state.player == 0) {
                this.state.player++;
                this.apply_talents();
            } else {
                this.state.label = 'talents:normal';
                this.state.player = 0;
                this.apply_talents();
            }
        } else if (this.state.label == 'talents:normal') {
            order = this.state.player;
            player = this.get_player_by_order(this.state.player);
            t = player.get_played_prodigy().talent;
            if (!t.priority && !t.need_winner) {
                let state = t.execute_capacity(this.turn);
                if (state) {
                    this.substate = state;
                    player.socket.emit('capacity_ongoing', state.label);
                } else if (this.state.player == 0) {
                    this.state.player++;
                    this.apply_talents();
                } else {
                    game.state.label = 'choice_glyphes';
                    io.to(player.socket.room).emit('text_log', 'Choix des Glyphes');
                }
            } else if (this.state.player == 0) {
                this.state.player++;
                this.apply_talents();
            } else {
                game.state.label = 'choice_glyphes';
                io.to(player.socket.room).emit('text_log', 'Choix des Glyphes');
            }
        } else if (this.state.label == 'talents:post_winner') {
            player = this.get_player_by_order(this.state.player);
            p = player.get_played_prodigy();
            if (p.talent.need_winner){
                let state = p.talent.execute_capacity(this.turn);
                if (state) {
                    this.substate = state;
                    player.socket.emit('capacity_ongoing', state.label);
                } else if (this.state.player == 0) {
                    this.state.player++;
                    this.apply_talents();
                } else {
                    this.state.label = 'apply_voies';
                    this.apply_voies();
                    io.to(player.socket.room).emit('text_log', 'Application des Voies');
                }
            } else if (this.state.player == 0) {
                this.state.player++;
                this.apply_talents();
            } else {
                this.state.label = 'apply_voies';
                io.to(player.socket.room).emit('text_log', 'Application des Voies');
                this.apply_voies();
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
        this.state.labe = 'talents:post_winner';
        this.apply_talents();
    }

    apply_voies(){
        // TODO à refondre pour que les joueurs puissent
        // choisir dans quels ordres ils appliquent les effets
        // Application des effets des Voies
        console.log('Application des Voies');
        let i, j;
        let scores = this.scores;
        for (i of range(0, 2)) {
            let p = this.get_player_by_order(i);
            // On étudie toutes les voies
            for (j in this.voies) {
                let v = this.voies[j];
                let p1_win = (scores[v.element] == -1 && i == 0);
                let p2_win = (scores[v.element] == 1 && i == 1);
                if ( p1_win || p2_win ) {
                    console.log(p.get_played_prodigy().name + "_" + p.order + " remporte " + v.element);
                    // S'il peut activer sa maîtrise
                    let element_ok = (v.element == p.get_played_prodigy().element);
                    let not_stopped = !p.get_played_prodigy().maitrise.stopped;
                    if (element_ok && not_stopped) {
                        // TODO demander choix entre maitrise et voie
                        console.log("\tet peut appliquer sa Maitrise");
                        p.socket.once('choix_maitrise_voie', function(choix){
                            if (choix == 'maitrise'){
                                p.get_played_prodigy().maitrise.execute_capacity(this.turn);
                            } else if (choix == 'voie'){
                                v.capacity.owner = p;
                                v.capacity.execute_capacity(this.turn);
                            }
                            this.pause = "nope";
                        });
                        this.pause = 'yep';
                        socket.emit('choix_maitrise_voie', v);
                        while (this.pause != 'nope'){
                            setTimeout(function(){}, 500);
                        }
                    } else {
                        console.log("\tet applique son effet")
                        v.capacity.owner = p
                        v.capacity.execute_capacity(this.turn)
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
}
