const fs = require('fs');
const range = require('./utils').range;
var Player = require('./Player').Player;
var Prodige = require('./Prodige').Prodige;

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

        // Création des voies
        // TODO Création des voies dans le constructeur de Game

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
        player0.prodiges = this.create_prodiges(["Amalrik", "Batsu", "Faine", "Asato"]);
        player1.prodiges = this.create_prodiges(["Alissonne", "Fizz", "Rubis", "Svenn"]);

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

    start_game() {
        // Demande le prodige au premier joueur
        this.get_player_by_order(0).socket.emit('init_choix_prodige');
    }

    valide_choix_prodige(id_player, prodige){
        let player = players[id_player];
        if (this.choix == 'prodige' && prodige in player.prodiges) {
            let p = player.prodiges[prodige]
            if (p.available) {
                if (player.played_prodigy != null){
                    player.played_prodigy.available = true;
                }
                player.played_prodigy = p;
                p.available = false;
                console.log('... validé')
                return({'valid': true});
            } else {
                console.log('...non validé (!available)')
                return({'valid': false, 'text': p.name + ' n\'est plus disponible'});
            }
        } else {
            console.log('...non validé (choix invalide ou prodige not in P.prodiges)')
            return({'valid': false, 'text': p.name + ' n\'est pas dans votre main'});
        }
    }

    create_prodiges(list_names, owner){
        let prodiges = {};
        for (let name of list_names) {
            // A modifier pour créer les objets Prodiges
            prodiges[name] = new Prodige(prodige_data[name]);
        }
        return prodiges;
    }

    applique_talents(){
        // Application des Talents a priorite
        let t = null;
        for (order of range(2)){
            t = this.get_player_by_order(order).played_prodigy.talent;
            if (t.priority) t.execute_capacity(this.turn);
        }
        // Application des Talents
        for (order of range(2)){
            t = this.get_player_by_order(order).played_prodigy.talent;
            if (!t.priority && !t.need_winner) t.execute_capacity(this.turn);
        }
    }

    get_player(id){
        return player_sockets[id].player;
    }

    resolve_round(){
        // Score sur les voies
        let scores = [0, 0];
        let p1 = this.first_player;
        let g1 = p1.played_glyphs;
        let p2 = player_sockets[p1.opp].player;
        let g2 = p2.played_glyphs;
        for (element in g1) {
            let winner = 0;
            if (p1.played_glyphs[element] > p2.played_glyphs[element]) {winner = -1}
            else if (p1.played_glyphs[element] < p2.played_glyphs[element]) {winner = 1}
            else {
                if (p1.played_prodigy.initiative){winner = -1}
                else if (p2.played_prodigy.initiative) {winner = -1}
            }
            this.score_voies.push(winner);
        }

        // Détermination du gagnant
        let winner = this.get_winner(p1, p2);

        // Attribution du statut de victoire
        [p1, p2][winner % 2].winner = true
        [p1, p2][(winner + 1) % 2].winner = (winner != 2) ? false : true

        // Application des Talents éventuels
        for (id in this.players){
            let p = this.players[id];
            if (p.played_prodigy.talent.need_winner){
                console.log(p.played_prodigy.name + "_" + str(p.id) + " utilise Talent")
                p.played_prodigy.talent.execute_capacity(this.turn)
            }
        }

        // Application des effets des Voies
        if (i in this.players) {
            let p = self.players[i];
            // On étudie toutes les voies
            if (j in this.players) {
                v = self.voies[j];
                // Un des joueurs a remporté la voie
                p1_win = self.score_voies[j] < 0 && p == this.first_player;
                p2_win = self.score_voies[j] > 0 && p != this.first_player;
                if (p1_win || p2_win) {
                    console.log(p.played_prodigy.name + "_" + str(p.id) + " remporte " + v.element)
                    // S'il peut activer sa maîtrise
                    element_ok = (v.element == p.played_prodigy.element)
                    damage = p.played_prodigy.maitrise.need_victory
                    damage_and_winner = (p.winner && damage)
                    not_stopped = !p.played_prodigy.maitrise.stopped
                    if (element_ok && (damage_and_winner || !damage) && not_stopped) {
                        console.log("\tet applique sa Maitrise")
                        p.played_prodigy.maitrise.execute_capacity(self.turn)
                    // Sinon
                    } else {
                        console.log("\tet applique son effet")
                        v.capacity.owner = p
                        v.capacity.execute_capacity(self.turn)
                    }
                }
            }
        }
    }

    get_winner(p1, p2){
        winner = sum(this.score_voies)

        // Qui a gagné le plus de Voies
        if (winner < 0) {
            return 0
        } else if (winner > 0) {
            return 1
        } else {
            // Est-ce qu'un joueur a l'avantage
            if (p1.played_prodigy.advantaged) {
                return 0
            } else if (p2.played_prodigy.advantaged) {
                return 1
            } else {
                // Est-ce qu'un joueur a moins de pv que son opp
                if (p1.hp < p2.hp) {
                    return 0
                } else if (p1.hp > p2.hp) {
                    return 1
                } else {
                    // Si jamais il y a une parfaite égalité
                    return 2
                }
            }
        }
    }

    both_players_ready(){
        for (player of this.players){
            if (!player.ready) {
                return false;
            }
        }
        return true;
    }
}
