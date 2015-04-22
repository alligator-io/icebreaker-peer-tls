# icebreaker-peer-tls

[![Travis](https://img.shields.io/travis/alligator-io/icebreaker-peer-tls.svg)](https://travis-ci.org/alligator-io/icebreaker-peer-tls)
[![NPM](https://img.shields.io/npm/dm/icebreaker-peer-tls.svg)](https://www.npmjs.com/package/icebreaker-peer-tls)
## Example
```javascript
var _ = require('icebreaker')
require('icebreaker-peer-tls')
require('icebreaker-msgpack')

var muxrpc = require('muxrpc')
var os = require('os')
var fs = require('fs')

var cert = fs.readFileSync('./node_modules/icebreaker-peer-tls/test/public-cert.pem') // for example
var key = fs.readFileSync('./node_modules/icebreaker-peer-tls/test/private-key.pem')

var manifest={
  os:{
    hostname:'sync',
    platform:'sync',
    arch:'sync'
  },
  peer:{
    name:'sync',
    port:'sync'
  }
}

var peer1 = _.peers.tls({port:5059,cert:cert,key:key})
peer1.on('connection',onConnection)
peer1.on('started',connectPeers)
peer1.start()


var peer2 = _.peers.tls({port:5060,cert:cert,key:key})
peer2.on('connection',onConnection)
peer2.on('started',connectPeers)
peer2.start()

var count = 0
function connectPeers(){
  if(++count===2){
    peer1.connect(peer2)
  }
}

function onConnection(connection){
  var rpc = muxrpc(manifest,manifest)({
    os:{
      hostname:os.hostname,
      platform:os.platform,
      arch:os.arch
    },
    peer:{
      name : function(){return this.name}.bind(this),
      port : function(){return this.port}.bind(this),
    }
  })

  rpc.peer.name(function(err,name){
    if(err){
      console.log(err)
      process.exit(1)
    }
    console.log('\nData from peer:',name)
  })

  rpc.peer.port(function(err,port){
    console.log('port:',port)
  })

  rpc.os.hostname(function(err,hostname){
    console.log('hostname:',hostname)
  })

  rpc.os.platform(function(err,platform){
    console.log('platform:',platform)
  })

  rpc.os.arch(function(err,arch){
    console.log('arch:',arch)
  })

  _(connection,_.msgpack.decode(),rpc.createStream(),_.msgpack.encode(),connection)
}
```
## License
MIT
