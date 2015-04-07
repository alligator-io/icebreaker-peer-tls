var tls = require('tls')
var fs = require('fs')
var _ = require('icebreaker')
if (!_.peer) require('icebreaker-peer')

function connection(original) {
  if (original.setKeepAlive) original.setKeepAlive(true)
  if (original.setNoDelay) original.setNoDelay(true)
  var net = _.pair(original)
  if (original.remoteAddress) net.address = original.remoteAddress
  if (original.remotePort) net.port = original.remotePort
  this.connection(net)
}

if (!_.peers) _.mixin({
  peers: {}
})

function getOptions(p) {
  var opts = {
    key: p.key,
    ca: p.ca,
    pfx: p.pfx
  }
  if (isString(p.port)) opts.path = p.port
  else options.port = p.port
  return opts
}

function isString(s){
  return typeof s === 'string'
}

_.mixin({
  tls: _.peer({
    name: 'tls',
    auto: true,

    start: function () {
      var self = this
      var options = getOptions(this)
      var server = self.server = tls.createServer(options, connection.bind(self))

      self.server.on('error', function (err) {
        if (isString(self.port) && err.code === 'EADDRINUSE') {
          var socket = tls.connect(options, function () {
            _(
              'peer ' + self.name + ' port ' + self.port +
              ' is already in use by another process.',
              _.log(process.exit.bind(null, 1), 'emerg')
            )
          })

          socket.on('error', function (err) {
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
          })

          return
        }

        _(
        ['cannot start peer' + self.name + ' on port ' + self.port, err],
          _.log(process.exit.bind(null, 1), 'emerg')
        )

      }
      )

      var onListening = function () {
        if (isString(self.port)) fs.chmod(self.port, 0777)
        self.emit('started')
      }

      var listen = function (onListening) {
        self.server.listen(
          self.port, isString(self.port) ? null :
          self.address, onListening
        )
      }

      listen(onListening)
    },

    connect: function (params) {
      var self = this

      if (!params.address) params.address = self.address

      var onError = function (err) {
        _([err.message, params, err.stack], _.log(null, 'error'))
      }

      var opts = getOptions(params)

      if (!isString(params.port)) {
        opts.host = params.address
      }

      var c = tls.connect(opts,
        function () {
          c.removeListener('error', onError)
          connection.call(self, c)
        }
      )
      c.once('error', onError)
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
          }
          else
            self.emit('stopped')
        })
      }
      catch (e) {
        _([e], _.log(function () {
         self.emit('stopped')
        }), 'error')
      }
    }
  })
  },
  _.peers)
