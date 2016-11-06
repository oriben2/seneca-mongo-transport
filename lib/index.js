/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
'use strict';

var _ = require('lodash');
var MongoMQ = require('mongomq').MongoMQ;

module.exports = function (options) {
  var seneca = this;
  var plugin = 'mongo-transport';

  var so = seneca.options();

  options = seneca.util.deepextend(
    {
      mongo: {
        autoStart : false,
        host : 'localhost',
        port : 27017,
        queueCollection: 'queue',
        databaseName: 'mongomq'
      }
    },
    so.transport,
    options);

  var tu = seneca.export('transport/utils');
  seneca.add({role: 'transport', hook: 'listen', type: 'mongo'}, hook_listen_mongo);
  seneca.add({role: 'transport', hook: 'client', type: 'mongo'}, hook_client_mongo);

  function hook_listen_mongo (args, done) {
    var seneca = this;
    var type = args.type;
    var listen_options = seneca.util.clean(_.extend({}, options[type], args));

    var client = new MongoMQ(listen_options);
    handle_events(client);

    function onMessage(err, channel, msgstr, next) {
      var restopic = channel.replace(/_act$/, '_res');
      var data = tu.parseJSON(seneca, 'listen-' + type, msgstr);
      tu.handle_request(seneca, data, listen_options, function(out) {
        if (out == null) return;
        var outstr = tu.stringifyJSON(seneca, 'listen-' + type, out);
        client.emit(restopic, outstr);
        next();
      });
    }

    tu.listen_topics(seneca, args, listen_options, function (topic) {
      seneca.log.debug('listen', 'subscribe', topic + '_act', listen_options, seneca);
      client.on(topic + '_act', function(err, msgstr, next) {
        onMessage(err, topic + '_act', msgstr, next)
      });
    });

    seneca.add('role:seneca,cmd:close', function (close_args, done) {
      var closer = this;
      client.stop(function() {
        closer.prior(close_args, done);
      });
    });

    seneca.log.info('listen', 'open', listen_options, seneca);
    client.start(function(err) {
      done(err);
    });
  }

  function hook_client_mongo (args, clientdone) {
    var seneca = this;
    var type = args.type;
    var client_options = seneca.util.clean(_.extend({}, options[type], args));
    var client = new MongoMQ(client_options);
    handle_events(client);
    client.start(function(err) {
      if (err) {
        return clientdone(err);
      }


      tu.make_client(make_send, client_options, clientdone);
    });

    function make_send (spec, topic, send_done) {
      function onMessage(err, channel, msgstr, next) {
        var input = tu.parseJSON(seneca, 'client-' + type, msgstr);
        tu.handle_response(seneca, input, client_options);
        next();
      }

      seneca.log.debug('client', 'subscribe', topic + '_res', client_options, seneca);
      client.on(topic + '_res', function(err, msgstr, next) {
        onMessage(err, topic + '_res', msgstr, next);
      });

      send_done(null, function (args, done) {
        var outmsg = tu.prepare_request(this, args, done);
        var outstr = tu.stringifyJSON(seneca, 'client-' + type, outmsg);
        client.emit(topic + '_act', outstr)
      });

      seneca.add('role:seneca,cmd:close', function (close_args, done) {
        var closer = this;
        client.stop(function() {
          closer.prior(close_args, done);
        });
      })
    }
  }

  function handle_events (client) {
    var didConnect = false;
    client.on('ready', function() {
      didConnect = true;
    });
    client.on('error', function(err) {
      handle_err(didConnect, err);
    });
  }

  function handle_err(didConnect, err) {
    // throw if initial connection fails
    if (!didConnect) {
      throw err;
    }
    seneca.log.error('transport', 'mongo', err);
  }

  return {
    name: plugin
  }
};