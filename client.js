var socket = io();

var need_click = false;
var num_need_click = 0;
var num_current_click = 0;
var need_click_target = "none";
var choix = null;

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop_triggered(ev) {
    socket.drop_src = document.getElementById(ev.dataTransfer.getData("text"));
    socket.drop_srcParent = src.parentNode;
    socket.drop_target = ev.currentTarget.firstElementChild;
    socket.drop_ev = ev;
    
    // On enlève le fait que le glyphe ait été cliqué, d'où qu'il vienne
    // Normalement servira à rien, vu qu'il n'y a pas d'action clickée qui
    // nécessite de déplacer des glyphes, mais sait on jamais
    socket.drop_src.setAttribute("clicked", "false")

    // On demande au serveur si le move est légal
    validate_drop();
}

function check_validate_button() {
    // Est-ce que toutes les voies sont pleines
    var lignePlayer = document.getElementById('ligne_centre_player');
    var glyphes = lignePlayer.children;
    var notEmpty = 0;
    for (var i = 0; i < glyphes.length; i++) {
        if (!glyphes[i].children.length == 0) {
            notEmpty++;
        }
    }
    var all_voies_full = notEmpty == 4;
    
    // Est-ce que le prodige a été joué
    var prodige_played = document.getElementById('empty_prodige_j1').children.length > 0;
    
    // Activation ou non du bouton "Valider"
    var btn = document.getElementById('validate_button');
    var false_btn = document.getElementById('false_button');
    let cond_prodige_played = choix == 'prodige' && prodige_played;
    let cond_glyphe_played = choix == 'glyphes' && all_voies_full;
    let cond_glyphe_chosen = choix == 'select_glyphes'
    if (cond_glyphe_chosen || cond_glyphe_played || cond_prodige_played) {
        btn.style.display = 'flex';
        false_btn.style.display = 'none';
    } else {
        btn.style.display = 'none';
        false_btn.style.display = 'flex';
    }   
}

function drop(ev) {
    ev.preventDefault();
    var src = document.getElementById(ev.dataTransfer.getData("text"));
    var srcParent = src.parentNode;
    var target = ev.currentTarget;
    
    if (src.getAttribute('class') == 'glyphe'
        && ['empty_voie', 'hand_glyphes'].includes(target.getAttribute('class'))) {
        drop_triggered(ev);
    } else if (src.getAttribute('class') == 'prodige'
               && ['empty_prodige', 'hand_prodiges'].includes(target.getAttribute('class'))) {
        drop_triggered(ev);
    }
}

function click_glyph(ev) {
    node = ev.currentTarget;
    num_current_click = get_num_current_click();
    console.log(node.parentNode.getAttribute("class"))
    if (need_click) {
        if ((need_click_target == "voie" && node.parentNode.getAttribute("class") == "empty_voie")
            || (need_click_target == "main" && node.parentNode.getAttribute("class") == "hand_glyphes"))
        if (node.getAttribute("clicked") == "false" && num_current_click < num_need_click) {
            node.setAttribute("clicked", "true");
        } else if (node.getAttribute("clicked") == "true") {
            node.setAttribute("clicked", "false");
        }
    }
}

function get_num_current_click() {
    glyphs = document.getElementsByClassName("glyphe")
    num_current_click = 0;
    for (let i = 0; i < glyphs.length; i++) {
        if (glyphs[i].getAttribute("player") == "self"
           && glyphs[i].getAttribute("clicked") == "true") {
            num_current_click++;
        }
    }
    return num_current_click;
}


function create_glyph(i, v) {
    var glyph = document.createElement("div");
    if (v != -1) {
        glyph.setAttribute("id", "g"+i);
        glyph.setAttribute("draggable", "true");
        glyph.setAttribute("ondragstart", "drag(event)");
        glyph.setAttribute("onclick", "click_glyph(event);");
        glyph.setAttribute("clicked", "false");
        glyph.setAttribute("class", "glyphe");
        glyph.innerHTML = v;
    } else {
        glyph.setAttribute("class", "glyphe_opp");
    }
    return glyph;
}


function create_prodige(name, opp=false) {
    var prodige = document.createElement("div");
    prodige.setAttribute("id", name);
    prodige.setAttribute("class", "prodige");
    if (!opp) {
        prodige.setAttribute("draggable", "true");
        prodige.setAttribute("ondragstart", "drag(event)");
    }
    prodige.innerHTML = name;
    return prodige;
}


function init_game(data) {
    me = data['me'];
    opp = data['opp'];

    var hand_player = document.getElementById('hand_glyphes_j1');
    var hand_opp = document.getElementById('hand_glyphes_j0');
    var hand_prodiges_player = document.getElementById('hand_prodiges_j1');
    var hand_prodiges_opp = document.getElementById('hand_prodiges_j0');

    var glyphes = me.hand;
    var prodiges = me.prodiges;
    var prodiges_opp = opp.prodiges;

    for (var i = 0; i < prodiges.length; i++) {
        hand_prodiges_player.appendChild(create_prodige(prodiges[i]));
        hand_prodiges_opp.appendChild(create_prodige(prodiges_opp[i], opp=true));
    }
    for (var i = 0; i < glyphes.length; i++) {
        hand_player.appendChild(create_glyph(i, glyphes[i]));
        hand_opp.appendChild(create_glyph(i+glyphes.length, -1));
    }   
}

function debug(string) {
    socket.emit('debug', {'cmd': string});
}

// =========== ONLY FOR DEBUG
function init() {
    socket.emit('init_debug');
    document.getElementById('room_choice').style.display = 'none';
    document.getElementById('waiting').style.display = 'none';
}
// ==========================

function init_backup() {
    do {
        var pseudo = prompt('Votre pseudo');
    } while (pseudo == '');
    socket.pseudo = pseudo;
    socket.emit('init', pseudo);
}

function join_room(id) {
    socket.emit('join_room', id);
    document.getElementById('room_choice').style.display = 'none';
    document.getElementById('waiting').style.display = 'flex';
}

function refresh(id) {
    list = document.getElementById('room_choice_list');
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }
    socket.emit('init', socket.pseudo);
}

function validate_drop() {
    if (choix == 'prodige') {
        prodige = socket.drop_src.getAttribute('id');
        socket.emit('choix_prodige', prodige);
    }
}

function text_log(string){
    log = document.getElementsByClassName('log')[0]
    node = document.createElement('p');
    node.innerHTML = string;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
}

socket.on('list_rooms', function(data){
    list = document.getElementById('room_choice_list');
    for (room of data){
        elem = document.createElement('div');
        elem.setAttribute('onclick', 'join_room("' + room['id'] + '")');
        elem.setAttribute('class', 'btn_room_choice');
        elem.innerHTML = room['pseudo'];
        list.appendChild(elem);
    }
});

socket.on('init_game', function(data){
    document.getElementById('waiting').style.display = 'none';
    document.getElementById('main').style.display = 'flex';
    init_game(data);
});

socket.on('text_log', function(string){
    text_log(string)
});

socket.on('choix_prodige', function() {
    choix = 'prodige';
    hand = document.getElementsById('hand_prodiges_j1');
    for (child of hand.children) {
        child.setAttribute('draggable', 'true');
    }
});

socket.on('drop_validated', function(){
    src = socket.drop_src;
    srcParent = socket.drop_srcParent;
    target = socket.drop_target;
    ev = socket.drop_ev;
        
    // Si on vise la main, on ne fait pas de remplacement
    if (['hand_glyphes', 'hand_prodiges'].includes(ev.currentTarget.getAttributeNode("class").value)) {
        ev.currentTarget.appendChild(src);
    } else {
        if (target != null) {
            // S'il y a déjà quelque chose dans la case
            ev.currentTarget.replaceChild (src, target);
            srcParent.appendChild(target);
        } else {
            // Sinon
            ev.currentTarget.appendChild(src);
        }
    }

    check_validate_button();
});

socket.on('drop_not_validated', function(){
    socket.drop_src = null;
    socket.drop_srcParent = null;
    socket.drop_target = null;
    socket.drop_ev = null;
    text_log('Coup interdit');
});
