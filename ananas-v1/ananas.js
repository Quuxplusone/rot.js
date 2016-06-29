String.format.map.the = "the";

var Game = {
    ananas: null,
    actors: [],
    currentActor: 0,

    init: function() {
        this.display = new ROT.Display({
            width: 80,
            height: 25,
            spacing: 1.1,
        });
        this.level = document.querySelector("#level");
        this.legend = document.querySelector("#legend");
        this.level.appendChild(this.display.getContainer());

        this._generateMap();

        this.redrawDisplay();
        window.addEventListener("keydown", this.keydownListener);
        this.runGameLoopUntilBlocked();
    },

    keydownListener: function(e) {
        Game.player.setNextAction(Game.actionFromKey(e.keyCode));
        Game.runGameLoopUntilBlocked();
        Game.redrawDisplay();
    },

    runGameLoopUntilBlocked: function() {
        while (true) {
            this.currentActor = (this.currentActor + 1) % this.actors.length;
            var actor = this.actors[this.currentActor];
            actor.energy += actor.getSpeed();
            if (actor.energy > 100) {
                var action = actor.getNextAction();
                if (action === null) {
                    return;
                }
                while (action !== null) {
                    action = action.perform(actor);
                }
            }
        }
    },

    alert: function(message) {
        var p = document.createElement("p");
        var span = document.createTextNode(message);
        p.appendChild(span);
        this.legend.appendChild(p);
        this.legend.scrollTop = this.legend.scrollHeight;
    },

    win: function() {
        window.removeEventListener("keydown", this.keydownListener);
    },

    actionFromKey: function(key) {
        switch (key) {
            case ROT.VK_PERIOD:
                return new WaitAction();
            case ROT.VK_SPACE:
            case ROT.VK_RETURN:
                return new BoxAction();
            case ROT.VK_UP:
                return new WalkAction(0, -1);
            case ROT.VK_DOWN:
                return new WalkAction(0, 1);
            case ROT.VK_RIGHT:
                return new WalkAction(1, 0);
            case ROT.VK_LEFT:
                return new WalkAction(-1, 0);
            default:
                return null;
        }
    },

    actorsAt: function(x, y) {
        var result = [];
        for (var i = 0; i < this.actors.length; ++i) {
            var a = this.actors[i];
            if (a.x === x && a.y === y) {
                result.push(a);
            }
        }
        return result;
    },

    _generateMap: function() {
        var digger = new ROT.Map.Digger(80,20);
        var freeCells = [];

        this.map = {};

        var digCallback = function(x, y, value) {
            if (value) { return; }

            var key = x+","+y;
            this.map[key] = ".";
            freeCells.push(key);
        }
        digger.create(digCallback.bind(this));

        this.player = this._createBeing(Player, freeCells);
        for (var i = 0; i < 10; i++) {
            var box = this._createBeing(BananaBox, freeCells);
            var key = box.x + ',' + box.y;
            this.map[key] = '*';
            if (i === 0) {
                this.ananas = key;
            }
        }
        this._createBeing(GridBug, freeCells);
        this._createBeing(GridBug, freeCells);
        this._createBeing(GridBug, freeCells);
    },

    _createBeing: function(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        var actor = new what(x, y);
        this.actors.push(actor);
        return actor;
    },

    redrawDisplay: function() {
        var actormap = {};
        for (var i = 0; i < this.actors.length; ++i) {
            var a = this.actors[i];
            actormap[a.x+','+a.y] = a;
        }
        for (var x = 0; x < 80; ++x) {
            for (var y = 0; y < 25; ++y) {
                var key = x+','+y;
                var actors = this.actorsAt(x, y);
                if (actors.length > 0) {
                    function keycmp(a, b) {
                        if (a.displayPriority < b.displayPriority) return 1;
                        if (a.displayPriority > b.displayPriority) return -1;
                        return 0;
                    }
                    actors.sort(keycmp);
                    var [g, fg, bg] = actors[0].getAppearance();
                    this.display.draw(x, y, g, fg, bg);
                } else if (key in this.map) {
                    this.display.draw(x, y, '.');
                }
            }
        }
    },
};

///////////////////////////////////////////////////////////////////////////
// ACTORS
//

var Actor = function(x, y) {
    this.x = x;
    this.y = y;
    this.energy = 0;
    this.displayPriority = 50;
};

var Player = function(x, y) {
    Actor.call(this, x, y);
    this.displayPriority = 99;
    this._action = null;
};
Player.prototype = {
    the: function() { return "you"; },
    getAppearance: function() {
        return ['@', '#ff0', '#000'];
    },
    getSpeed: function() {
        return 10;
    },
    getNextAction: function() {
        var action = this._action;
        this._action = null;
        return action;
    },
    setNextAction: function(action) {
        this._action = action;
    },
};

var BananaBox = function(x, y) {
    Actor.call(this, x, y);
    this.displayPriority = 1;
};
BananaBox.prototype = {
    the: function() { return "the banana box"; },
    getAppearance: function() { return ['*']; },
    getSpeed: function() { return 0; },
};

var GridBug = function(x, y) {
    Actor.call(this, x, y);
};
GridBug.prototype = {
    the: function() { return "the grid bug"; },
    getAppearance: function() { return ['x', '#f0f']; },
    getSpeed: function() { return 6; },
    getNextAction: function() {
        var x = Game.player.x;
        var y = Game.player.y;

        var passableCallback = function(x, y) {
            return (x+","+y in Game.map);
        }
        var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});

        var path = [];
        var pathCallback = function(x, y) {
            path.push([x, y]);
        }
        astar.compute(this.x, this.y, pathCallback);

        var newX = path[1][0];
        var newY = path[1][1];
        var targets = Game.actorsAt(newX, newY);
        if (targets.length > 0) {
            return new ShockAction(targets[0]);
        } else {
            return new WalkAction(newX - this.x, newY - this.y);
        }
    },
};

///////////////////////////////////////////////////////////////////////////
// ACTIONS
//

var WaitAction = function() {};
WaitAction.prototype.perform = function(actor) {
    actor.energy -= 100;
    return null;
};

var WalkAction = function(dx, dy) {
    this.dx = dx;
    this.dy = dy;
};
WalkAction.prototype.perform = function(actor) {
    /* is there a free space? */
    var newX = actor.x + this.dx;
    var newY = actor.y + this.dy;
    var newKey = newX + "," + newY;
    if (!(newKey in Game.map)) {
        Game.alert("%The bump[s] into a wall.".format(actor));
    } else {
        var actors = Game.actorsAt(newX, newY);
        function isAnimate(a) {
            return a.the() != 'the banana box';
        }
        if (actors.some(isAnimate)) {
            return new WaitAction();
        } else {
            actor.x = newX;
            actor.y = newY;
            actor.energy -= 100;
        }
    }
    return null;
};

var BoxAction = function() {};
BoxAction.prototype.perform = function(actor) {
    var key = actor.x + "," + actor.y;
    if (Game.map[key] != "*") {
        Game.alert("There is no box here!");
    } else if (key == Game.ananas) {
        Game.alert("Hooray! You found an ananas and won this game.");
        Game.win();
    } else {
        Game.alert("This box is empty :-(");
        actor.energy -= 100;
    }
    return null;
};

var ShockAction = function(defender) {
    this.defender = defender;
};
ShockAction.prototype.perform = function(actor) {
    Game.alert("%The shocks %the!".format(actor, this.defender));
    actor.energy -= 50;
    return null;
};

window.onload = function() {
    Game.init();
};
