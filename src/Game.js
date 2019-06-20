var fs = require('fs')
var utils = require('./src/utils')
var Player = require('./src/Player')
var settings = require('./src/settings')

module.exports = class Game {
    constructor() {
        this.players = [];
        this.score_voies = [];
        this.voies = [];
        this.turn = 0;

        // Création des joueurs
        for (let i = 0; i < 2; i++) {
            this.players.push(new Player(i));
            this.players[i].order = i;
            this.players[i].id = i;
            this.players[i].hp = settings.BASE_HP;
        }

        // Définition des opposants
        for (let i = 0; i < 2; i++) {
            this.players[i].opp = self.players[(i+1) % 2];
        }

        // Génération des Prodiges for chaque joueur
        var json_data = fs.readFileSync('data/prodigies.json');
        var d = JSON.parse(json_data);
        d = utils.shuffle(d);
        selected = d.slice(0, 8);

        // Attribution des prodiges à chaque joueur
        this.players[0].prodigies = [for (i of utils.range(0, 4)) selected[i]];
        this.players[1].prodigies = [for (i of utils.range(4, 8)) selected[i]];
        for (let i = 0; i < 4; i++) {
            this.players[0].prodigies[i] = new Card( self.players[0].prodigies[i], owner=self.players[0]);
            this.players[1].prodigies[i] = new Card( self.players[1].prodigies[i], owner=self.players[1]);
        }

        this.generate_voies()
    }
}
