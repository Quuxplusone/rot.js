var Creature = function(x, y) {
    Actor.call(this, x, y);
    this.displayPriority = 50;
    this.hp = 100;
};
Creature.prototype = new Actor();
Creature.prototype.canPass = function(coord) {
    if (Game.map.terrain(coord.x, coord.y).blocksWalking) {
        return false;
    }
    var actors = Game.actors.filter(function(a) { return a != this && a instanceof Creature && a.coordEquals(coord); });
    if (actors.length) {
        return false;
    }
    return true;
};
Creature.prototype.canSee = function(coord) {
    var lightPasses = function(x,y) {
        return Game.map.valid(x,y) && !Game.map.terrain(x,y).blocksSight;
    };
    var fov = new ROT.FOV.PreciseShadowcasting(lightPasses);
    var maxVisRadius = this.mooreDistanceTo(coord)+1;
    var result = false;
    fov.compute(this.x, this.y, maxVisRadius, function(x, y, r, value) {
        if (x == coord.x && y == coord.y) {
            result = (value > 0.8);
        }
    });
    return result;
};
Creature.prototype.getHit = function(loss) {
};
