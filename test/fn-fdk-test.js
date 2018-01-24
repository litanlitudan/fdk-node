const test = require('tape');
const rewire = require('rewire');
const { MockStdOutput } = require('./mocks.js');
const { MockStdin } = require('./mocks.js');
const { MockFs } = require('./mocks.js');


/**
 *  Handler Dispatch tests 
 */


test('default dispatch no format declared', function(t) {
  var fdk = rewire('../fn-fdk.js');

  fdk.__set__({
    process: {
      env: {}
    },
    handleDefault: function(fnfunction) {
      t.pass('default handler called')
    },
    handleJSON: function(fnfunction) {
      t.fail('JSON handler called')
    }
  });

  fdk.handle(null);
  t.end();
});

test('default dispatch with format declared', function(t) {
  var fdk = rewire('../fn-fdk.js');

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "default"}
    },
    handleDefault: function(fnfunction) {
      t.pass('default handler called')
    },
    handleJSON: function(fnfunction) {
      t.fail('JSON handler called')
    }
  });

  fdk.handle(null);
  t.end();
});

test('JSON dispatch with format declared', function(t) {
  var fdk = rewire('../fn-fdk.js');

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"}
    },
    handleDefault: function(fnfunction) {
      t.fail('default handler called')
    },
    handleJSON: function(fnfunction) {
      t.pass('JSON handler called')
    }
  });

  fdk.handle(null);
  t.end();
});

// TODO: test 'Dispatch unknown format returns error'

/**
 *  Default format tests
 */ 

test('build default context', function(t) {
  var fdk = rewire('../fn-fdk.js');

  var envVars = {}
    , one = "one"
    , three = "three";

  envVars[one] = one;
  envVars[three] = three;
  envVars['FN_APP_NAME'] = "myapp";

  const DefaultContext = fdk.__get__("DefaultContext");
  var ctx = new DefaultContext(envVars);
  t.equal(ctx.getConfig(one), one);
  t.equal(ctx.app_name, "myapp", 'FN_ prefix stripped');
  t.equal(ctx.getConfig(three), three);
  t.end();
});


test('default non-FN env var', function(t) {
  var fdk = rewire('../fn-fdk.js');

  var inputMessage = ""
    , envKey = "ABCDE"
    , envValue = "12345"
    , envVars = {};

  envVars[envKey] = envValue;
  fdk.__set__({
    fs: new MockFs(t, '/dev/stdin', ""),
    process: {
      env: envVars,
      stdin:  new MockStdin(function() {
        t.fail('stdin read');
      }),
      stdout: new MockStdOutput(function() {}),
      stderr: new MockStdOutput(function() {}),
    },
   });

  fdk.handle(function(body, ctx) {
    t.assert(ctx.getConfig(envKey));
    t.equal(ctx.getConfig(envKey), envValue, envKey + ' env var value');
    return '';
  });
  t.end();
});

test('default function invocation with context', function(t) {
  var fdk = rewire('../fn-fdk.js')
    , inputMessage = "testbody"
    
  fdk.__set__({
    fs: new MockFs(t, '/dev/stdin', inputMessage),
    process: {
      env: {},
      stdin:  new MockStdin(function() {
        t.fail('stdin read');
      }),
      stdout: new MockStdOutput(function() {}),
      stderr: new MockStdOutput(function() {}),
    },
   });

  fdk.handle(function(body, ctx) {
    // function delares both body and optional context
    t.assert(body, "fn function invoked with body")
    t.assert(ctx, "fn function invoked with context");
    return '';
  });
  t.end();
});

test('default function invocation no context', function(t) {
  var fdk = rewire('../fn-fdk.js')
    , inputMessage = "testbody";

  fdk.__set__({
    fs: new MockFs(t, '/dev/stdin', inputMessage),
    process: {
      env: {},
      stdin:  new MockStdin(function() {
        t.fail('stdin read');
      }),
      stdout: new MockStdOutput(function() {}),
      stderr: new MockStdOutput(function() {}),
    },
    });
    
  fdk.handle(function(body) {
    // function does not declare context param
    t.assert(body, "fn function invoked with body")
    return '';
  });
  t.end();
});

test('default function body from stdin', function(t) {
  var fdk = rewire('../fn-fdk.js')
    , inputMessage = "testbody";

  fdk.__set__({
    fs: new MockFs(t, '/dev/stdin', inputMessage),
    process: {
      env: {},
      stdin:  new MockStdin(function() {
        t.fail('stdin read');
      }),
      stdout: new MockStdOutput(function() {}),
      stderr: new MockStdOutput(function(outputMessage) {
        t.equal(outputMessage, inputMessage);
      }),
    }
  });

  fdk.handle(function(body, ctx) {
    t.equal(body, inputMessage);
    return body;
  });
  t.end();
});



/*
 *  JSON format tests
 */ 

test('build JSON context', function(t) {
  var fdk = rewire('../fn-fdk.js');

  var request = {
    "protocol": {
      "headers": {
        "Fn_app_name": ["myapp"],
        "Fn_call_id": ["01C433NT3V47WGA00000000000"],
        "Fn_deadline": ["2018-01-17T22:26:49.387Z"],
        "Fn_format": ["json"],
        "Fn_memory": ["128"],
        "Fn_method": ["POST"],
        "Fn_param_app": ["myapp"],
        "Fn_param_route": ["\/hello"],
        "Fn_path": ["\/hello"],
        "Fn_request_url": ["http:\/\/localhost:8080\/r\/myapp\/hello"],
        "Fn_type": ["sync"],
        "Content-Type": ["application\/json"],
        "MY_HEADER" : "myheadervalue"
      }
    }
  };

  const JSONContext = fdk.__get__("JSONContext");
  var ctx = new JSONContext(request);

  var headers = request.protocol.headers;
  t.equal(ctx.getConfig("MY_HEADER"), headers["MY_HEADER"][0]);
  t.equal(ctx.getConfig("Content-Type"), headers["Content-Type"][0]);
  t.equal(ctx.app_name, headers["Fn_app_name"][0], 'app_name');
  t.equal(ctx.call_id, headers["Fn_call_id"][0], 'call_id');
  t.equal(ctx.deadline, headers["Fn_deadline"][0], 'deadline');
  t.equal(ctx.format, headers["Fn_format"][0], 'format');
  t.equal(ctx.memory, headers["Fn_memory"][0], 'memory');
  t.equal(ctx.method, headers["Fn_method"][0], 'method');
  t.equal(ctx.param_app, headers["Fn_param_app"][0], 'param');
  t.equal(ctx.param_route, headers["Fn_param_route"][0], 'param_route');
  t.equal(ctx.path, headers["Fn_path"][0], 'path');
  t.equal(ctx.request_url, headers["Fn_request_url"][0], 'request_url');
  t.equal(ctx.type, headers["Fn_type"][0], 'type');
  t.end();
});



test('JSON function invocation with context', function(t) {
  var fdk = rewire('../fn-fdk.js')
    , payload = "Jane"
    , call_id =  "01C433NT3V47WGA00000000000"
    , request = {
        "body" : JSON.stringify(payload), 
        "protocol": {
          "headers": {
            "Fn_call_id": [call_id],
            "Content-Type": ["application\/json"]
          }
        }
      };

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"},
      stderr: new MockStdOutput(function() {}),
      stdin:  new MockStdin(JSON.stringify(request)),
      stdout: new MockStdOutput(function () {})
    }
  });

  fdk.handle(function(body, ctx) {
    // function delares both body and optional context
    t.assert(body, "fn function invoked with body")
    t.assert(ctx, "fn function invoked with context");
    t.equal(body, payload);
    t.equal(ctx.call_id, call_id, 'call_id context value');
    return "";
  });
  t.end();
});

test('JSON function invocation no context', function(t) {
  var fdk = rewire('../fn-fdk.js')
    , request = {
        "body": "Jane",
        "protocol": {
          "headers": {}
        }
      }

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"},
      stderr: new MockStdOutput(function() {}),
      stdin: new MockStdin(JSON.stringify(request)),
      stdout:  new MockStdOutput(function () {})
    }
  });

  fdk.handle(function(body) {
    // function does not declare context param
    t.assert(body, "fn function invoked with body")
    return '';
  });

  t.end();
});

test('JSON function body and response', function(t) {
  var fdk = rewire('../fn-fdk.js')
    , payload = "Jane"
    , inputBody = JSON.stringify(payload)
    , request = {
        "body": inputBody,
        "protocol": {
          "headers": {
            "Fn_call_id": ["1"],
            "Content-Type":["application/json"]}
        }
      }
    , expectedOutputContentType = request.protocol.headers["Content-Type"][0]
    , expectedOutputPayload = payload + request.protocol.headers["Fn_call_id"][0]
    , expectedJSONResponse = buildJSONResponse(
        expectedOutputPayload, expectedOutputContentType);

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"},
      stderr: new MockStdOutput(function(data) {
        process.stderr.write(data);
      }),
      stdin:  new MockStdin(JSON.stringify(request)),
      stdout: new MockStdOutput(function (chunk) {
        var response = JSON.parse(chunk);
        t.deepEqual(response, expectedJSONResponse);
    })
    }
  });

  fdk.handle(function(body, ctx) {
    t.equal(body, payload); //parsed JSON
    return body + ctx.call_id;
  });
  t.end();
});



test('JSON format function exception', function(t) {
  var fdk = rewire('../fn-fdk.js')
    , request = {
        "body": JSON.stringify(''),
        "protocol": {
          "headers": {
            "Fn_call_id": ["1"]
          }
      }
    }
    // FDK error message constant
    , expectedBody = fdk.__get__("fnFunctionExceptionMessage")
    , expectedOutputContentType = 'application/text'
    , expectedJSONResponse = buildJSONErrorResponse(
        expectedBody, expectedOutputContentType);

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"},
      stderr: new MockStdOutput(function() {}),
      stdin:  new MockStdin(JSON.stringify(request)),
      stdout: new MockStdOutput(function (chunk) {
        var response = JSON.parse(chunk);
        t.deepEqual(expectedJSONResponse, response);
    })
    }
  });

  fdk.handle(function(body, ctx) {
    throw new Error("fail on purpose");
  });
  t.end();
});

// /**
//  * Redirect standard io
//  */
// test('Redirect stdout and prefix', function(t) {
//   t.plan(1);
//   var fdk = rewire('../fn-fdk.js')
//     , payload = "Tom";

//   fdk.__set__({
//     fs: new MockFs(t, '/dev/stdin', payload),
//     process: {
//       env: {},
//       stdin:  new MockStdin(function() {
//         t.fail('stdin read');  // TODO: should stdin access throw exception?
//       }),
//       stdout: new MockStdOutput(function() {
//         t.fail('output on stdout');
//       }),
//       stderr: new MockStdOutput(function (line) {
//         t.equal('[out] ' + payload);
//       })
//     }
//   });

//   fdk.handle(function(body, ctx) {
//     process.stdout.write(body);
//   });
//   t.end();
// });

// test('Redirect stderr and prefix', function(t) {
//   t.plan(1);
//   var fdk = rewire('../fn-fdk.js')
//     , payload = "Tom";

//   fdk.__set__({
//     fs: new MockFs(t, '/dev/stdin', payload),
//     process: {
//       env: {},
//       stdin:  new MockStdin(function() {
//         t.fail('stdin read'); // TODO: should stdin access throw exception?
//       }),
//       stdout: new MockStdOutput(function() {
//         t.fail('output on stdout');
//       }),
//       stderr: new MockStdOutput(function (line) {
//         t.equal('[err] ' + payload);
//       })
//     }
//   });

//   fdk.handle(function(body, ctx) {
//     process.stderr.write(body);
//   });
//   t.end();
// });


/**
 * Utilities
 */

function buildJSONResponse(payload, contentType) {
  return {
    body: JSON.stringify(payload),
    content_type: contentType,
    headers: {
      status_code: 200
    }
  };
}

function buildJSONErrorResponse(errorMessage, contentType) {
  return {
    body: errorMessage,
    content_type: contentType,
    headers: {
      status_code: 500
    }
  }
};