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

function connection(original) {
  if (original.setKeepAlive) original.setKeepAlive(true)
  if (original.setNoDelay) original.setNoDelay(true)
  var connection = _.pair(original)
  if (original.remoteAddress) connection.address = original.remoteAddress
  if (original.remotePort) connection.port = original.remotePort
  this.connection(net)
}

_.mixin({
  tls: _.peer({
    name: 'tls',
    auto: true,
    requestCert: false,
    rejectUnauthorized: false,
    start: function () {
      var self = this

      self.server = tls.createServer(
        pick(
          ['key', 'ca', 'cert', 'pfx', 'rejectUnauthorized', 'requestCert'],
          this
        ),
        connection.bind(this)
      )

      self.server.once('error', function (err) {
        if (isPath(self.port) && err.code === 'EADDRINUSE') {
          var socket = tls.connect(
            pick(
              ['key', 'ca', 'cert', 'pfx', 'rejectUnauthorized', 'port'],
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
      var keys = [
        'key', 'ca', 'cert', 'pfx', 'rejectUnauthorized', 'port', 'address'
      ]

      params = pick(keys, params)

      if (!params.ca && this.cert && this.rejectUnauthorized === false)
        params.ca = [this.cert]

      var defaults = pick(keys, this)
      for (var i in defaults) {
        if (!params[i] && defaults[i]) params[i] = defaults[i]
      }

      connection.call(this, tls.connect(params))
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
