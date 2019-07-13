// > node server.js 8888
var port = 2222;
if (process.argv.length > 2) port = parseInt(process.argv[2]);

const express = require('express');
const fs = require('fs');
const cfg = require("./config.json");
const app = express();

fs.mkdir(cfg.videoDataSaveDirectory, { recursive: true }, function(err){
  if (err) throw err;
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static('./')); //Tells the app to serve static files from ./

app.post('/save/udata', function (req, res) {
  var dataFile = './'+req.body.filename;
  var postedData = JSON.parse(req.body.data);
  fs.writeFile(dataFile, JSON.stringify(postedData), 'utf8', function(err, data){
    console.log('Wrote udata to file');
  });
  res.send({
    status: 1,
    message: "Success"
  });
});

app.post('/save/vdata', function (req, res) {
  var dataFile = cfg.videoDataSaveDirectory + req.body.id + ".json";
  var postedData = JSON.parse(req.body.data);
  fs.writeFile(dataFile, JSON.stringify(postedData), 'utf8', function(err, data){
    console.log('Wrote vdata to file');
  });
  res.send({
    status: 1,
    message: "Success"
  });
});

app.listen(port, () => console.log('Listening on port '+port));
