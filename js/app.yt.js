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

    this.$resultList.on('click', '.save-link', function(e){
      e.preventDefault();
      _this.saveVideo($(this).attr('data-vid'));
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
    $.each(query.params, function(key, value){
      _this.$queryFieldset.find('[name="'+key+'"]').val(value);
    });
  };

  YTApp.prototype.loadUI = function(){
    var _this = this;

    $.each(this.queries, function(i, query){
      var queryString = decodeURIComponent($.param($.extend({}, query.params, query.uParams)));
      var $li = $('<li><a href="#?'+queryString+'" data-index="'+i+'" class="query-link">'+query.label+' <span class="save-count">'+query.uIds.length+'</span></a></li>');
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
    var query = this.queries[this.currentQueryIndex];

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
        if (query.uIds.indexOf(item.id) >= 0) {
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
      'filename': this.opt.queriesUrl,
      'data': JSON.stringify({'queries': this.queries})
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
    var uIds = this.queries[this.currentQueryIndex].uIds;

    if ($link.hasClass('active')) {
      $link.removeClass('active');
      $link.text('save');
      this.queries[this.currentQueryIndex].uIds = _.without(uIds, vid);
    } else {
      $link.addClass('active');
      $link.text('unsave');
      if (uIds.indexOf(vid) < 0) this.queries[this.currentQueryIndex].uIds.push(vid);
    }

    var count = this.queries[this.currentQueryIndex].uIds.length;
    $('.query-link[data-index="'+this.currentQueryIndex+'"]').find('.save-count').text(count);

    this.saveVideoData(vid);
    this.saveUserData();
  };

  return YTApp;

})();

$(function() {
  var app = new YTApp({});
});
