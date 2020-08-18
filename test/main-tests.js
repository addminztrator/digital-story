var expect  = require('chai').expect;
var request = require('request');

// Try requesting the main page and make sure server is running
it('App running', function(done) {
    request('http://localhost:5000' , function(error, response, body) {
        expect(body).to.not.equal(null);
		expect(body).to.not.equal(undefined);
        done();
    });
});

describe('Random url addresses redirect to main page', function(){
	describe('Perform get requests on random URLs', function(){
		it('Get http://localhost:5000/something', function(done) {
			request('http://localhost:5000/something' , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
		
		it('Get http://localhost:5000/somethingelse/asds asd jnj454369?/ewrkmdf', function(done) {
			request('http://localhost:5000/somethingelse/asds asd jnj454369?/ewrkmdf' , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
	});
	
	describe('Perform post requests on random URLs', function()
	{
		it('post http://localhost:5000/something', function(done) {
			request.post({url:'http://localhost:5000/something', form: {key:'value'}} , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
		
		it('post http://localhost:5000/somethingelse/asds asd jnj454369?/ewrkmdf', function(done) {
			request.post({url:'http://localhost:5000/somethingelse/asds asd jnj454369?/ewrkmdf', form: {key:'value'}} , function(error, response, body) {
				expect('Location', '/');
				done();
			});
		});
	});
});

