/*
This demo visualises wine and cheese pairings.
*/

$(function () {
  var layoutPadding = 50;
  var aniDur = 500;
  var easing = "linear";
  var genid = "5577";
  console.log("genid: " + genid); //debug

  var cy;

  var infoTemplate = Handlebars.compile(
    [
      '<p class="ac-name">{{name}}</p>',
      '<p class="ac-node-type"><i class="fa fa-info-circle"></i> {{NodeTypeFormatted}} {{#if Type}}({{Type}}){{/if}}</p>',
      '{{#if Milk}}<p class="ac-milk"><i class="fa fa-angle-double-right"></i> {{Milk}}</p>{{/if}}',
      '{{#if Country}}<p class="ac-country"><i class="fa fa-map-marker"></i> {{Country}}</p>{{/if}}',
      '<p class="ac-more"><i class="fa fa-external-link"></i> <a target="_blank" href="https://www.ncbi.nlm.nih.gov/gquery/?term={{name}}">More information</a></p>',
    ].join("")
  );

  function initCy(elements, styleJson) {
    console.log(elements); //debug
    console.log(styleJson); //debug
    console.log("initCy"); //debug
    var loading = document.getElementById("loading");

    elements.nodes.forEach(function (n) {
      var data = n.data;

      data.NodeTypeFormatted = data.NodeType;

      if (data.NodeTypeFormatted === "RedWine") {
        data.NodeTypeFormatted = "Red Wine";
      } else if (data.NodeTypeFormatted === "WhiteWine") {
        data.NodeTypeFormatted = "White Wine";
      }

      n.data.orgPos = {
        x: n.position.x,
        y: n.position.y,
      };
    });

    loading.classList.add("loaded");

    cy = window.cy = cytoscape({
      container: document.getElementById("cy"),
      layout: { name: "preset", padding: layoutPadding },
      style: styleJson,
      elements: elements,
      motionBlur: true,
      selectionType: "single",
      boxSelectionEnabled: false,
      autoungrabify: true,
    });

    var allNodes = cy.nodes();
    var allEles = cy.elements();

    cy.on("free", "node", function (e) {
      var n = e.cyTarget;
      var p = n.position();

      n.data("orgPos", {
        x: p.x,
        y: p.y,
      });
    });

    cy.on("tap", function () {
      $("#search").blur();
    });

    cy.on(
      "select unselect",
      "node",
      _.debounce(function (e) {
        var node = cy.$("node:selected");

        if (node.nonempty()) {
          showNodeInfo(node);

          Promise.resolve().then(function () {
            return highlight(node);
          });
        } else {
          hideNodeInfo();
          clear();
        }
      }, 100)
    );
  }

  function fetchData(genid) {
    return $.ajax({
      url: "conn.php",
      type: "POST",
      data: { genid: genid },
      dataType: "json",
    });
  }

  function updateData(genid) {
    fetchData(genid)
      .then(function (data) {
        console.log(data); //debug
        var elements = data.elements;
        var styleJson = data.style;
        console.log(elements);
        console.log(styleJson); //debug

        cy.remove(cy.elements());
        cy.style().clear();

        initCy(elements, styleJson);
      })
      .catch(function (error) {
        console.error("Error fetching data:", error);
      });
  }

  function highlight(node) {
    var oldNhood = lastHighlighted;

    var nhood = (lastHighlighted = node.closedNeighborhood());
    var others = (lastUnhighlighted = cy.elements().not(nhood));

    var reset = function () {
      cy.batch(function () {
        others.addClass("hidden");
        nhood.removeClass("hidden");

        allEles.removeClass("faded highlighted");

        nhood.addClass("highlighted");

        others.nodes().forEach(function (n) {
          var p = n.data("orgPos");

          n.position({ x: p.x, y: p.y });
        });
      });

      return Promise.resolve()
        .then(function () {
          if (isDirty()) {
            return fit();
          } else {
            return Promise.resolve();
          }
        })
        .then(function () {
          return Promise.delay(aniDur);
        });
    };

    var runLayout = function () {
      var p = node.data("orgPos");

      var l = nhood.filter(":visible").makeLayout({
        name: "concentric",
        fit: false,
        animate: true,
        animationDuration: aniDur,
        animationEasing: easing,
        boundingBox: {
          x1: p.x - 1,
          x2: p.x + 1,
          y1: p.y - 1,
          y2: p.y + 1,
        },
        avoidOverlap: true,
        concentric: function (ele) {
          if (ele.same(node)) {
            return 2;
          } else {
            return 1;
          }
        },
        levelWidth: function () {
          return 1;
        },
        padding: layoutPadding,
      });

      var promise = cy.promiseOn("layoutstop");

      l.run();

      return promise;
    };

    var fit = function () {
      return cy
        .animation({
          fit: {
            eles: nhood.filter(":visible"),
            padding: layoutPadding,
          },
          easing: easing,
          duration: aniDur,
        })
        .play()
        .promise();
    };

    var showOthersFaded = function () {
      return Promise.delay(250).then(function () {
        cy.batch(function () {
          others.removeClass("hidden").addClass("faded");
        });
      });
    };

    return Promise.resolve()
      .then(reset)
      .then(runLayout)
      .then(fit)
      .then(showOthersFaded);
  }

  function clear(opts) {
    if (!isDirty()) {
      return Promise.resolve();
    }

    opts = $.extend({}, opts);

    cy.stop();
    allNodes.stop();

    var nhood = lastHighlighted;
    var others = lastUnhighlighted;

    lastHighlighted = lastUnhighlighted = null;

    var hideOthers = function () {
      return Promise.delay(125).then(function () {
        others.addClass("hidden");

        return Promise.delay(125);
      });
    };

    var showOthers = function () {
      cy.batch(function () {
        allEles.removeClass("hidden").removeClass("faded");
      });

      return Promise.delay(aniDur);
    };

    var restorePositions = function () {
      cy.batch(function () {
        others.nodes().forEach(function (n) {
          var p = n.data("orgPos");

          n.position({ x: p.x, y: p.y });
        });
      });

      return restoreElesPositions(nhood.nodes());
    };

    var resetHighlight = function () {
      nhood.removeClass("highlighted");
    };

    return Promise.resolve()
      .then(resetHighlight)
      .then(hideOthers)
      .then(restorePositions)
      .then(showOthers);
  }

  function showNodeInfo(node) {
    $("#info").html(infoTemplate(node.data())).show();
  }

  function hideNodeInfo() {
    $("#info").hide();
  }

  $("#search").on("change", function () {
    var genid = $(this).val();
    updateData(genid);
  });
});
