/*
	Author:	A. Saad Imran
	Simple blogging application
	Final version: August 19, 2020
*/

// Express is used for HTTP and URL routing
const express = require('express');

// Cookie parser middleware for express is needed to deal with cookies
var cookieParser = require('cookie-parser');

// Nunjucks is used for HTML string parsing
const nunjucks  = require('nunjucks');

const path = require('path');
const PORT = process.env.PORT || 5000;

// Library to generate unique identifiers 
const { v4: uuidv4 } = require('uuid');
const uuid = require('uuid');

// We need the crypto library for sha512 encryption of passwords in the database
var crypto = require("crypto")

// psql driver 
const { Pool } = require('pg');

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

// Logdna is used for basic logging
const Logger = require('logdna');
const options = {
    env: 'env'
    , app: 'digital-story'
    , hostname: 'digital-story'
    , index_meta: true
};

var _log = console.log;
var _error = console.error;

// Setup logger with API key. Not hiding it here because everything is public for now
var logger = Logger.setupDefaultLogger('c43a327f0bc60da87e86d341e7a11e3e', options);

// Basic logging functions
var log = function() {
    logger.info([...arguments].join(' '));
    _log.apply(console, arguments);
};

var error = function() {
    logger.error([...arguments].join(' '));
    _error.apply(console, arguments);
};

// Setup express application for routing and HTTP server
var app = express()

// Use cookie parser middleware to deal with cookies
app.use(cookieParser())

app.use(express.json())
app.use(express.urlencoded({
  extended: true
}))

// Setup static directories for scripts, stylesheets and other assets
app.use("/assets", express.static('assets'))
app.use("/images", express.static('images'))

// Setup nunjucks HTML templates
var env = nunjucks.configure(['views/'], { // set folders with templates
    autoescape: true, 
    express: app
});

// Respond to request for main page
app.get('/', async (req, res) => {
	// Log user visit
	log('A user visited main page');
	var loggedIn = false
	var posts = null
	try {
		// Grab all posts to display for the main page
		const client = await pool.connect();
		posts = await client.query(`SELECT * FROM posts ORDER BY created DESC`);
		client.release();
	} catch (err) {
		res.send("Error " + err);
		error('A critical database error occured while grabbing posts for the main page');
	}
	// Check cookies to see if user is signed in
	if (req.cookies.user){
		var cookie = req.cookies.user.split(",")
		var username = cookie[0]
		var hash = cookie[1]
		if (hash == sha512(username)){
			loggedIn = true
			// If credentials are valid, display logged in main page
			log('User was logged in while visiting the main page');
			if (posts){
				res.render('index.html', {signedIn: loggedIn, username: username, id: username, posts: posts.rows});
			}
			else{
				res.render('index.html', {signedIn: loggedIn, username: username, id: username});
			}
			
		}
	}
	// If cookie isn't found or user isn't logged in, then display regular front page
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

// Respond to request for post creation page
app.get('/post', function(req, res){
	var loggedIn = false
	// Log user visit
	log('User viewed post creation page');
	if (req.cookies.user){
		var cookie = req.cookies.user.split(",")
		var username = cookie[0]
		var hash = cookie[1]
		if (hash == sha512(username)){
			loggedIn = true
			// If user is signed in, display post creation interface
			if (req.query.error){
				res.render('post.html', {title: 'Post', error: 'Title and content cannot be empty'})
			}
			else {
				res.render('post.html', {title: 'Post'})
			}
		}
	}
	// If user isn't signed in, redirect to main page
	if (!loggedIn){
		log('User viewed post creation page without logging in');
		res.redirect('/'); 
	}
})

// Respond to post creation request
app.post('/post', async (req, res) => {
	var loggedIn = false
	// Create unique identifier for post
	var id = uuidv4();
	var title = (req.body.title);
	var preview = (req.body.preview);
	var content = (req.body.content);
	// Redirect to post creation page with error if  title or content is empty
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
				// Create post and redirect to post permalink if user is signed in
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
	// User can't create post without logging in, redirect to main page
	if (!loggedIn){
		log('User tried to create a post without logging in');
		res.redirect('/');
	}
})

// Respond to request to delete posts
app.get('/delete/:id', async function (req, res){
	if (req.cookies.user){
		// Log deletion attempt
		log('User attempting to delete post');
		var cookie = req.cookies.user.split(",")
		var username = cookie[0]
		var hash = cookie[1]
		if (hash == sha512(username)){
			try {
			  const client = await pool.connect();
			  const result = await client.query(`SELECT * FROM posts where id='${req.params.id}'`);
			  // Grab the post being deleted and check if user is the creator
			  if (result.rows[0].username == username){
				  await client.query(`Delete FROM posts where id='${req.params.id}'`);
				  // If user has permission to delete, proceed with deletion
				  log('User successfully deleted post');
				  res.redirect("/");
			  }
			} catch(err){
				res.send("Error " + err);
				error('A critical database error occured while user was attempting to delete post');
			}
		}
	}
	// If we get here, user wasn't authorized to delete post and is trying to tamper with data
	error('User not authorized to delete post');
})

// Respond to request for post permalinks
app.get('/posts/:id', async (req, res) => {
	// Variable which detects if deletion button will be displayed
	// Basically checks if the signed in user is the author of post
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
	  // Display post
	  res.render('post_permalink.html', {title: result.rows[0].title, username: result.rows[0].username, content: result.rows[0].content, created: result.rows[0].created, id: result.rows[0].id, del: del})
      client.release();
    } catch (err) {
      error('A critical database error occured while user was attempting to view post');
      res.send("Error " + err);
    }
});

// Respond to request for login page
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

// Respond to login request
app.post('/login', async (req, res) => {
	var username = req.body.username;
	var pw = req.body.password;
	try {
      const client = await pool.connect();
	  const result = await client.query(`SELECT username,password FROM users where username='${username}'`);
	  // Check credentials 
	  if (result.rows[0].username == username && result.rows[0].password == sha512(pw)){
		  var uhash = sha512(username);
		  // If credentials are valid, store cookie with username and hash and redirect to main page
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

// Respond to request to logout
app.get('/logout', function (req, res){
	log('User logged out');
	res.clearCookie('user');
	res.redirect('/');
})

// Respond to request for register page
app.get('/register', function (req, res) {
	log('User visited the register page');
	if (req.query.error == "username_exists"){
		res.render('register.html', {title: 'Register', error: 'Username exists'}); 
	}
	else {
		res.render('register.html', {title: 'Register'}); 
	}
})

// Respond to request to register
app.post('/register', async (req, res) => {
	var id = uuidv4();
	var username = req.body.username;
	var pw = req.body.password;
	try {
      const client = await pool.connect();
	  const result = await client.query(`SELECT * FROM users where username='${username}'`);
	  // Check if user is already created
	  if (result.rowCount == 0){
		  // If user isn't registered, create database entry and cookie
		  // Then redirect to main page
		  var pwhash = sha512(pw);
		  var uhash = sha512(username);
		  await client.query(`insert into users values('${id}', '${username}', '${pwhash}')`);
		  res.cookie('user', `${username},${uhash}`);
		  log(`${username} registered with ${id}`);
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

// Reroute all other HTTP requests to the main page
app.all('*', function(req, res) {
  res.redirect("/");
});

/**
 * hash password with sha512.
 * @function
 * @param {string} password - List of required fields.
 * @param {string} salt - Data to be validated.
 */
var sha512 = function(password, salt = "Quality assurance"){
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return value;
};

app.listen(PORT, function(){ log("Listening on port " + PORT); })
