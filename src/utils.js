module.exports.shuffle = function(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

module.exports.range = function*(start, end) {
    for (let i = start; i < end; i++) {
        yield i;
    }
}
