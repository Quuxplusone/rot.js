var Map = function(width, height) {
    this.width = width;
    this.height = height;
    this.clear();
}
Map.prototype.valid = function(x, y) {
    return (0 <= x && x < this.width && 0 <= y && y < this.height);
};
Map.prototype.clear = function() {
    this._terrain = {};
    this._room = {};
    this._rooms = [];
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            this._room[x + ',' + y] = null;
            this._terrain[x + ',' + y] = new Terrain('wall');
        }
    }
};
Map.prototype.room = function(x,y) {
    return this._room[x + ',' + y];
};
Map.prototype.terrain = function(x,y) {
    return this._terrain[x + ',' + y];
};
Map.prototype.lightPassesCallback = function(x,y) {
    // "Does light pass this space?", in the format expected by ROT.FOV.PreciseShadowcasting.
    return this.valid(x,y) && !this.terrain(x,y).blocksSight;
};
Map.prototype.getAllPassableCoordinates = function() {
    var result = [];
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            if (!this.terrain(x, y).blocksWalking) {
                result.push(x + ',' + y);
            }
        }
    }
    return result;
};
Map.prototype.generateDungeon = function() {
    this.clear();
    var dug = 0;
    var start = Date.now();
    // Make some random rooms.
    while (Date.now() - start < 150 && dug < 0.2 * this.width * this.height) {
        var rcx = ROT.RNG.getUniformInt(0, this.width / 2) * 2 + 1;
        var rcy = ROT.RNG.getUniformInt(0, this.height / 2) * 2 + 1;
        var rw = ROT.RNG.getNormalInt(1, 5) * 2 + 1;
        var rh = ROT.RNG.getNormalInt(1, 3) * 2 + 1;
        var room = new Room(rcx, rcy, rw, rh);
        console.log(rcx, rcy, rw, rh);
        if (room.getAllInternalAndBorderingCoords().every(function([x,y]) { return this.valid(x,y) && this.room(x,y) == null }, this)) {
            dug += rw * rh;
            this._rooms.push(room);
            room.getAllInternalCoords().forEach(function(xy) {
                var [x,y] = xy;
                this._room[x + ',' + y] = room;
                this._terrain[x + ',' + y] = new Terrain('floor');
            }, this);
        }
    }
    // TODO: Make a maze that connects the entire dungeon, using a variant of Eller's algorithm.
    // TODO: Remove dead ends from the maze.
    // TODO: Try to sprout new features off from the existing map.
};

var Room = function(x, y, width, height) {
    this._x = x;
    this._y = y;
    this.width = width;
    this.height = height;
};
Room.prototype.getAllInternalCoords = function() {
    var result = [];
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            result.push([this._x + x, this._y + y]);
        }
    }
    return result;
};
Room.prototype.getAllInternalAndBorderingCoords = function() {
    var result = [];
    for (var x = -1; x < this.width+1; ++x) {
        for (var y = -1; y < this.height+1; ++y) {
            result.push([this._x + x, this._y + y]);
        }
    }
    return result;
};

var Terrain = function(name) {
    this.name = name;
    switch (this.name) {
        case 'wall':
            this.appearance = ['#'];
            this.blocksWalking = true;
            this.blocksSight = true;
            break;
        case 'floor':
            this.appearance = ['.'];
            this.blocksWalking = false;
            this.blocksSight = false;
            break;
    }
};
Terrain.prototype.the = function() {
    return 'the ' + this.name;
};
