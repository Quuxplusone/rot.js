var Item = function(x, y, desc) {
    Actor.call(this, x, y, desc);
};
Item.prototype = new Actor();
Item.prototype.getSpeed = function() { return 0; };

var Corpse = function(x, y, desc) {
    Item.call(this, x, y, desc);
    this._damage = 0;
}
Corpse.prototype = new Item();
Corpse.prototype.getAppearance = function() {
    if (this._damage < 4) {
        return ['~', '#f7f'];
    } else if (this._damage < 8) {
        return ['~', '#f00'];
    } else {
        return ['~', '#999'];
    }
};
Corpse.prototype.getSpeed = function() { return 1; };
Corpse.prototype.getNextAction = function() {
    return {
        perform: function(actor) {
            actor.energy -= 100;
            actor._damage += 1;
            if (actor._damage >= 10) {
                Game.removeActor(actor);  // the corpse rots away
            }
            return null;
        }
    };
};
