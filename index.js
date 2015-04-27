var tls = require('tls')
var fs = require('fs')
var _ = require('icebreaker')
if (!_.peer) require('icebreaker-peer')

if (!_.peers) _.mixin({
  peers: {}
})

function isString(s) {
  return typeof s === 'string'
}

function isPath(p) {
  return isString(p) && isNaN(p)
}

function pick(keys, p) {
  var opts = {}
  keys.forEach(function (key) {
    if (key === 'address') return opts.host = !isPath(p['port']) ? p[key] : null
    if (key === 'port' && isPath(p[key])) return opts.path = p[key]
    opts[key] = p[key]
  })
  return opts
}

_.mixin({
  tls: _.peer({
    name: 'tls',
    auto: true,
    requestCert: false,
    rejectUnauthorized: false,
    handshakeTimeout:20,
    start: function () {
      var self = this

      self.server = tls.createServer(
        pick(
          ['key', 'ca', 'cert', 'pfx', 'rejectUnauthorized', 'requestCert','handshakeTimeout'],
          this
        ),
        function(o){
          o.setKeepAlive(true)
          o.setNoDelay(true)
          var c = _.pair(o)
          c.address = o.remoteAddress
          c.port = o.remotePort
          self.connection(c)
        }
      )

      self.server.once('error', function (err) {
        if (isPath(self.port) && err.code === 'EADDRINUSE') {
          var socket = tls.connect(
            pick(
              ['key', 'ca', 'cert', 'pfx', 'rejectUnauthorized', 'port','handshakeTimeout'],
              self
            ),
            function () {
              _(
                'peer ' + self.name + ' port ' + self.port +
                ' is already in use by another process.',
                _.log(process.exit.bind(null, 1), 'emerg')
              )
            }
          )

          socket.once('error', function (err) {
            if (err.code == 'ECONNREFUSED') {
              fs.unlink(self.port, function (err) {
                if (err)
                  _(
                    'cannot remove unix socket ' + self.port,
                    _.log(process.exit.bind(null, 1), 'emerg')
                  )
                listen()
              })
            }
            else if (err.code === 'ENOENT') {
              listen()
            }
          })

          return
        }

        _(
        ['cannot start peer' + self.name + ' on port ' + self.port, err],
          _.log(process.exit.bind(null, 1), 'emerg')
        )

      })

      var listen = function (onListening) {
        self.server.listen(
          self.port, isPath(self.port) ? null :
          self.address, onListening
        )
      }

      listen(function () {
        if (isPath(self.port)) fs.chmod(self.port, 0777)
        self.emit('started')
      })
    },

    connect: function (params) {
      var self = this
      var keys = [
        'key', 'ca', 'cert', 'pfx', 'rejectUnauthorized', 'port', 'address','handshakeTimeout'
      ]
      var  original = params
      params = pick(keys, params)

      if (!params.ca && this.cert && this.rejectUnauthorized === false)
        params.ca = [this.cert]

      var defaults = pick(keys, this)
      for (var i in defaults) {
        if (!params[i] && defaults[i]) params[i] = defaults[i]
      }

      var o = tls.connect(params)
      o.direction=original
      o.setKeepAlive(true)
      o.setNoDelay(true)

      function emit(c){
        c.direction = original.direction
        c.address = o.remoteAddress||original.address
        if(original.hostname)c.hostname = original.hostname
        if(isPath(c.port))c.address = c.address||self.address
        c.port = o.remotePort||params.port
        self.connection(c)
      }

      function handle(err){
        o.removeListener('error',handle)
        o.removeListener('secureConnection',handle)
        if(err)return emit({ source:_.error(err), sink:_.drain()})
        emit(_.pair(o))
      }
      o.on('error',handle)
      o.on('secureConnection',handle)
    },

    stop: function stop() {
      var self = this
      try {
        self.server.close(function close() {
          if (Object.keys(self.connections).length > 0) {
            process.nextTick(function () {
              close.call(self)
            })
            return
          } else
            self.emit('stopped')
        })
      } catch (e) {
        _([e], _.log(function () {
          self.emit('stopped')
        }), 'error')
      }
    }
  })
},
_.peers)
