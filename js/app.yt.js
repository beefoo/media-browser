'use strict';

var YTApp = (function() {

  function YTApp(config) {
    var defaults = {
      'configUrl': 'config.json',
      'queriesUrl': 'data/ytGeoQueries.json',
      'resultsPerPage': 50,
      // https://developers.google.com/youtube/v3/docs/search/list
      'queryOptions': ['q', 'location', 'locationRadius', 'videoLicense', 'publishedAfter', 'topicId']
    };
    this.opt = $.extend({}, defaults, config);
    this.init();
  }

  YTApp.prototype.init = function(){
    var _this = this;
    var opt = this.opt;

    this.$queryList = $('#query-list');
    this.$queryForm = $('#query-form');
    this.$queryFieldset = $('#query-fieldset');
    this.$resultList = $('#result-list');
    this.$pageLink = $('#page-link');

    $.when(
      $.getJSON(opt.configUrl),
      $.getJSON(opt.queriesUrl)

    ).done(function(configResp, queriesResp){
      _this.opt = $.extend({}, opt, configResp[0]);
      _this.onLoadData(queriesResp[0].queries)
    });
  };

  YTApp.prototype.doQuery = function(){
    var _this = this;
    var data = this.$queryForm.serializeArray();
    data = _.filter(data, function(d){ return d.value.length > 0; });
    if (data.length < 1) return false;
    data = _.map(data, function(d){ return [d.name, d.value]; });
    data = _.object(data);

    data.key = this.opt.ytApiKey;
    data.part = 'id';
    data.type = 'video';
    data.videoDimension = '2d';
    data.maxResults = this.opt.resultsPerPage;
    data.order = 'date';
    if (this.nextPageToken) data.pageToken = this.nextPageToken;
    // console.log(data);

    this.$resultList.removeClass('empty');
    this.$resultList.addClass('loading');

    $.getJSON('https://www.googleapis.com/youtube/v3/search', data, function(sresp) {
      var ids = _.map(sresp.items, function(item){ return item.id.videoId; });
      // console.log(sresp.nextPageToken)
      _this.nextPageToken = sresp.nextPageToken;
      _this.totalResults = sresp.pageInfo.totalResults;
      console.log(_this.totalResults + ' total results.');

      var vdata = {};
      vdata.key = data.key;
      vdata.part = 'id,statistics,snippet';
      vdata.id = ids.join(',');
      vdata.maxResults = data.maxResults;
      $.getJSON('https://www.googleapis.com/youtube/v3/videos', vdata, function(vresp) {
        _this.onSearchResults(vresp.items);
      });
    });
  };

  YTApp.prototype.loadListeners = function(){
    var _this = this;

    this.$queryForm.on('submit', function(e){
      e.preventDefault();
      _this.doQuery();
    });

    $('.query-link').on('click', function(e){
      e.preventDefault();
      _this.loadQuery(parseInt($(this).attr('data-index')));
    });

    $('.page-link').on('click', function(e){
      e.preventDefault();
      _this.doQuery();
    });
  };

  YTApp.prototype.loadQuery = function(index){
    var _this = this;
    this.currentQueryIndex = index;
    var query = this.queries[index];

    $('.query-link').removeClass('active');
    this.$queryInputs.val('');
    this.$resultList.empty();
    this.$pageLink.removeClass('active');
    this.nextPageToken = false;

    $('.query-link[data-index="'+index+'"]').addClass('active');
    $.each(query.params, function(key, value){
      _this.$queryFieldset.find('[name="'+key+'"]').val(value);
    });
  };

  YTApp.prototype.loadUI = function(){
    var _this = this;

    $.each(this.queries, function(i, query){
      var queryString = decodeURIComponent($.param($.extend({}, query.params, query.uParams)));
      var $li = $('<li><a href="#?'+queryString+'" data-index="'+i+'" class="query-link">'+query.label+' <span>'+query.uIds.length+'</span></a></li>');
      _this.$queryList.append($li);
    });

    $.each(this.opt.queryOptions, function(i, opt){
      var $el = '<div><label>'+opt+'</label><input type="text" name="'+opt+'" value="" /></div>';
      _this.$queryFieldset.append($el);
    });

    this.$queryInputs = this.$queryFieldset.find('input');
  };

  YTApp.prototype.onLoadData = function(queries){
    // console.log(queries)
    this.queries = queries;

    this.loadUI();
    this.loadQuery(0);
    this.loadListeners();
  };

  YTApp.prototype.onSearchResults = function(items){
    var _this = this;

    this.$resultList.removeClass('loading empty');
    if (!items || items.length < 1) {
      this.$resultList.addClass('empty');
      return false;
    }

    if (this.nextPageToken && items.length >= this.opt.resultsPerPage) this.$pageLink.addClass('active');
    else this.$pageLink.removeClass('active');

    _.each(items, function(item, i){
      var html = '';
      html += '<li>';
        html += '<a href="https://www.youtube.com/watch?v='+item.id+'" target="_blank">';
          html += '<img src="'+item.snippet.thumbnails.default.url+'" />';
          html += item.snippet.title + ' ('+item.statistics.viewCount+' views)';
        html += '</a>';
        html += '<button class="active">unsave</button>';
      html += '</li>';
      var $li = $(html);
      _this.$resultList.append($li);
    });
  };

  return YTApp;

})();

$(function() {
  var app = new YTApp({});
});
