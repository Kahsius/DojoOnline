const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
var io = require('socket.io')(http);

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});

io.on('connection', function(socket){
    console.log(socket.id + ' connected');
    socket.on('disconnect', function(){
        console.log(socket.id + ' disconnected');
    });
});

app.use(express.static('.'));
http.listen(8080, function(){
    console.log('listening on *:8080');
});