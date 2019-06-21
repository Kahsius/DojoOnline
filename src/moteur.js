const Player = require("./Player").Player;

module.exports.create_game = function(room) {
    // Création des joueurs
    room[0].player = new Player(room[0].pseudo, 0);
    room[1].player = new Player(room[1].pseudo, 1);

    // Création des prodiges
    room[0].player.prodiges = ["Amalrik", "Batsu", "Fizz", "Asato"];
    room[1].player.prodiges = ["Alisonne", "Faine", "Rubis", "Svenn"];

    for (socket of room) {
        socket.emit('init_game', {'me': socket.player, 'opp': players[socket.opp].player});
    }
}
