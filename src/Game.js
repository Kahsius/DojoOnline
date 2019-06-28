const fs = require('fs');
var Player = require('./Player').Player;
var Prodige = require('./Prodige').Prodige;

let file = fs.readFileSync('./data/prodigies.json');
data = JSON.parse(file);
prodige_data = {};
for (prodige of data){
    prodige_data[prodige['name']] = prodige;
}

module.exports.Game = class {
    constructor(room) {
        this.players = {};
        this.turn = 0;
        this.first_player = null;
        this.choix = 'prodige';
        this.score_voies = [];
        
        // Création des joueurs
        var player0 = new Player(room[0], 0);
        var player1 = new Player(room[1], 1);
        player0.opp = room[1].id;
        player1.opp = room[0].id;
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

    resolve_round(){}
}
