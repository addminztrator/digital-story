var expect  = require('chai').expect;
var request = require('request');

// for local tests
//var host = 'http://localhost:5000';

var host = 'http://digital-story.herokuapp.com';

// Try requesting the main page and make sure server is running
it('App running', function(done) {
    request(host , function(error, response, body) {
        expect(body).to.not.equal(null);
		expect(body).to.not.equal(undefined);
        done();
    });
});

describe('Random url addresses redirect to main page', function(){
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
		it('post ' + host +'/something', function(done) {
			request.post({url:host+'/something', form: {key:'value'}} , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
		
		it('post ' + host +'/somethingelse/asds asd jnj454369?/ewrkmdf', function(done) {
			request.post({url:host+'/somethingelse/asds asd jnj454369?/ewrkmdf', form: {key:'value'}} , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
	});
});

