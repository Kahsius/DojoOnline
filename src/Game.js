var Player = require('./Player').Player;
var Prodige = require('./Prodige').Prodige;

module.exports.Game = class {
    constructor(room) {
        this.players = {};
        this.score_voies = [];
        this.voies = [];
        this.turn = 0;
        this.voies = ['Air', 'Ulmo', 'Wilwar', 'Anar'];
        this.first_player = null;
        this.choix = 'prodige';
        
        // Création des joueurs
        var player0 = new Player(room[0], 0);
        var player1 = new Player(room[1], 1);
        this.first_player = player0;
        
        // Création des prodiges
        player0.prodiges = this.create_prodiges(["Amalrik", "Batsu", "Fizz", "Asato"]);
        player1.prodiges = this.create_prodiges(["Alisonne", "Faine", "Rubis", "Svenn"]);

        // Assignation des joueurs à la partie
        this.players[room[0].id] = player0;
        this.players[room[1].id] = player1;

        for (let socket of room) {
            socket.emit('init_game', {'me': player0, 'opp': player1});
        }
    }

    start_game() {
        // Demande le prodige au premier joueur
        player_sockets[this.first_player.id].emit('choix_prodige');
    }

    create_prodiges(list_names){
        let prodiges = {};
        for (name of list_names) {
            // A modifier pour créer les objets Prodiges
            prodiges[name] = new Prodige(name);
        }
        return prodiges;
    }
}
