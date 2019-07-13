'use strict';

var YTApp = (function() {

  function YTApp(config) {
    var defaults = {
      'configUrl': 'config.json',
      'queriesUrl': 'data/ytGeoQueries.json',
      'uqueriesUrl': 'data/ytGeoQueriesU.json',
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
      $.getJSON(opt.queriesUrl),
      $.getJSON(opt.uqueriesUrl)

    ).done(function(configResp, queriesResp, uqueriesResp){
      _this.opt = $.extend({}, opt, configResp[0]);
      _this.onLoadData(queriesResp[0].queries, uqueriesResp[0].queries)
    });
  };

  YTApp.prototype.doQuery = function(){
    var _this = this;
    var data = this.getQueryData(true);
    if (data===false) return false;

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

  YTApp.prototype.getQueryData = function(doFilter){
    var data = this.$queryForm.serializeArray();
    if (doFilter) data = _.filter(data, function(d){ return d.value.length > 0; });
    if (data.length < 1) return false;
    data = _.map(data, function(d){ return [d.name, d.value]; });
    data = _.object(data);
    return data;
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

    this.$resultList.on('click', '.save-link', function(e){
      e.preventDefault();
      _this.saveVideo($(this).attr('data-vid'));
    });

    this.$queryInputs.on("change", function(e){
      _this.onInputChange();
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
    this.resultData = {};

    $('.query-link[data-index="'+index+'"]').addClass('active');
    var params = $.extend({}, query.params);
    $.each(params, function(key, value){
      _this.$queryFieldset.find('[name="'+key+'"]').val(value);
    });
  };

  YTApp.prototype.loadUI = function(){
    var _this = this;

    $.each(this.queries, function(i, query){
      var uquery = _this.uqueries[i];
      var count = _.has(uquery, "uIds") ? uquery.uIds.length : 0;
      var queryString = decodeURIComponent($.param($.extend({}, query.params)));
      var $li = $('<li><a href="#?'+queryString+'" data-index="'+i+'" class="query-link">'+query.label+' <span class="save-count">'+count+'</span></a></li>');
      _this.$queryList.append($li);
    });

    $.each(this.opt.queryOptions, function(i, opt){
      var $el = '<div><label>'+opt+'</label><input type="text" name="'+opt+'" value="" /></div>';
      _this.$queryFieldset.append($el);
    });

    this.$queryInputs = this.$queryFieldset.find('input');
  };

  YTApp.prototype.onInputChange = function(){
    // var uParams = this.getQueryData();
    // if (uParams===false) return false;
    // this.queries[this.currentQueryIndex].uParams = uParams;
    // this.loadQuery(this.currentQueryIndex);

    this.$resultList.empty();
    this.$pageLink.removeClass('active');
    this.nextPageToken = false;
    this.resultData = {};
  };

  YTApp.prototype.onLoadData = function(queries, uqueries){
    // console.log(queries)
    this.queries = queries;
    this.uqueries = uqueries;

    this.loadUI();
    this.loadQuery(0);
    this.loadListeners();
  };

  YTApp.prototype.onSearchResults = function(items){
    var _this = this;
    var query = this.queries[this.currentQueryIndex];
    var uquery = this.uqueries[this.currentQueryIndex];
    var uIds = _.has(uquery, "uIds") ? uquery.uIds : [];

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
        if (uIds.indexOf(item.id) >= 0) {
          html += '<button class="save-link active" data-vid="'+item.id+'">unsave</button>';
        } else {
          html += '<button class="save-link" data-vid="'+item.id+'">save</button>';
        }
      html += '</li>';
      var $li = $(html);
      _this.$resultList.append($li);
      _this.resultData[item.id] = item;
    });
  };

  YTApp.prototype.saveUserData = function(){
    var data = {
      'filename': this.opt.uqueriesUrl,
      'data': JSON.stringify({'queries': this.uqueries})
    }
    $.post('/save/udata', data, function(resp){
      console.log("Saved user data");
    });
  };

  YTApp.prototype.saveVideoData = function(vid){
    var data = {
      'id': vid,
      'data': JSON.stringify(this.resultData[vid])
    }
    $.post('/save/vdata', data, function(resp){
      console.log("Saved video data");
    });
  };

  YTApp.prototype.saveVideo = function(vid){
    var $link = $('.save-link[data-vid="'+vid+'"]');
    var uquery = this.uqueries[this.currentQueryIndex];
    var uIds = _.has(uquery, "uIds") ? uquery.uIds : [];

    if ($link.hasClass('active')) {
      $link.removeClass('active');
      $link.text('save');
      this.uqueries[this.currentQueryIndex].uIds = _.without(uIds, vid);
    } else {
      $link.addClass('active');
      $link.text('unsave');
      this.uqueries[this.currentQueryIndex].uIds = _.union(uIds, [vid]);
      this.saveVideoData(vid);
    }

    var count = this.uqueries[this.currentQueryIndex].uIds.length;
    $('.query-link[data-index="'+this.currentQueryIndex+'"]').find('.save-count').text(count);

    if (count <= 0) {
      this.uqueries[this.currentQueryIndex] = _.omit(this.uqueries[this.currentQueryIndex], 'uIds');
    }

    this.saveUserData();
  };

  return YTApp;

})();

$(function() {
  var app = new YTApp({});
});
