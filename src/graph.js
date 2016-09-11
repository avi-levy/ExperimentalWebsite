// Inspired by http://stackoverflow.com/questions/14104881/add-remove-class-to-a-dom-element-using-only-javascript-and-best-of-these-2-way

var toArray = function(s) {
    return (s || "").split(/\s+/);
}

Element.prototype.setClass = function(s) {
    this.className = s.replace(/^\s+|\s+$/g,'');
}

Element.prototype.addClass = function(name) {
    name = toArray(name);
    var cur = " " + this.className + " ",
    retval = this.className;
    for(var c = 0, cl = name.length; c < cl; c++ ) {
        if(this.className.indexOf( " " + name[c] + " " ) < 0 ) {
           retval += " " + name[c];
        }
    }
    this.setClass(retval);
};

Element.prototype.removeClass = function(name) {
    name = toArray(name);
    var retval = (" " + this.className + " ").replace(/[\n\t]/g, " ");
    for(var c = 0, cl = name.length; c < cl; c++ ) {
        retval = retval.replace(" " + name[c] + " ", " ");
    }
    this.setClass(retval);
};

var size = function(node) {
    p = node.pos.getc();
    return node.getData('dim') * Math.pow(1 - p.squaredNorm()/1,3);
};
var isLeaf = function(node) {
    return (Object.keys(node.adjacencies).length <= 1);
};

$jit.Hypertree.Plot.NodeTypes.implement({  
    'sphere': {  
        'render': function(node, canvas) {
            dim = size(node);
            p = node.pos.getc();
            p.$scale(node.scale);
            color = isLeaf(node) ? '#cde' : '#adf';
            if (dim > 0.2) {
                if(isNaN(p.x) || isNaN(p.y)) {
                    console.log("error");
                    return;
                }
                var ctx = canvas.getCtx();
                var rgrad = ctx.createRadialGradient(p.x - dim * .5,p.y - dim * .5,0,p.x,p.y, 8 * dim);
                rgrad.addColorStop(0, color);
                rgrad.addColorStop(1, 'rgba(0,0,0,.6)');
                ctx.fillStyle = rgrad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, dim, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx['fill']();
            }
        },  
        'contains': function(node, pos) {  
            var dim = node.getData('dim'),
            npos = node.pos.getc().$scale(node.scale);
            return this.nodeHelper.circle.contains(npos, pos, dim);            
        }  
    }  
});

$jit.Hypertree.implement({
    'getWidth': function() {
    return this.width;
    },
            onCreateLabel: function(elem, node){
            elem.innerHTML = "\
                <div class=\"node-name\">" +
                    node.name +
                "</div>\
                <div class=\"node-content\">" +
                    node.data.content +
                "</div>\
                ";
                // TODO: process better; maybe markdown?
            
            $jit.util.addEvent(elem, 'click', function() {
                poincare.hist.push(poincare.graph.getClosestNodeToOrigin().id);
                poincare.onClick(node.id, {
                    onComplete: function() {
                        poincare.controller.onComplete();
                    },
                    hideLabels: false
                });
            });
        },
});
function poincare(id, b, r) {
    var tree = new $jit.Hypertree({
        injectInto: id,
        Node: {
            dim: 280,
            color: "#0af",
            overridable: false,  
            type: 'sphere',
        },
        Edge: {
            lineWidth: 5,
            color: "#088",
            type: 'hyperline',// TODO: override line to color if it was the last visited, figure out offscreen nodes navigation
        },
        onCreateLabel: function(elem, node){
            elem.innerHTML = "\
                <div class=\"node-name\">" +
                    node.name +
                "</div>\
                <div class=\"node-content\">" +
                    node.data.content +
                "</div>\
                ";
                // TODO: process better; maybe markdown?
            
            $jit.util.addEvent(elem, 'click', function() {
                poincare.hist.push(poincare.graph.getClosestNodeToOrigin().id);
                poincare.onClick(node.id, {
                    onComplete: function() {
                        poincare.controller.onComplete();
                    },
                    hideLabels: false
                });
            });
        },
        adjustStyle: function(elem, node) {
            if(elem && elem.buddy) {
                dim = size(node);
                elem.style.width = elem.buddy.style.width = 2 * dim + "px";
                elem.style.height = elem.buddy.style.height = 2 * dim + "px";
                elem.style.left = elem.buddy.style.left = parseInt(elem.style.left) - dim - 5 + "px";
                elem.style.top = elem.buddy.style.top = parseInt(elem.style.top) - dim - 5 + "px";
            } else {
                console.log("adjustStyle: Element (or its buddy) was null");
            }
        },
        onPlaceLabel: function(elem, node){
            if(!elem.buddy) {
                var clone = elem.cloneNode(false); 
                clone.removeAttribute('id');
                clone.innerHTML = '';
                clone.addClass("clone");
                elem.parentNode.insertBefore(clone, elem.nextSibling);
                elem.buddy = clone;
            }
            this.adjustStyle(elem, node);

            elem.removeClass("dist0 dist1 dist2 dist3");
            if(node._depth == 0) {
                elem.addClass("dist0");
                return;
            }
            if(node._depth < 2) {
                elem.addClass("dist1");
                return;
            }
            if(node._depth < 4) {
                elem.addClass("dist2");
                return;
            }
            elem.addClass("dist3");
        },
        onComplete: function(){
            poincare.blurb.style.visibility = (poincare.hist.length > 0) ? "visible" : "hidden";
            poincare.reset.childNodes[1].innerHTML = (poincare.hist.length > 0) ? "Reset" : "Click on circles!";

        }
    });

    tree.hist = [];
    tree.center = function() {
        // TODO: make this a smooth animation
        var s = this.canvas.getSize();
        window.scrollTo(
            (s.width - window.innerWidth)/2,
            (s.height - window.innerHeight)/2
        );
    }
    tree.goto = function(node) {
        poincare.fx.animation.opt.complete()
        poincare.onClick(node,{
            onComplete: function() {
                poincare.center(); 
                poincare.controller.onComplete();
            },
            hideLabels: false
        });
    };

    tree.blurb = $jit.id(b);
    tree.reset = $jit.id(r);

    $jit.util.addEvent(tree.reset, 'click', function() {
        poincare.goto(poincare.graph.getNode(poincare.root).id);
        poincare.hist = [];
    });
    $jit.util.addEvent(tree.blurb, 'click', function() {
        if(poincare.hist.length == 0) return;
        poincare.goto(poincare.hist.pop());
    });
    tree.loadJSON(json);
    return tree;
}

function init(){
    window.poincare = poincare('graph', 'blurb','reset');
    poincare.refresh(); // has to go outside of poincare() code due to global window reference
    poincare.center();
    poincare.controller.onComplete();
}
