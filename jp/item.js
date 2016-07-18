var Item = function(x, y) {
    Actor.call(this, x, y);
};
Item.prototype = new Actor();
Item.prototype.getSpeed = function() { return 0; };
