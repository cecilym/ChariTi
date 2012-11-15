var HTTP = require("http");
var UTIL = require("utilities");

var init = function() {
	Ti.API.debug("FACEBOOK.init");
	
	var db = Ti.Database.open("Charitti");
	
	db.execute("CREATE TABLE IF NOT EXISTS facebook (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, description TEXT, link TEXT);");
	
	db.close();
};

exports.isStale = function(_url) {
	var db = Ti.Database.open("Charitti");
	var freshTime = new Date().getTime() - 3600000;
	var lastUpdate = 0;
	
	var data = db.execute("SELECT time FROM updates WHERE url = " + UTIL.escapeString(_url) + " ORDER BY time DESC LIMIT 1;");
	
	while(data.isValidRow()) {
		lastUpdate = data.fieldByName("time");

		data.next();
	}
	
	data.close();
	db.close();
	
	if(lastUpdate > freshTime) {
		return false;
	} else {
		return true;
	}
};

exports.fetch = function(_params) {
	Ti.API.debug("FACEBOOK.fetch");
	Ti.API.info(JSON.stringify(_params));
	
	if(exports.isStale(_params.url)) {
		HTTP.request({
			timeout: 10000,
			type: "GET",
			format: "TEXT",
			url: _params.url,
			passthrough: _params.callback,
			success: exports.handleData
		});
	} else {
		_params.callback();
	}
};

exports.handleData = function(_data, _url, _passthrough) {
	Ti.API.debug("FACEBOOK.handleData");
	
	var xml		= Ti.XML.parseString(UTIL.xmlNormalize(_data));
	var nodes	= xml.documentElement.getElementsByTagName("item");
	var db		= Ti.Database.open("Charitti");
	
	if(nodes.length > 1) {
		db.execute("DELETE FROM facebook;");
	}
	
	db.execute("BEGIN TRANSACTION;");
	
	for(var i = 0, x = nodes.length; i < x; i++) {
		var title		= UTIL.cleanEscapeString(nodes.item(i).getElementsByTagName("title").item(0).text);
		var date		= UTIL.cleanEscapeString(new Date(UTIL.cleanString(nodes.item(i).getElementsByTagName("pubDate").item(0).text)).getTime());
		var description	= UTIL.cleanEscapeString(nodes.item(i).getElementsByTagName("description").item(0).text);
		var link		= UTIL.cleanEscapeString(nodes.item(i).getElementsByTagName("link").item(0).text);
		
		db.execute("INSERT INTO facebook (id, title, date, description, link) VALUES (NULL, " + title + ", " + date + ", " + description + ", " + link + ");");
	}
	
	db.execute("INSERT OR REPLACE INTO updates (url, time) VALUES(" + UTIL.escapeString(_url) + ", " + new Date().getTime() + ");");
	db.execute("END TRANSACTION;");
	db.close();
	
	if(_passthrough) {
		_passthrough();
	}
};

exports.getAllArticles = function() {
	Ti.API.debug("FACEBOOK.getAllArticles");
	
	var db		= Ti.Database.open("Charitti");
	var data	= db.execute("SELECT * FROM facebook ORDER BY date DESC;");
	var temp	= [];

	while(data.isValidRow()) {
		temp.push({
			id: data.fieldByName("id"),
			title: data.fieldByName("title"),
			date: data.fieldByName("date"),
			description: data.fieldByName("description"),
			link: data.fieldByName("link")
		});

		data.next();
	}

	data.close();
	db.close();

	return temp;
};

exports.getArticle = function(_id) {
	Ti.API.debug("FACEBOOK.getArticle");
	
	var db		= Ti.Database.open("Charitti");
	var data	= db.execute("SELECT * FROM facebook WHERE id = " + UTIL.cleanEscapeString(_id) + ";");
	var temp;

	while(data.isValidRow()) {
		temp = {
			id: data.fieldByName("id"),
			title: data.fieldByName("title"),
			date: data.fieldByName("date"),
			description: data.fieldByName("description"),
			link: data.fieldByName("link")
		};

		data.next();
	}

	data.close();
	db.close();

	return temp;
};

init();