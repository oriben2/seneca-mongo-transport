var Seneca = require('seneca');
var seneca = Seneca();

seneca
  .use(require('../../lib/index'))
  .listen({type: 'mongo', pin: 'role:color,cmd:*'})
  .add('role:color,cmd:convert', function(args, done) {
    if (args.name === 'black') {
      return done(null, { rgb: '#000', white : 0 });
    } else {
      return done(new Error('unknown color'));
    }
  });

setInterval(function() {
  console.log('ping at ' + (new Date()).toString());
}, 10 * 1000);