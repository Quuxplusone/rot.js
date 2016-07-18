var Creature = function(x, y, maxhp) {
    Actor.call(this, x, y);
    this.maxhp = maxhp;
    this.hp = maxhp;
};
Creature.prototype = new Actor();
Creature.prototype.whenHitBy = function(attacker) {};
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
