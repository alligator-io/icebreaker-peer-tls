var test = require('tape')
var _ = require('icebreaker')
var fs = require('fs')
require('../index.js')

test('_.peers.tls should emit an error',function(t){
  var p = _.peers.tls({
    port:'./test2.socket',
    enabled:false,
    cert:fs.readFileSync(__dirname+'/public-cert.pem'),
    key:fs.readFileSync(__dirname+'/private-key.pem')
  })

  p.on('connection',function(connection){
    _(['test'],connection,_.onEnd(function(err){
      t.equal(err.code,'ECONNREFUSED')
      p.stop()
    }))
  })

  p.on('started',function(){
    p.connect({address:'localhost',port:'9872'})
  })

  p.on('stopped',function(){
    t.equal(this.port,'./test2.socket')
    t.equal(this.name,'tls')
    t.equal(Object.keys(p.connections).length,0)
    t.end()
  })

  p.start()
})
