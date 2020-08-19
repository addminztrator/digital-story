var expect  = require('chai').expect;
var request = require('request');
var crypto = require("crypto");

const j = request.jar()
const request_cookie = request.defaults({jar: j})

const { v4: uuidv4 } = require('uuid');
const uuid = require('uuid');

var user = "test_"+uuidv4();

// for local tests
//var host = 'http://localhost:5000';

var host = 'http://digital-story.herokuapp.com';

// Try requesting the main page and make sure server is running
it('Check if app is running', function(done) {
    request(host , function(error, response, body) {
        expect(body).to.not.equal(null);
		expect(body).to.not.equal(undefined);
        done();
    });
});

describe('Check if random url addresses redirect to main page', function(){
	describe('Perform get requests on random URLs', function(){
		it('Get ' + host +'/something', function(done) {
			request(host + '/something' , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
		
		it('Get ' + host + '/somethingelse/asds asd jnj454369?/ewrkmdf', function(done) {
			request(host + '/somethingelse/asds asd jnj454369?/ewrkmdf' , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
	});
	
	describe('Perform post requests on random URLs', function()
	{
		it('Post ' + host +'/something with form {key: "value"}', function(done) {
			request.post({url:host+'/something', form: {key:'value'}} , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
		
		it('Post ' + host +'/somethingelse/asds asd jnj454369?/ewrkmdf with form {key: "value"}', function(done) {
			request.post({url:host+'/somethingelse/asds asd jnj454369?/ewrkmdf', form: {key:'value'}} , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
	});
});

describe('User functionality', function(){
	var uhash = null;
	var cookie = null;
	describe('Register', function(){
		it('Create user', function(done){
			request.post({url:host+'/register', form: {username: user, password: 'password'}}, function(error, response, body) {
				uhash = sha512(user);
				cookie = `${user}%2C${uhash}`;
				expect('Location', '/');
				expect(response.headers['set-cookie'][0]).to.equal(`user=${cookie}; Path=/`);
				done();
			});
		});
		it("App shouldn't allow the same user to be created twice", function(done){
			request.post({url:host+'/register', form: {username: user, password: 'password'}}, function(error, response, body) {
				expect('Location', host+'/register?error=username_exists');
				done();
			});
		});
	});
	
	describe('Login', function(){
		it('Login with proper credentials', function(done){
			request.post({url:host+'/login', form: {username: user, password: 'password'}}, function(error, response, body) {
				expect(response.headers['set-cookie'][0]).to.equal(`user=${cookie}; Path=/`);
				done();
			});
		});
		
		it("App shouldn't allow login with invalid password", function(done){
			request.post({url:host+'/login', form: {username: user, password: 'notpassword'}}, function(error, response, body) {
				expect('Location', '/login?error=invalid');
				done();
			});
		});
		
		it("App shouldn't allow login for user which doesn't exist", function(done){
			request.post({url:host+'/login', form: {username: uuidv4(), password: 'notpassword'}}, function(error, response, body) {
				expect('Location', '/login?error=invalid');
				done();
			});
		});
	});
	describe('Post', function(){
		it("App shouldn't allow posts without titles to be created", function(done){
			request.cookie(`user=${cookie}`);
			request.post({url:host+'/post', form: {content: 'content', header:{'Cookie': {user: cookie}}}}, function(error, response, body){
				expect('Location', '/post?error=empty');
				done();
			});
		});
		it("App shouldn't allow posts without content to be created", function(done){
			request.cookie(`user=${cookie}`);
			request.post({url:host+'/post', form: {title: 'title', header:{'Cookie': {user: cookie}}}}, function(error, response, body){
				expect('Location', '/post?error=empty');
				done();
			});
		});
		it("App shouldn't allow posts without content and titles to be created", function(done){
			request.cookie(`user=${cookie}`);
			request.post({url:host+'/post', form: {header:{'Cookie': {user: cookie}}}}, function(error, response, body){
				expect('Location', '/post?error=empty');
				done();
			});
		});
	});
});

console.log("Remember to point tests towards deployed code instead of localhost before commit.");
console.log("Same for the database.");

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
