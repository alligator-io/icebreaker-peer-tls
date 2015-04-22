var test = require('tape')
var _ = require('icebreaker')
require('../index.js')
var fs = require('fs')
var tls = require('tls')

test('_.peers.tls',function(t){
  t.plan(7)
  var p = _.peers.tls({
    port:'./test.socket',
    cert:fs.readFileSync(__dirname+'/public-cert.pem'),
    key:fs.readFileSync(__dirname+'/private-key.pem')
  })

  var c =0
  p.on('connection',function(connection){
    console.log('connection ',connection.address,':',connection.port)
    ++c
    connection.c=c
    _(["test"],connection,_.drain(function(data){
      t.equal(data.toString(),'test')
    },
    function(err,data){
      t.equal(err,null)
      if(connection.c==2)p.stop()
    }))
  })

  p.on('start',function(){
    console.log('starting peer',this.name,' on ',this.address,':',this.port)
  })

  p.on('started',function(){
    console.log('peer',this.name,' on ',this.address,':',this.port ,' started')
    p.connect(p)
  })

  p.on('stop',function(){
    console.log('stopping peer',this.name,' on ',this.address,':',this.port ,'')
  })

  p.on('stopped',function(){
    console.log('peer',this.name,' on ',this.address,':',this.port ,' stopped')
    t.equal(this.port,'./test.socket')
    console.log(this.port)
    t.equal(this.name,'tls')
    console.log(this.name)
    t.equal(Object.keys(p.connections).length,0)
  })

  p.start()
})
