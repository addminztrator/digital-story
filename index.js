/*
	Author:	A. Saad Imran
	Simple blogging application
	August 17, 2020
*/

const express = require('express')
const nunjucks  = require('nunjucks');
const path = require('path')
const PORT = process.env.PORT || 5000

const { v4: uuidv4 } = require('uuid');
const uuid = require('uuid');

var cookieParser = require('cookie-parser')

var crypto = require("crypto")

const { Pool } = require('pg');

const Logger = require('logdna');
const options = {
    env: 'env'
    , app: 'digital-story'
    , hostname: 'digital-story'
    , index_meta: true
};

var _log = console.log;
var _error = console.error;

var logger = Logger.setupDefaultLogger('c43a327f0bc60da87e86d341e7a11e3e', options);


var log = function() {
    logger.info([...arguments].join(' '));
    _log.apply(console, arguments);
};

var error = function() {
    logger.error([...arguments].join(' '));
    _error.apply(console, arguments);
};

/*
This statement is needed for testing on a local system. 
Must be replaced with the statement below before deployment.
const pool = new Pool({
  connectionString: 'postgresql://postgres: @localhost:5432/postgres',
  ssl: process.env.DATABASE_URL ? true : false
});
*/

/*
Connects to database on deployed app. 
A local database is used for testing so this statement needs to be removed
during local testing.
*/

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

var app = express()

app.use(cookieParser());

app.use(express.json())
app.use(express.urlencoded({
  extended: true
}))

app.use("/assets", express.static('assets'))
app.use("/images", express.static('images'))

var salt = "Quality assurance"

var env = nunjucks.configure(['views/'], { // set folders with templates
    autoescape: true, 
    express: app
});
app.get('/', async (req, res) => {
	log('A user visited main page');
	var loggedIn = false
	var posts = null
	try {
		const client = await pool.connect();
		posts = await client.query(`SELECT * FROM posts ORDER BY created DESC`);
		client.release();
	} catch (err) {
		res.send("Error " + err);
		error('A critical database error occured while grabbing posts for the main page');
	}
	if (req.cookies.user){
		var cookie = req.cookies.user.split(",")
		var username = cookie[0]
		var hash = cookie[1]
		if (hash == sha512(username)){
			loggedIn = true
			log('User was logged in while visiting the main page');
			if (posts){
				res.render('index.html', {signedIn: loggedIn, username: username, id: username, posts: posts.rows});
			}
			else{
				res.render('index.html', {signedIn: loggedIn, username: username, id: username});
			}
			
		}
	}
	if (!loggedIn){
		log('User was NOT logged in while visiting the main page');
		if (posts){
			res.render('index.html', {posts: posts.rows}); 
		}
		else{
			res.render('index.html'); 
		} 
	}
})

app.get('/logout', function (req, res){
	log('User logged out');
	res.clearCookie('user');
	res.redirect('/');
})

app.get('/delete/:id', async function (req, res){
	if (req.cookies.user){
		log('User attempting to delete post');
		var cookie = req.cookies.user.split(",")
		var username = cookie[0]
		var hash = cookie[1]
		if (hash == sha512(username)){
			try {
			  const client = await pool.connect();
			  const result = await client.query(`SELECT * FROM posts where id='${req.params.id}'`);
			  if (result.rows[0].username == username){
				  await client.query(`Delete FROM posts where id='${req.params.id}'`);
				  log('User successfully deleted post');
				  res.redirect("/");
			  }
			} catch(err){
				res.send("Error " + err);
				error('A critical database error occured while user was attempting to delete post');
			}
		}
	}
	error('User not authorized to delete post');
})

app.get('/posts/:id', async (req, res) => {
	var del = false;
	try {
      const client = await pool.connect();
	  const result = await client.query(`SELECT * FROM posts where id='${req.params.id}'`);
	  if (req.cookies.user){
		var cookie = req.cookies.user.split(",")
		var username = cookie[0]
		var hash = cookie[1]
		if (hash == sha512(username)){
			if (result.rows[0].username == username){
				del = true;
				log('User viewed their own post while logged in');
			}
			else log('User viewed a post');
		}
	  }
	  res.render('post_permalink.html', {title: result.rows[0].title, username: result.rows[0].username, content: result.rows[0].content, created: result.rows[0].created, id: result.rows[0].id, del: del})
      client.release();
    } catch (err) {
      error('A critical database error occured while user was attempting to view post');
      res.send("Error " + err);
    }
});

app.get('/post', function(req, res){
	var loggedIn = false
	log('User viewed post creation page');
	if (req.cookies.user){
		var cookie = req.cookies.user.split(",")
		var username = cookie[0]
		var hash = cookie[1]
		if (hash == sha512(username)){
			loggedIn = true
			if (req.query.error){
				res.render('post.html', {title: 'Post', error: 'Title and content cannot be empty'})
			}
			else {
				res.render('post.html', {title: 'Post'})
			}
		}
	}
	if (!loggedIn){
		log('User viewed post creation page without logging in');
		res.redirect('/'); 
	}
})

app.post('/post', async (req, res) => {
	var loggedIn = false
	var id = uuidv4();
	var title = (req.body.title);
	var preview = (req.body.preview);
	var content = (req.body.content);
	if (!title || !content){
		res.redirect("/post?error=empty");
	}
	else{
		if (req.cookies.user){
			var cookie = req.cookies.user.split(",")
			var username = cookie[0]
			var hash = cookie[1]
			if (hash == sha512(username)){
				loggedIn = true
				try {
				  const client = await pool.connect();
				  const result = await client.query(`insert into posts values('${id}', '${username}', '${title}', '${preview}', '${content}')`);
				  client.release();
				  log('User created post');
				  res.redirect('/posts/'+id);
				} catch (err) {
				  error('A critical database error occured while user was attempting to create a post');
				  res.send("Error " + err);
				}
			}
		}
	}
	if (!loggedIn){
		log('User tried to create a post without logging in');
		res.redirect('/');
	}
})

app.get('/login', function (req, res) {
	if (req.query.error == "invalid"){
		log('User viewed login page after logging in with improper credentials');
		res.render('login.html', {title: 'Login', error: 'Invalid username or password'}); 
	}
	else {
		log('User viewed login page');
		res.render('login.html', {title: 'Login'}); 
	}
})

app.post('/login', async (req, res) => {
	var username = req.body.username;
	var pw = req.body.password;
	try {
      const client = await pool.connect();
	  const result = await client.query(`SELECT username,password FROM users where username='${username}'`);
	  if (result.rows[0].username == username && result.rows[0].password == sha512(pw)){
		  var uhash = sha512(username);
		  res.cookie('user', `${username},${uhash}`);
		  log('User logged in');
		  res.redirect("/"); 
	  }
	  else {
		  log('User tried to login with improper credentials');
		  res.redirect("/login?error=invalid"); 
	  }
	  
      client.release();
    } catch (err) {
      error('A critical database error occured while user was attempting to login');
      res.send("Error " + err);
    }
  } 
)

app.get('/register', function (req, res) {
	log('User visited the register page');
	if (req.query.error == "username_exists"){
		res.render('register.html', {title: 'Register', error: 'Username exists'}); 
	}
	else {
		res.render('register.html', {title: 'Register'}); 
	}
})

app.post('/register', async (req, res) => {
	var id = uuidv4();
	var username = req.body.username;
	var pw = req.body.password;
	try {
      const client = await pool.connect();
	  const result = await client.query(`SELECT * FROM users where username='${username}'`);
	  //console.log(result);
	  if (result.rowCount == 0){
		  var pwhash = sha512(pw);
		  var uhash = sha512(username);
		  await client.query(`insert into users values('${id}', '${username}', '${pwhash}')`);
		  res.cookie('user', `${username},${uhash}`);
		  log(`${username} registered`);
		  res.redirect("/"); 
	  }
	  else {
		  log('User tried to register with username which already exists');
		  res.redirect("/register?error=username_exists"); 
	  }
	  
      client.release();
    } catch (err) {
      error('A critical database error occured while user was attempting to create an account');
      res.send("Error " + err);
    }
  } 
)

app.all('*', function(req, res) {
  res.redirect("/");
});

/**
 * hash password with sha512.
 * @function
 * @param {string} password - List of required fields.
 * @param {string} salt - Data to be validated.
 */
var sha512 = function(password){
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return value;
};

app.listen(PORT, function(){ log("Listening on port " + PORT); })
