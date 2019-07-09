'use strict';

var YTApp = (function() {

  function YTApp(config) {
    var defaults = {
      'queriesUrl': 'data/ytGeoQueries.json'
    };
    this.opt = $.extend({}, defaults, config);

    this.init();
  }

  YTApp.prototype.init = function(){
    var _this = this;
    var opt = this.opt;

    this.$queryList = $('#query-list');
    this.$queryForm = $('#query-form');
    this.$queryInputs = $('#query-inputs');
    this.$resultList = $('#result-list');

    $.when(
      $.getJSON(opt.queriesUrl)

    ).done(function(resp){
      _this.onLoadData(resp.queries)
    });
  };

  YTApp.prototype.loadUI = function(){
    var _this = this;

    $.each(this.queries, function(i, query){
      var queryString = decodeURIComponent($.param($.extend({}, query.params, query.uParams)));
      var classString = i > 0 ? '' : 'class="active"'
      var $li = $('<li><a href="#?'+queryString+'" data-index="'+i+'" '+classString+'>'+query.label+' <span>'+query.uIds.length+'</span></a></li>');
      _this.$queryList.append($li);
    });

    var query = this.queries[this.currentQueryIndex];
    var queryParams = $.extend({}, query.params, query.uParams);
    $.each(queryParams, function(key, value){
      var $el = '<div><label>'+key+'</label><input type="text" name="'+key+'" value="'+value+'" /></div>';
      _this.$queryInputs.append($el);
    });
  };

  YTApp.prototype.onLoadData = function(queries){
    console.log(queries)
    this.queries = queries;
    this.currentQueryIndex = 0;

    this.loadUI();
  };

  return YTApp;

})();

$(function() {
  var app = new YTApp({});
});
