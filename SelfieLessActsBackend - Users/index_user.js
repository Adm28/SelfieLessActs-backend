const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator/check');

// Create connection
const db = mysql.createConnection({
    host     : '172.17.0.2',
    user     : 'root',
    password : 'secretsauce',
    database : 'sfaacts',
    charset  : 'utf8'
});

global.requests = 0;
// Connect
db.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    var sql = "CREATE TABLE IF NOT EXISTS users (username VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, PRIMARY KEY (`username`))";
    db.query(sql, function (err, result) {
      if (err) throw err;
      console.log("Users Table created");
    });
  });

const app = express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


// var requests = 0;

app.delete("/api/v1/_count", function(req, res) {
    requests = 0;
    res.status(200).send("{ }");
    console.log("delete _count called : " + arr);

});


app.get("/api/v1/_count", function(req, res) {
    var arr = [ ];
    arr.push(requests);
    res.status(200).send(arr);
    console.log("get _count called : " + arr);
});

  
// app.use(function(req, res, next) {
//     requests++;
//     next();
// });

app.post('/api/v1/users', [
    // username must not be empty
    check('username').not().isEmpty(),
    // password must not be empty
    //check('password').matches(/^[a-fA-F0-9]{32}$/),// to test for SHA1 encoding
    check('password').not().isEmpty()
  ], (req, res) => {
    requests++;
    var username = req.body.username; //get username from post
    var password = req.body.password; //get password from post
    //todo error handling
    console.log(username)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).send();
        console.log("user insert unsuccessful bad input");
    }
    else{
    let post = {username:username, password:password}; 
    let sql = `INSERT INTO users SET ?`;
    let query = db.query(sql, post, (err, results) => {
        if(err){
            if(err.code == 'ER_DUP_ENTRY'){
                res.status(400).send();
                console.log("user insert unsuccessful duplicate entry not allowed");
            }
        }
        else{
            res.status(201).send('{ }');
            console.log("user inserted successfully");
        }
    });
}
});

// users Delete Part2

app.delete('/api/v1/users/:id', (req, res) => {
    requests++;
    let sql = `DELETE FROM users WHERE username = ?`;
    let query = db.query(sql,req.params.id,(err, result) => {
        if(err) throw err;
        if(result.affectedRows==0){
            res.status(400).send();//handles if the record is not present
            console.log("Error deleting user");
        }
        else
        res.status(200).send('{ }');
        console.log("Deleted user");
    });
});

// get List of users

app.get('/api/v1/users', (req, res) => {
    requests++;
    let sql = `SELECT username FROM users`;
    db.query(sql, (err, result) => {
        if(err) throw err;
        var ans = []
        if(result.length==0){
            res.status(204).send()  // check if the list returned is empty 
            console.log("Queried users List Empty");  
        }
        else{
        for(var i=0;i<result.length;i++){
            ans.push(result[i].username); // as per requirements modify the json result
        }
        res.status(200).send(ans) 
        console.log("Queried for get users List");  
    }
    });
});

app.all('*', function(req, res) {
    throw new Error("Bad request")
})

app.use(function(e, req, res, next) {
    if (e.message === "Bad request") {
        requests++;
        res.status(405).send();
    }
});

app.listen('8080', () => {
    console.log('Server started on port 8080');
});


