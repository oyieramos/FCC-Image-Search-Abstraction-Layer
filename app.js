'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const request = require('request');

const port = process.env.PORT || 3000;
const app = express();

//remove require('dotenv') when importing to glitch
require('dotenv').config({
	silent: true //suppress warning if .env file is missing
});

app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

mongoose.connect(process.env.DB_URI || 'mongodb://localhost/searchTerms', {
	useMongoClient: true
});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
	console.log('We are connected to the database!');

	const collection = db.collection('searchterms');

	app.get('/', function(req, res, next){
		res.send('please use /api/imagesearch/<your query here> or /api/latest/imagesearch/');
	});

	app.get('/api/imagesearch/:query(*)', function(req, res, next){
		var searchVal = req.params.query;
		var offset = req.query.offset;

		var d = new Date();
		var date = d.toJSON();

		var json = {
			"term": searchVal,
			"when": date
		};

		collection.insert(json, function(err, result){
			if (err){
				console.log(err);
				res.send(err);
			} else {
				console.log('Inserted %d documents into the searchterms collection. The documents inserted with "_id" are:', result.length, result);
			}
		});

		var url = "";

		if(offset){
			url = 'https://www.googleapis.com/customsearch/v1?key=' + process.env.CSE_API_KEY + '&cx=' + process.env.CSE_ID + '&searchType=image&q=' + searchVal + '&start=' + offset;
			// console.log('There is an offset');
		} else {
			url = 'https://www.googleapis.com/customsearch/v1?key=' + process.env.CSE_API_KEY + '&cx=' + process.env.CSE_ID + '&searchType=image&q=' + searchVal;
			// console.log('There is no offset');
		}

		var requestObject = {
			uri: url,
			method: 'GET',
			timeout: 10000
		};

		request(requestObject, function(error, response, body){
			if(error){
				// console.log(error);
				// res.send(error);
			}

			var array = [];
			var result = JSON.parse(body);
			var imageList = result.items;

			for(var i = 0; i < imageList.length; i++){

				var image = {
					"url": 			imageList[i].link,
					"snippet": 		imageList[i].snippet,
					"thumbnail": 	imageList[i].image.thumbnailLink,
					"context": 		imageList[i].displayLink
				}

				array.push(image);
			}

			res.send(array);
		});

	});

	app.get('/api/latest/imagesearch/', function(req, res, next){
		var array = [];

		var cursor = collection.find().limit(10).sort({
			_id: -1
		});

		cursor.forEach(function(doc){
			//loop through the collection and construct a result that meet the user requirement
			
				var lastQuery = {
					"term": doc.term,
					"when": doc.when
				};

				array.push(lastQuery);

				if (array.length === 10) {
					res.send(array);
				}

		});	

		console.log('get call "/api/latest/imagesearch/" loaded');

	});

	app.listen(port, function(){
		console.log('Connected at port '+port);
	});

});




	