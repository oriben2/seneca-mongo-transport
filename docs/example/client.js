var Seneca = require('seneca');
var seneca = Seneca();

seneca.use(require('../../lib/index'))
  .client({type: 'mongo', pin: 'role:color,cmd:*'})
  .act('role:color,cmd:convert,name:black', function(err, color) {
    if (err) {
      throw err;
    }
    console.log(JSON.stringify(color));
  });