// based on http://debuggable.com/posts/streaming-file-uploads-with-node-js:4ac094b2-b6c8-4a7f-bd07-28accbdd56cb

var   sys = require("sys"),
       fs = require('fs'),
      url = require('url'),
     http = require("http"),
multipart = require("./lib/multipart");



http.createServer(function (request, response) {
  switch (url.parse(request.url).pathname) {
    case '/':
      display_form(request, response);
      break;
    case '/upload':
      upload_file(request, response);
      break;
    default:
      show_404(request, response);
      break;
  }
}).listen(8124);

function display_form(request, response) {
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(
    '<form action="/upload" method="POST" enctype="multipart/form-data">' +
    '<input type="file" name="upload-file">' +
    '<input type="submit" value="Upload">' +
    '</form>'
  );
  response.end();
}

function upload_file(request, response) {
  var name, filename, file,file2;
  request.setEncoding('binary');

  file2 = fs.createWriteStream("./parse_log");
  //file2.setEncoding('binary');
  // parsing
  var parser = multipart.parser();
  parser.headers = request.headers;
  
  /*sys.pump(request.connection, parser, function()
  {
   sys.debug('request end'); 
   parser.close();
  });*/
    
  request.addListener('end', function()
  { 
   sys.debug('request end');
   parser.close();
  });
  
  parser.addListener('onPartBegin', function(part) {
    //    sys.debug(sys.inspect(part));
    name = part.name;
    filename = part.filename;
    file = fs.createWriteStream("./" + filename);
    //fs.open(path, flags, mode=0666, [callback])
    //file.setEncoding('binary');
  });
  
  parser.addListener('onPartEnd', function(part) {
    file.end();
    file2.end();
    sys.debug(' parser on part end  ');
  });
  
  parser.addListener('onData', function(chunk) {
    file.write(chunk,'binary');
   //  function(err, bytesWritten) {
   //   sys.debug('bytes written: ' + bytesWritten);
  //  }
  });


  parser.addListener('onEnd', function(part)
  {
    sys.debug(' parser on end  ');
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write('Thanks for the upload');
    response.end();
  }); 
  
  parser.addListener('onError', function(part)
  {
    sys.debug(' parser on end  ');
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write('Error for the upload');
    response.end();
  });

  request.addListener('data', function(chunk)
  {
   sys.debug('request data'); 
   file2.write(chunk,'binary');
   parser.write(chunk) ;  
  }); 
}

function show_404(request, response) {
  response.writeHead(404, {'Content-Type': 'text/plain'});
  response.write('404 - Please try again.');
  response.end();
}

