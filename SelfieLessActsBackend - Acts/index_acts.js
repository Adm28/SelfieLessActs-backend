const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator/check');
const request = require("request");

// Create connection
const db = mysql.createConnection({
    host     : '172.17.0.2',
    user     : 'root',
    password : 'secretsauce',
    database : 'sfaacts',
    charset  : 'utf8'
});
global.requests = 0;
global.status = false;
// Connect
db.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    var sql = "CREATE TABLE IF NOT EXISTS category (categoryName VARCHAR(255) NOT NULL, PRIMARY KEY (`categoryName`))";
    db.query(sql, function (err, result) {
      if (err) throw err;
      console.log("Category Table created");
    });
    var sql1 = "CREATE TABLE IF NOT EXISTS acts (actId VARCHAR(255) NOT NULL, username VARCHAR(255) NOT NULL, timestamp VARCHAR(255) NOT NULL, caption VARCHAR(255) NOT NULL, upvotes INT(11) NOT NULL DEFAULT '0',  categoryName VARCHAR(255) NOT NULL, imgB64 longtext NOT NULL,PRIMARY KEY (`actId`))";
    db.query(sql1, function (err, result) {
      if (err) throw err;
      console.log("Acts Table created");
    });
    var sql2 = "ALTER TABLE `acts` ADD CONSTRAINT `categoryfk` FOREIGN KEY (`categoryName`) REFERENCES `category` (`categoryName`) ON DELETE CASCADE"
    db.query(sql1, function (err, result) {
      if (err) throw err;
      console.log("Foreign Key categoryfk created");
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


//   var requests = 0;


  app.delete("/api/v1/_count", function(req, res) {
      requests = 0;
      if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
    }
    else{
      res.status(200).send("{ }");
      console.log("delete _count called : " + arr);
    }
  
  });
  
  app.get("/api/v1/_count", function(req, res) {
    if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
    }
    else{
      var arr = [ ];
      arr.push(requests);
      res.status(200).send(arr);
      console.log("get _count called : " + arr);
    }
  });
    
//   app.use(function(req, res, next) {
//       requests++;
//       next();
//   });

// List all categories Part3
// todo complex query if schema changes
// fix this!!..
app.get('/api/v1/categories', (req, res) => {
    requests++;
    if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
    }
    else{
  let sql = `SELECT DISTINCT(categoryName) as categoryName, count(categoryName) AS numberofacts 
  FROM acts 
  GROUP BY categoryName `;
  db.query(sql, (err, result) => {
      if(err) throw err;
      var ans = {}
      if(result.length==0){
          res.status(204).send(result)  // check if the list returned is empty 
      }
      else{
      for(var i=0;i<result.length;i++){
          ans[result[i].categoryName]=result[i].numberofacts; // as per requirements modify the json result
      }
      console.log(ans);
      res.status(200).send(ans)   
  }
  });
}
});

// Add a category Part4

app.post('/api/v1/categories', [
  // categoryName must not be empty
], (req, res) => {
    requests++;
    if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
    }
    else{
  var categoryName = req.body[0]; //get username from post
  console.log("CategoryName : "+categoryName)
  if (req.body.length==0) {
      res.status(400).send();
      console.log("category insert unsuccessful bad input");
  }
  else{
  let sql = `INSERT INTO category (categoryName) VALUES ('${categoryName}')`;
  let query = db.query(sql, (err, results) => {
      if(err){
          if(err.code == 'ER_DUP_ENTRY'){
              res.status(400).send();
              console.log("user insert unsuccessful duplicate entry not allowed");
          }
      }
      else{
          res.status(201).send('{ }');
          console.log("category insert successful");
      }
  });
}
    }
});

// Delete Category Part 5

app.delete('/api/v1/categories/:id/', (req, res) => {
    requests++;
    if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
    }
    else{
  let sql = `DELETE FROM category WHERE categoryName = ?`;
  let query = db.query(sql,req.params.id,(err, result) => {
      if(err) throw err;
      if(result.affectedRows==0){
          res.status(400).send(); //handles if the record is not present
      }
      else
      res.status(200).send('{ }');
  });
}
});

// List Acts in a given Category Part6
 //todo error handling !!

app.get('/api/v1/categories/:id/acts', (req, res) => {
  // todo part 8
  requests++;
  if(status){
    res.status(500).send();
    console.log("Server Disabled or Not Functioning properly")
  }
  else{
  var post = req.params.id;
  var start = req.query['start'];
  var end = req.query['end']
  if(start && end){
      let sql = `SELECT * FROM acts where categoryName = "${post}"`;
      db.query(sql, (err, result) => {
          if(err) throw err;
          if(result.length==0 || start<0 || end>result.length-1 || end<start || end-start>=result.length){
              res.status(204).send()  // check if the list returned is empty 
          }
          else{
              // todo
              var x = [];
              x.push(end-start+1);
              if(end-start+1>100){
                  res.status(413).send()
              }
              else{
              res.status(200).send(x) //else successful
              }
          }
      });
  }
  else{
  let sql = `SELECT actId,username,timestamp,caption,upvotes,imgB64 FROM acts where categoryName = "${post}"`;
  db.query(sql, (err, result) => {
      if(err) throw err;
      if(result.length==0){
          res.status(204).send()  // check if the list returned is empty 
      }
      else if(result.length>100){
          res.status(413).send() // check if greater than 100
      }
      else{
          res.status(200).send(result) //else successful
      }
  
  });
  }
  }

});


// List Number of Acts for a given category Part 7
  // todo confirm key.
app.get('/api/v1/categories/:id/acts/size', (req, res) => {
  // complete sql query join needed
  requests++;
  if(status){
    res.status(500).send();
    console.log("Server Disabled or Not Functioning properly")
  }
  else{
  var post = req.params.id;
  let sql = `SELECT count(*) as ans FROM acts where categoryName = "${post}"`;
  db.query(sql, (err, result) => {
      if(err) throw err;
      if(result.length==0){
          res.status(400).send()  // check if the list returned is empty 
      }
      else{
          // todo
          var x = [];
          x.push(result[0].ans);
          res.status(200).send(x) //else successful
      }
  });
}
});

// Return number of acts for a given category in a given range (inclusive) Part 8
  //todo
  //


// Upvote an act Part 9
// todo check actId -- done


app.post('/api/v1/acts/upvote', [
  // categoryName must not be empty
  //check('actId').not().isEmpty(),
], (req, res) => {
    requests++;
 if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
  }
  else{
  var actId = req.body[0]; //get upvotes from post
  //todo error handling
  //const errors = validationResult(req);
  if (req.body.length!=1) { // handling only one actID
      res.status(400).send();
      console.log("user insert unsuccessful bad input");
  }
  else{
  let post = {actId:actId}; 
  let sql = `UPDATE acts SET upvotes = upvotes + 1 WHERE actID = ${actId}`;
  let query = db.query(sql, (err, result) => {
      if(err){
          if(err.code == 'ER_DUP_ENTRY'){
              res.status(400).send();
              console.log("user insert unsuccessful duplicate entry not allowed");
          }
      }
      else if(result.affectedRows==0){
          res.status(400).send(); //handles if the record is not present
      }
      else{
          res.status(201).send('{ }');
          console.log(result);
          console.log("user insert successful");
      }
  });
  }
  }
});



// Delete an act Part 10 --done

app.delete('/api/v1/acts/:id/', (req, res) => {
    requests++;
    if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
    }
    else{
  let sql = `DELETE FROM acts WHERE actId = ?`;
  let query = db.query(sql,req.params.id,(err, result) => {
      if(err) throw err;
      if(result.affectedRows==0){
          res.status(400).send(); //handles if the record is not present
      }
      else
      res.status(200).send('{ }');
  });
}
});


// Upload an act Part 11 --done

// todo check for username list --done
// todo check for timestamp format --done
// todo check for category -- done
// todo no upvotes field must be sent --done

app.post('/api/v1/acts', [
  // fields must not be empty
  check('actId').not().isEmpty(),
  check('username').not().isEmpty(),
//  check('timestamp').not().isEmpty(),
//   check('timestamp').matches(/^([1-9]|([012][0-9])|(3[01]))\-([0]{0,1}[1-9]|1[012])\-\d\d\d\d:([0-5]\d)-([0-5]\d)-([0-1]?[0-9]|2?[0-3])$/),
  // todo check timestamp -- done
//  check('caption').not().isEmpty(),
//  check('categoryName').not().isEmpty(),
//  check('imgB64').not().isEmpty(),
//   check('imgB64').isBase64()

], (req, res) => {
    requests++;
 if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
  }
  else{
  var actId = req.body.actId; //get actId from post
  var username = req.body.username; //get username from post
  var timestamp = req.body.timestamp; //get timestamp from post
  var caption = req.body.caption; //get caption from post
  var categoryName = req.body.categoryName; //get categoryName from post
  var imgB64 = req.body.imgB64; //get imgB64 from post
  //todo error handling -- done
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      res.status(400).send();
      console.log("act insert unsuccessful bad input");
  }
  else{
//  axios.get('http://34.227.26.139:8080/api/v1/users')
//     .then(response => {
//       console.log(response);
//     })
//     .catch(error => {
//       console.log(error);
//     });

  const url = "http://18.208.167.134/api/v1/users"
          request.get(url, (error, response, body) => {
            //var usersArr = 0;
            console.log("body from request to users api : " + body);
            var x = false;
            if(body){
            var usersArr = JSON.parse(body.toString());
            console.log("users present : " + usersArr);
            for(var i=0;i<usersArr.length;i++){
              if(usersArr[i] == username){
                  x = true;
                  let post = {actId:actId,username:username,timestamp:timestamp,caption:caption,categoryName:categoryName,imgB64:imgB64}; 
                    let sql = `INSERT INTO acts SET ?`;
                    let query = db.query(sql, post, (err, results) => {
                        if(err){
                            if(err.code == 'ER_DUP_ENTRY' || err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW_" || err.code === "ER_NO_REFERENCED_ROW"){
                                res.status(400).send();
                                console.log("act insert unsuccessful duplicate entry not allowed");
                            }
                            else {
                                throw err;
                            }
                        }
                        else{
                            //   const url = "http://localhost:8080/api/v1/users"
                            //   request.get(url, (error, response, body) => {
                            //     var usersArr = 0;
                            //     if(body.toString() != undefined)
                            //     usersArr = JSON.parse(body.toString());
                                
                            //     var x = false;
                            //     for(var i=0;i<usersArr.length;i++){
                            //        console.log(usersArr[i]);
                            //       if(usersArr[i] == username){
                            //           x = true;
                                    res.status(201).send('{ }');
                                    console.log("act insert successful");
                            //     }
                            //  }
                            //   if(x == false){
                                    // res.status(400).send();
                                    // console.log("act insert unsuccessful user not present");
                            //     }
                            //   });
                            
                        }
                    });
              }
            }
            if(x==false){
        
                res.status(400).send();
                console.log("queried user : " + username)
                console.log("act insert unsuccessful user not found");
        }
        }
        else if(!body){
            res.status(400).send();
            console.log("queried user : " + username)
            console.log("act insert unsuccessful user not found");
        }
        
            
        });
    }
}
});


app.get('/api/v1/acts/count', (req, res) => {
    requests++;
    if(status){
        res.status(500).send();
        console.log("Server Disabled or Not Functioning properly")
    }
    else{
    // complete sql query join needed
    var post = req.params.id;
    let sql = `SELECT count(*) as ans FROM acts`;
    db.query(sql, (err, result) => {
        if(err) throw err;
        else{
            var x = [];
            x.push(result[0].ans);
            
            res.status(200).send(x) //else successful
            console.log("Get count of all acts called successfully")
            
        }
    });
}
});

app.get('/api/v1/_health', (req, res) => {
    requests++;
    if(status){
        res.status(500).send(); //if disabled
    }
    res.status(200).send(); //else successful

});

app.post('/api/v1/_crash',(req,res) => {
    status = true;
    res.status(200).send();
})

app.all('*', function(req, res) {
    throw new Error("Bad request")
})

app.use(function(e, req, res, next) {
    if (e.message === "Bad request") {
        requests++;
        res.status(405).send();
    }
});

app.listen('8000', () => {
    console.log('Server started on port 8000');
});


