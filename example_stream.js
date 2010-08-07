// based on http://debuggable.com/posts/streaming-file-uploads-with-node-js:4ac094b2-b6c8-4a7f-bd07-28accbdd56cb

var   sys = require("sys"),
       fs = require('fs'),
      url = require('url'),
     http = require("http"),
multipart = require("./lib/multipart");





function upload_files(request, response,request_vars,folder,callback) 
  {
  // matches .xxxxx or [xxxxx] or ['xxxxx'] or ["xxxxx"] with optional [] at the end
  var chunks = /(?:(?:^|\.)([^\[\(\.]+)(?=\[|\.|$|\()|\[([^"'][^\]]*?)\]|\["([^\]"]*?)"\]|\['([^\]']*?)'\])(\[\])?/g;
  // Parse a key=val string.
  function add_to_object_by_name (obj, key, value) // a modified version of QueryString.parse = QueryString.decode 
  {
      var res=obj,next;
      key.replace(chunks, function (all, name, nameInBrackets, nameIn2Quotes, nameIn1Quotes, isArray, offset) {
        var end = offset + all.length == key.length;
        name = name || nameInBrackets || nameIn2Quotes || nameIn1Quotes;
        next = end ? value : {};
        next = next && (+next == next ? +next : next);
        if (Array.isArray(res[name])) {
          res[name].push(next);
          res = next;
        } else {
          if (name in res) {
            if (isArray || end) {
              res = (res[name] = [res[name], next])[1];
            } else {
              res = res[name];
            }
          } else {
            if (isArray) {
              res = (res[name] = [next])[0];
            } else {
              res = res[name] = next;
            }
          }
        }
      });
    return obj;
  };

  request.setEncoding('binary');
  var parser = multipart.parser();
  parser.headers = request.headers;
  
  var request_vars=[];
  var name, savename, filename, text, file;
  var inquee=0,finished=false;  
  if(folder.charAt(folder.length-1)!='/') folder+='/';
   
  parser.addListener('onPartBegin', function(part)
  {
    inquee++;
    name = part.name;
    if(!part.filename)
    {
     text="";
     file=false;
    }
    else
    {
      var randomname=(((new Date()).getTime()*10000)+(Math.floor(Math.random() * 9999)))+".tmp";
      savename=folder+randomname;
      file = fs.createWriteStream(savename,{ 'flags': 'w', 'encoding': 'binary', 'mode': 0666 });
      file.addListener('close', function(part)
      {
       inquee--;
       if(finished&&inquee==0)
       {
        callback(null,request_vars); // if file writing goes beyond parsing, call callback it later when done.
       }
      });
    }
    // instead onData and onPartEnd, a pump should be set up here
    // like: sys.pump(part, file, function()  { sys.debug('file pump end');  });
  });
  
  /*
  function(part)
  {
     inquee--;
     if(finished&&inquee==0)
      callback(null,request_vars); // if file writing goes beyond parsing, call callback it later when done.
  }
  */
  parser.addListener('onData', function(chunk) { if(file) file.write(chunk); else  text+=chunk;  });
  parser.addListener('onPartEnd', function(part)
  {
   if(file)
   {
    add_to_object_by_name(request_vars,part.name,{filename:part.filename,path:savename,mime:part.mime});
    file.end();
   }
   else
   {
    add_to_object_by_name(request_vars,part.name,text);
   }
  });
  parser.addListener('onEnd', function(part)   {  finished=true;  if(inquee==0) callback(null,request_vars);}); 
  parser.addListener('onError', function(err) {  sys.debug(' parser on end  '); callback(err,request_vars); });
  sys.pump(request, parser, function()  { sys.debug('request end');  });
}

http.createServer(function (request, response) {
  switch (url.parse(request.url).pathname)
  {
    case '/':
      //show form
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.write(
        '<form action="/upload" method="POST" enctype="multipart/form-data">' +
        'choose file: <input type="file" name="upload-file"><br>' +
        'enter some text: <input type="text" name="description"><br>' +
        '<input type="submit" value="Upload">' +
        '</form>'
      );
      response.end();
      break;
    case '/upload':
      upload_files(request, response,'./',function(error,data)
      {
          if(error!==null)
          {
             response.writeHead(200, {'Content-Type': 'text/plain'});
             response.write('Multipart Parse Error');
             response.end();
          }
          else
          {
             response.writeHead(200, {'Content-Type': 'text/plain'});
             response.write('Thanks for the upload');
             response.end();
          }
      });
      break;
    default:
      //show 404
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.write('404 - Please try again.');
      response.end();
      break;
  }
}).listen(8124);

//var obj1={};
//var item1={name:'i am item'};
//var name='myitem[test][]';
//add_to_object_by_name(obj1,name,item1);
//console.log(sys.inspect(obj1,1000));