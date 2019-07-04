const fs = require('fs');
var Player = require('./Player').Player;
var Prodige = require('./Prodige').Prodige;

let file = fs.readFileSync('./data/prodigies.json');
data = JSON.parse(file);
prodige_data = {};
for (prodige of data){
    prodige_data[prodige['name']] = prodige;
}
let file = fs.readFileSync('./data/voies.json');
data = JSON.parse(file);
voie_data = {};
for (voie of data){
    voie_data[voie['name']] = voie;
}

module.exports.Game = class {
    constructor(room) {
        this.players = {};
        this.turn = 0;
        this.first_player = null;
        this.choix = 'prodige';
        this.score_voies = [];
        this.winner = null;

        // Création des voies
        // TODO Création des voies dans le constructeur de Game

        // Création des joueurs
        var player0 = new Player(room[0], 0);
        var player1 = new Player(room[1], 1);
        player0.opp = room[1].id;
        player1.opp = room[0].id;
        player0.order = 0;
        player1.order = 1;
        this.first_player = player0;

        // Création des prodiges
        player0.prodiges = this.create_prodiges(["Amalrik", "Batsu", "Faine", "Asato"], room[0].id);
        player1.prodiges = this.create_prodiges(["Alissonne", "Fizz", "Rubis", "Svenn"], room[1].id);

        // Assignation des joueurs à la partie
        this.players[room[0].id] = player0;
        this.players[room[1].id] = player1;
        player_sockets[room[0].id].player = player0;
        player_sockets[room[1].id].player = player1;

        for (let socket of room) {
            socket.emit('init_game', {'me': this.players[socket.id], 'opp': this.players[socket.opp]});
        }
    }

    start_game() {
        // Demande le prodige au premier joueur
        player_sockets[this.first_player.id].emit('init_choix_prodige');
    }

    create_prodiges(list_names, owner){
        let prodiges = {};
        for (let name of list_names) {
            // A modifier pour créer les objets Prodiges
            prodiges[name] = new Prodige(prodige_data[name], owner);
        }
        return prodiges;
    }

    applique_talents(){
        // Application des Talents a priorite
        let fp = this.first_player;
        let t = fp.played_prodigy.talent;
        if (t.priority) t.execute_capacity(this.turn);
        t = this.get_player(fp.opp).played_prodigy.talent;
        if (t.priority) t.execute_capacity(this.turn);

        // Application des Talents
        t = fp.played_prodigy.talent;
        if (!t.priority && !t.need_winner) t.execute_capacity(this.turn);
        t = this.get_player(fp.opp).played_prodigy.talent;
        if (!t.priority && !t.need_winner) t.execute_capacity(this.turn);
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
