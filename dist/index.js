(()=>{function e(e){return e&&e.__esModule?e.default:e}var t="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},n={},r={},a=t.parcelRequired540;null==a&&((a=function(e){if(e in n)return n[e].exports;if(e in r){var t=r[e];delete r[e];var a={id:e,exports:{}};return n[e]=a,t.call(a.exports,a,a.exports),a.exports}var o=new Error("Cannot find module '"+e+"'");throw o.code="MODULE_NOT_FOUND",o}).register=function(e,t){r[e]=t},t.parcelRequired540=a),a.register("4pmpg",(function(e,t){"use strict";var n=a("gBiMb"),r=a("aHqGi"),o=a("bGXgz"),i=a("eW3qV");function s(e){var t=new o(e),a=r(o.prototype.request,t);return n.extend(a,o.prototype,t),n.extend(a,t),a}var c=s(a("1qNYy"));c.Axios=o,c.create=function(e){return s(i(c.defaults,e))},c.Cancel=a("1N35X"),c.CancelToken=a("cdbqI"),c.isCancel=a("cbWLS"),c.all=function(e){return Promise.all(e)},c.spread=a("i4UJt"),c.isAxiosError=a("9yMNx"),e.exports=c,e.exports.default=c})),a.register("gBiMb",(function(e,t){"use strict";var n=a("aHqGi"),r=Object.prototype.toString;function o(e){return"[object Array]"===r.call(e)}function i(e){return void 0===e}function s(e){return null!==e&&"object"==typeof e}function c(e){if("[object Object]"!==r.call(e))return!1;var t=Object.getPrototypeOf(e);return null===t||t===Object.prototype}function u(e){return"[object Function]"===r.call(e)}function l(e,t){if(null!=e)if("object"!=typeof e&&(e=[e]),o(e))for(var n=0,r=e.length;n<r;n++)t.call(null,e[n],n,e);else for(var a in e)Object.prototype.hasOwnProperty.call(e,a)&&t.call(null,e[a],a,e)}e.exports={isArray:o,isArrayBuffer:function(e){return"[object ArrayBuffer]"===r.call(e)},isBuffer:function(e){return null!==e&&!i(e)&&null!==e.constructor&&!i(e.constructor)&&"function"==typeof e.constructor.isBuffer&&e.constructor.isBuffer(e)},isFormData:function(e){return"undefined"!=typeof FormData&&e instanceof FormData},isArrayBufferView:function(e){return"undefined"!=typeof ArrayBuffer&&ArrayBuffer.isView?ArrayBuffer.isView(e):e&&e.buffer&&e.buffer instanceof ArrayBuffer},isString:function(e){return"string"==typeof e},isNumber:function(e){return"number"==typeof e},isObject:s,isPlainObject:c,isUndefined:i,isDate:function(e){return"[object Date]"===r.call(e)},isFile:function(e){return"[object File]"===r.call(e)},isBlob:function(e){return"[object Blob]"===r.call(e)},isFunction:u,isStream:function(e){return s(e)&&u(e.pipe)},isURLSearchParams:function(e){return"undefined"!=typeof URLSearchParams&&e instanceof URLSearchParams},isStandardBrowserEnv:function(){return("undefined"==typeof navigator||"ReactNative"!==navigator.product&&"NativeScript"!==navigator.product&&"NS"!==navigator.product)&&("undefined"!=typeof window&&"undefined"!=typeof document)},forEach:l,merge:function e(){var t={};function n(n,r){c(t[r])&&c(n)?t[r]=e(t[r],n):c(n)?t[r]=e({},n):o(n)?t[r]=n.slice():t[r]=n}for(var r=0,a=arguments.length;r<a;r++)l(arguments[r],n);return t},extend:function(e,t,r){return l(t,(function(t,a){e[a]=r&&"function"==typeof t?n(t,r):t})),e},trim:function(e){return e.trim?e.trim():e.replace(/^\s+|\s+$/g,"")},stripBOM:function(e){return 65279===e.charCodeAt(0)&&(e=e.slice(1)),e}}})),a.register("aHqGi",(function(e,t){"use strict";e.exports=function(e,t){return function(){for(var n=new Array(arguments.length),r=0;r<n.length;r++)n[r]=arguments[r];return e.apply(t,n)}}})),a.register("bGXgz",(function(e,t){"use strict";var n=a("gBiMb"),r=a("74Y2B"),o=a("4OKYc"),i=a("eXgnr"),s=a("eW3qV"),c=a("8l8wy"),u=c.validators;function l(e){this.defaults=e,this.interceptors={request:new o,response:new o}}l.prototype.request=function(e){"string"==typeof e?(e=arguments[1]||{}).url=arguments[0]:e=e||{},(e=s(this.defaults,e)).method?e.method=e.method.toLowerCase():this.defaults.method?e.method=this.defaults.method.toLowerCase():e.method="get";var t=e.transitional;void 0!==t&&c.assertOptions(t,{silentJSONParsing:u.transitional(u.boolean,"1.0.0"),forcedJSONParsing:u.transitional(u.boolean,"1.0.0"),clarifyTimeoutError:u.transitional(u.boolean,"1.0.0")},!1);var n=[],r=!0;this.interceptors.request.forEach((function(t){"function"==typeof t.runWhen&&!1===t.runWhen(e)||(r=r&&t.synchronous,n.unshift(t.fulfilled,t.rejected))}));var a,o=[];if(this.interceptors.response.forEach((function(e){o.push(e.fulfilled,e.rejected)})),!r){var l=[i,void 0];for(Array.prototype.unshift.apply(l,n),l=l.concat(o),a=Promise.resolve(e);l.length;)a=a.then(l.shift(),l.shift());return a}for(var p=e;n.length;){var d=n.shift(),f=n.shift();try{p=d(p)}catch(e){f(e);break}}try{a=i(p)}catch(e){return Promise.reject(e)}for(;o.length;)a=a.then(o.shift(),o.shift());return a},l.prototype.getUri=function(e){return e=s(this.defaults,e),r(e.url,e.params,e.paramsSerializer).replace(/^\?/,"")},n.forEach(["delete","get","head","options"],(function(e){l.prototype[e]=function(t,n){return this.request(s(n||{},{method:e,url:t,data:(n||{}).data}))}})),n.forEach(["post","put","patch"],(function(e){l.prototype[e]=function(t,n,r){return this.request(s(r||{},{method:e,url:t,data:n}))}})),e.exports=l})),a.register("74Y2B",(function(e,t){"use strict";var n=a("gBiMb");function r(e){return encodeURIComponent(e).replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,"+").replace(/%5B/gi,"[").replace(/%5D/gi,"]")}e.exports=function(e,t,a){if(!t)return e;var o;if(a)o=a(t);else if(n.isURLSearchParams(t))o=t.toString();else{var i=[];n.forEach(t,(function(e,t){null!=e&&(n.isArray(e)?t+="[]":e=[e],n.forEach(e,(function(e){n.isDate(e)?e=e.toISOString():n.isObject(e)&&(e=JSON.stringify(e)),i.push(r(t)+"="+r(e))})))})),o=i.join("&")}if(o){var s=e.indexOf("#");-1!==s&&(e=e.slice(0,s)),e+=(-1===e.indexOf("?")?"?":"&")+o}return e}})),a.register("4OKYc",(function(e,t){"use strict";var n=a("gBiMb");function r(){this.handlers=[]}r.prototype.use=function(e,t,n){return this.handlers.push({fulfilled:e,rejected:t,synchronous:!!n&&n.synchronous,runWhen:n?n.runWhen:null}),this.handlers.length-1},r.prototype.eject=function(e){this.handlers[e]&&(this.handlers[e]=null)},r.prototype.forEach=function(e){n.forEach(this.handlers,(function(t){null!==t&&e(t)}))},e.exports=r})),a.register("eXgnr",(function(e,t){"use strict";var n=a("gBiMb"),r=a("7vPtK"),o=a("cbWLS"),i=a("1qNYy");function s(e){e.cancelToken&&e.cancelToken.throwIfRequested()}e.exports=function(e){return s(e),e.headers=e.headers||{},e.data=r.call(e,e.data,e.headers,e.transformRequest),e.headers=n.merge(e.headers.common||{},e.headers[e.method]||{},e.headers),n.forEach(["delete","get","head","post","put","patch","common"],(function(t){delete e.headers[t]})),(e.adapter||i.adapter)(e).then((function(t){return s(e),t.data=r.call(e,t.data,t.headers,e.transformResponse),t}),(function(t){return o(t)||(s(e),t&&t.response&&(t.response.data=r.call(e,t.response.data,t.response.headers,e.transformResponse))),Promise.reject(t)}))}})),a.register("7vPtK",(function(e,t){"use strict";var n=a("gBiMb"),r=a("1qNYy");e.exports=function(e,t,a){var o=this||r;return n.forEach(a,(function(n){e=n.call(o,e,t)})),e}})),a.register("1qNYy",(function(e,t){var n=a("ieOnZ"),r=a("gBiMb"),o=a("6FM61"),i=a("jmtzu"),s={"Content-Type":"application/x-www-form-urlencoded"};function c(e,t){!r.isUndefined(e)&&r.isUndefined(e["Content-Type"])&&(e["Content-Type"]=t)}var u,l={transitional:{silentJSONParsing:!0,forcedJSONParsing:!0,clarifyTimeoutError:!1},adapter:(("undefined"!=typeof XMLHttpRequest||void 0!==n&&"[object process]"===Object.prototype.toString.call(n))&&(u=a("eQidV")),u),transformRequest:[function(e,t){return o(t,"Accept"),o(t,"Content-Type"),r.isFormData(e)||r.isArrayBuffer(e)||r.isBuffer(e)||r.isStream(e)||r.isFile(e)||r.isBlob(e)?e:r.isArrayBufferView(e)?e.buffer:r.isURLSearchParams(e)?(c(t,"application/x-www-form-urlencoded;charset=utf-8"),e.toString()):r.isObject(e)||t&&"application/json"===t["Content-Type"]?(c(t,"application/json"),function(e,t,n){if(r.isString(e))try{return(t||JSON.parse)(e),r.trim(e)}catch(e){if("SyntaxError"!==e.name)throw e}return(n||JSON.stringify)(e)}(e)):e}],transformResponse:[function(e){var t=this.transitional,n=t&&t.silentJSONParsing,a=t&&t.forcedJSONParsing,o=!n&&"json"===this.responseType;if(o||a&&r.isString(e)&&e.length)try{return JSON.parse(e)}catch(e){if(o){if("SyntaxError"===e.name)throw i(e,this,"E_JSON_PARSE");throw e}}return e}],timeout:0,xsrfCookieName:"XSRF-TOKEN",xsrfHeaderName:"X-XSRF-TOKEN",maxContentLength:-1,maxBodyLength:-1,validateStatus:function(e){return e>=200&&e<300}};l.headers={common:{Accept:"application/json, text/plain, */*"}},r.forEach(["delete","get","head"],(function(e){l.headers[e]={}})),r.forEach(["post","put","patch"],(function(e){l.headers[e]=r.merge(s)})),e.exports=l})),a.register("ieOnZ",(function(e,t){var n,r,a=e.exports={};function o(){throw new Error("setTimeout has not been defined")}function i(){throw new Error("clearTimeout has not been defined")}function s(e){if(n===setTimeout)return setTimeout(e,0);if((n===o||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:o}catch(e){n=o}try{r="function"==typeof clearTimeout?clearTimeout:i}catch(e){r=i}}();var c,u=[],l=!1,p=-1;function d(){l&&c&&(l=!1,c.length?u=c.concat(u):p=-1,u.length&&f())}function f(){if(!l){var e=s(d);l=!0;for(var t=u.length;t;){for(c=u,u=[];++p<t;)c&&c[p].run();p=-1,t=u.length}c=null,l=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===i||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e)}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e)}}function g(e,t){this.fun=e,this.array=t}function h(){}a.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];u.push(new g(e,t)),1!==u.length||l||s(f)},g.prototype.run=function(){this.fun.apply(null,this.array)},a.title="browser",a.browser=!0,a.env={},a.argv=[],a.version="",a.versions={},a.on=h,a.addListener=h,a.once=h,a.off=h,a.removeListener=h,a.removeAllListeners=h,a.emit=h,a.prependListener=h,a.prependOnceListener=h,a.listeners=function(e){return[]},a.binding=function(e){throw new Error("process.binding is not supported")},a.cwd=function(){return"/"},a.chdir=function(e){throw new Error("process.chdir is not supported")},a.umask=function(){return 0}})),a.register("6FM61",(function(e,t){"use strict";var n=a("gBiMb");e.exports=function(e,t){n.forEach(e,(function(n,r){r!==t&&r.toUpperCase()===t.toUpperCase()&&(e[t]=n,delete e[r])}))}})),a.register("jmtzu",(function(e,t){"use strict";e.exports=function(e,t,n,r,a){return e.config=t,n&&(e.code=n),e.request=r,e.response=a,e.isAxiosError=!0,e.toJSON=function(){return{message:this.message,name:this.name,description:this.description,number:this.number,fileName:this.fileName,lineNumber:this.lineNumber,columnNumber:this.columnNumber,stack:this.stack,config:this.config,code:this.code}},e}})),a.register("eQidV",(function(e,t){"use strict";var n=a("gBiMb"),r=a("lBJvL"),o=a("biJ6e"),i=a("74Y2B"),s=a("dSFv7"),c=a("kIv68"),u=a("bS2Id"),l=a("bRI0M");e.exports=function(e){return new Promise((function(t,a){var p=e.data,d=e.headers,f=e.responseType;n.isFormData(p)&&delete d["Content-Type"];var g=new XMLHttpRequest;if(e.auth){var h=e.auth.username||"",m=e.auth.password?unescape(encodeURIComponent(e.auth.password)):"";d.Authorization="Basic "+btoa(h+":"+m)}var y=s(e.baseURL,e.url);function v(){if(g){var n="getAllResponseHeaders"in g?c(g.getAllResponseHeaders()):null,o={data:f&&"text"!==f&&"json"!==f?g.response:g.responseText,status:g.status,statusText:g.statusText,headers:n,config:e,request:g};r(t,a,o),g=null}}if(g.open(e.method.toUpperCase(),i(y,e.params,e.paramsSerializer),!0),g.timeout=e.timeout,"onloadend"in g?g.onloadend=v:g.onreadystatechange=function(){g&&4===g.readyState&&(0!==g.status||g.responseURL&&0===g.responseURL.indexOf("file:"))&&setTimeout(v)},g.onabort=function(){g&&(a(l("Request aborted",e,"ECONNABORTED",g)),g=null)},g.onerror=function(){a(l("Network Error",e,null,g)),g=null},g.ontimeout=function(){var t="timeout of "+e.timeout+"ms exceeded";e.timeoutErrorMessage&&(t=e.timeoutErrorMessage),a(l(t,e,e.transitional&&e.transitional.clarifyTimeoutError?"ETIMEDOUT":"ECONNABORTED",g)),g=null},n.isStandardBrowserEnv()){var w=(e.withCredentials||u(y))&&e.xsrfCookieName?o.read(e.xsrfCookieName):void 0;w&&(d[e.xsrfHeaderName]=w)}"setRequestHeader"in g&&n.forEach(d,(function(e,t){void 0===p&&"content-type"===t.toLowerCase()?delete d[t]:g.setRequestHeader(t,e)})),n.isUndefined(e.withCredentials)||(g.withCredentials=!!e.withCredentials),f&&"json"!==f&&(g.responseType=e.responseType),"function"==typeof e.onDownloadProgress&&g.addEventListener("progress",e.onDownloadProgress),"function"==typeof e.onUploadProgress&&g.upload&&g.upload.addEventListener("progress",e.onUploadProgress),e.cancelToken&&e.cancelToken.promise.then((function(e){g&&(g.abort(),a(e),g=null)})),p||(p=null),g.send(p)}))}})),a.register("lBJvL",(function(e,t){"use strict";var n=a("bRI0M");e.exports=function(e,t,r){var a=r.config.validateStatus;r.status&&a&&!a(r.status)?t(n("Request failed with status code "+r.status,r.config,null,r.request,r)):e(r)}})),a.register("bRI0M",(function(e,t){"use strict";var n=a("jmtzu");e.exports=function(e,t,r,a,o){var i=new Error(e);return n(i,t,r,a,o)}})),a.register("biJ6e",(function(e,t){"use strict";var n=a("gBiMb");e.exports=n.isStandardBrowserEnv()?{write:function(e,t,r,a,o,i){var s=[];s.push(e+"="+encodeURIComponent(t)),n.isNumber(r)&&s.push("expires="+new Date(r).toGMTString()),n.isString(a)&&s.push("path="+a),n.isString(o)&&s.push("domain="+o),!0===i&&s.push("secure"),document.cookie=s.join("; ")},read:function(e){var t=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return t?decodeURIComponent(t[3]):null},remove:function(e){this.write(e,"",Date.now()-864e5)}}:{write:function(){},read:function(){return null},remove:function(){}}})),a.register("dSFv7",(function(e,t){"use strict";var n=a("40pC5"),r=a("6GfjI");e.exports=function(e,t){return e&&!n(t)?r(e,t):t}})),a.register("40pC5",(function(e,t){"use strict";e.exports=function(e){return/^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(e)}})),a.register("6GfjI",(function(e,t){"use strict";e.exports=function(e,t){return t?e.replace(/\/+$/,"")+"/"+t.replace(/^\/+/,""):e}})),a.register("kIv68",(function(e,t){"use strict";var n=a("gBiMb"),r=["age","authorization","content-length","content-type","etag","expires","from","host","if-modified-since","if-unmodified-since","last-modified","location","max-forwards","proxy-authorization","referer","retry-after","user-agent"];e.exports=function(e){var t,a,o,i={};return e?(n.forEach(e.split("\n"),(function(e){if(o=e.indexOf(":"),t=n.trim(e.substr(0,o)).toLowerCase(),a=n.trim(e.substr(o+1)),t){if(i[t]&&r.indexOf(t)>=0)return;i[t]="set-cookie"===t?(i[t]?i[t]:[]).concat([a]):i[t]?i[t]+", "+a:a}})),i):i}})),a.register("bS2Id",(function(e,t){"use strict";var n=a("gBiMb");e.exports=n.isStandardBrowserEnv()?function(){var e,t=/(msie|trident)/i.test(navigator.userAgent),r=document.createElement("a");function a(e){var n=e;return t&&(r.setAttribute("href",n),n=r.href),r.setAttribute("href",n),{href:r.href,protocol:r.protocol?r.protocol.replace(/:$/,""):"",host:r.host,search:r.search?r.search.replace(/^\?/,""):"",hash:r.hash?r.hash.replace(/^#/,""):"",hostname:r.hostname,port:r.port,pathname:"/"===r.pathname.charAt(0)?r.pathname:"/"+r.pathname}}return e=a(window.location.href),function(t){var r=n.isString(t)?a(t):t;return r.protocol===e.protocol&&r.host===e.host}}():function(){return!0}})),a.register("cbWLS",(function(e,t){"use strict";e.exports=function(e){return!(!e||!e.__CANCEL__)}})),a.register("eW3qV",(function(e,t){"use strict";var n=a("gBiMb");e.exports=function(e,t){t=t||{};var r={},a=["url","method","data"],o=["headers","auth","proxy","params"],i=["baseURL","transformRequest","transformResponse","paramsSerializer","timeout","timeoutMessage","withCredentials","adapter","responseType","xsrfCookieName","xsrfHeaderName","onUploadProgress","onDownloadProgress","decompress","maxContentLength","maxBodyLength","maxRedirects","transport","httpAgent","httpsAgent","cancelToken","socketPath","responseEncoding"],s=["validateStatus"];function c(e,t){return n.isPlainObject(e)&&n.isPlainObject(t)?n.merge(e,t):n.isPlainObject(t)?n.merge({},t):n.isArray(t)?t.slice():t}function u(a){n.isUndefined(t[a])?n.isUndefined(e[a])||(r[a]=c(void 0,e[a])):r[a]=c(e[a],t[a])}n.forEach(a,(function(e){n.isUndefined(t[e])||(r[e]=c(void 0,t[e]))})),n.forEach(o,u),n.forEach(i,(function(a){n.isUndefined(t[a])?n.isUndefined(e[a])||(r[a]=c(void 0,e[a])):r[a]=c(void 0,t[a])})),n.forEach(s,(function(n){n in t?r[n]=c(e[n],t[n]):n in e&&(r[n]=c(void 0,e[n]))}));var l=a.concat(o).concat(i).concat(s),p=Object.keys(e).concat(Object.keys(t)).filter((function(e){return-1===l.indexOf(e)}));return n.forEach(p,u),r}})),a.register("8l8wy",(function(e,t){"use strict";var n=a("kGKMV"),r={};["object","boolean","number","function","string","symbol"].forEach((function(e,t){r[e]=function(n){return typeof n===e||"a"+(t<1?"n ":" ")+e}}));var o={},i=n.version.split(".");function s(e,t){for(var n=t?t.split("."):i,r=e.split("."),a=0;a<3;a++){if(n[a]>r[a])return!0;if(n[a]<r[a])return!1}return!1}r.transitional=function(e,t,r){var a=t&&s(t);function i(e,t){return"[Axios v"+n.version+"] Transitional option '"+e+"'"+t+(r?". "+r:"")}return function(n,r,s){if(!1===e)throw new Error(i(r," has been removed in "+t));return a&&!o[r]&&(o[r]=!0,console.warn(i(r," has been deprecated since v"+t+" and will be removed in the near future"))),!e||e(n,r,s)}},e.exports={isOlderVersion:s,assertOptions:function(e,t,n){if("object"!=typeof e)throw new TypeError("options must be an object");for(var r=Object.keys(e),a=r.length;a-- >0;){var o=r[a],i=t[o];if(i){var s=e[o],c=void 0===s||i(s,o,e);if(!0!==c)throw new TypeError("option "+o+" must be "+c)}else if(!0!==n)throw Error("Unknown option "+o)}},validators:r}})),a.register("kGKMV",(function(e,t){e.exports=JSON.parse('{"name":"axios","version":"0.21.4","description":"Promise based HTTP client for the browser and node.js","main":"index.js","scripts":{"test":"grunt test","start":"node ./sandbox/server.js","build":"NODE_ENV=production grunt build","preversion":"npm test","version":"npm run build && grunt version && git add -A dist && git add CHANGELOG.md bower.json package.json","postversion":"git push && git push --tags","examples":"node ./examples/server.js","coveralls":"cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js","fix":"eslint --fix lib/**/*.js"},"repository":{"type":"git","url":"https://github.com/axios/axios.git"},"keywords":["xhr","http","ajax","promise","node"],"author":"Matt Zabriskie","license":"MIT","bugs":{"url":"https://github.com/axios/axios/issues"},"homepage":"https://axios-http.com","devDependencies":{"coveralls":"^3.0.0","es6-promise":"^4.2.4","grunt":"^1.3.0","grunt-banner":"^0.6.0","grunt-cli":"^1.2.0","grunt-contrib-clean":"^1.1.0","grunt-contrib-watch":"^1.0.0","grunt-eslint":"^23.0.0","grunt-karma":"^4.0.0","grunt-mocha-test":"^0.13.3","grunt-ts":"^6.0.0-beta.19","grunt-webpack":"^4.0.2","istanbul-instrumenter-loader":"^1.0.0","jasmine-core":"^2.4.1","karma":"^6.3.2","karma-chrome-launcher":"^3.1.0","karma-firefox-launcher":"^2.1.0","karma-jasmine":"^1.1.1","karma-jasmine-ajax":"^0.1.13","karma-safari-launcher":"^1.0.0","karma-sauce-launcher":"^4.3.6","karma-sinon":"^1.0.5","karma-sourcemap-loader":"^0.3.8","karma-webpack":"^4.0.2","load-grunt-tasks":"^3.5.2","minimist":"^1.2.0","mocha":"^8.2.1","sinon":"^4.5.0","terser-webpack-plugin":"^4.2.3","typescript":"^4.0.5","url-search-params":"^0.10.0","webpack":"^4.44.2","webpack-dev-server":"^3.11.0"},"browser":{"./lib/adapters/http.js":"./lib/adapters/xhr.js"},"jsdelivr":"dist/axios.min.js","unpkg":"dist/axios.min.js","typings":"./index.d.ts","dependencies":{"follow-redirects":"^1.14.0"},"bundlesize":[{"path":"./dist/axios.min.js","threshold":"5kB"}]}')})),a.register("1N35X",(function(e,t){"use strict";function n(e){this.message=e}n.prototype.toString=function(){return"Cancel"+(this.message?": "+this.message:"")},n.prototype.__CANCEL__=!0,e.exports=n})),a.register("cdbqI",(function(e,t){"use strict";var n=a("1N35X");function r(e){if("function"!=typeof e)throw new TypeError("executor must be a function.");var t;this.promise=new Promise((function(e){t=e}));var r=this;e((function(e){r.reason||(r.reason=new n(e),t(r.reason))}))}r.prototype.throwIfRequested=function(){if(this.reason)throw this.reason},r.source=function(){var e;return{token:new r((function(t){e=t})),cancel:e}},e.exports=r})),a.register("i4UJt",(function(e,t){"use strict";e.exports=function(e){return function(t){return e.apply(null,t)}}})),a.register("9yMNx",(function(e,t){"use strict";e.exports=function(e){return"object"==typeof e&&!0===e.isAxiosError}}));var o;o=a("4pmpg");var i={};Object.defineProperty(i,"__esModule",{value:!0});var s=["weeks","years","months","days","hours","minutes","seconds"],c=Object.freeze({years:0,months:0,weeks:0,days:0,hours:0,minutes:0,seconds:0}),u=i.pattern=new RegExp("P(?:(\\d+(?:[\\.,]\\d+)?W)|(\\d+(?:[\\.,]\\d+)?Y)?(\\d+(?:[\\.,]\\d+)?M)?(\\d+(?:[\\.,]\\d+)?D)?(?:T(\\d+(?:[\\.,]\\d+)?H)?(\\d+(?:[\\.,]\\d+)?M)?(\\d+(?:[\\.,]\\d+)?S)?)?)"),l=i.parse=function(e){return e.match(u).slice(1).reduce((function(e,t,n){return e[s[n]]=parseFloat(t)||0,e}),{})},p=i.end=function(e,t){e=Object.assign({},c,e);var n=t?t.getTime():Date.now(),r=new Date(n);return r.setFullYear(r.getFullYear()+e.years),r.setMonth(r.getMonth()+e.months),r.setDate(r.getDate()+e.days),r.setHours(r.getHours()+e.hours),r.setMinutes(r.getMinutes()+e.minutes),r.setMilliseconds(r.getMilliseconds()+1e3*e.seconds),r.setDate(r.getDate()+7*e.weeks),r},d=i.toSeconds=function(e,t){e=Object.assign({},c,e);var n=t?t.getTime():Date.now(),r=new Date(n);return(p(e,r).getTime()-r.getTime())/1e3};i.default={end:p,toSeconds:d,pattern:u,parse:l};const f="125446267595-noltpkn42520oq1sh4h6cnn41f135n1s.apps.googleusercontent.com",g="https://cloudflare-worker-token-service.audio-pwa.workers.dev/token",h="https://oauth2.googleapis.com/token";let m;var y;(y=m||(m={})).Instances="instances",y.CurrentInstance="current-instance";const v=async()=>{let t=(await e(o).get("https://api.invidious.io/instances.json")).data;return t=t.filter((e=>!e[0].includes(".onion")&&!e[0].includes(".i2p"))),t=t.filter((e=>e[1].cors)),localStorage.setItem(m.Instances,JSON.stringify(t)),t},w=async()=>{const e=localStorage.getItem(m.Instances);let t=[];t=e?JSON.parse(e):await v();const n=t[Math.floor(Math.random()*t.length)][1].uri;return localStorage.setItem(m.CurrentInstance,n),n},b=async()=>{let e=localStorage.getItem(m.CurrentInstance);return e||(e=await w()),e},x=async t=>{const n=`${await b()}/api/v1/videos/${t}`,r=(await e(o).get(n)).data;return{title:r.title,apiId:t,sources:[{source:`${r.dashUrl}?local=true`,type:"application/dash+xml"}],duration:r.lengthSeconds,views:r.viewCount,likes:r.likeCount,dislikes:r.dislikeCount,description:r.description,channelName:r.author,channelApiId:r.authorUrl.split("/").slice(-1)[0],recommendedVideos:r.recommendedVideos.map((e=>({title:e.title,apiId:e.videoId,images:e.videoThumbnails,duration:e.lengthSeconds,views:e.viewCount,channelName:e.author,channelApiId:e.authorId}))),uploadDate:new Date(1e3*r.published).toISOString()}},k=async t=>{let n=`${await b()}/api/v1/comments/${t.apiId}`;t.page&&(n=`${n}?continuation=${t.page.nextPage}`);const r=await e(o).get(n);return{comments:r.data.comments.map((e=>({apiId:e.commentId,videoCommentId:t.apiId,content:e.content,author:e.author,images:e.authorThumbnails,replyCount:e.replies?.replyCount,replyPage:e.replies?.continuation}))),page:{totalResults:r.data.commentCount||0,resultsPerPage:0,offset:0,nextPage:r.data.continuation}}};async function I(t){const n=`https://pipedapi.kavin.rocks/streams/${t}`,r=(await e(o).get(n)).data;return{title:r.title,apiId:t,sources:[{source:r.hls,type:"application/x-mpegURL"}],duration:r.duration,views:r.views,likes:r.likes,dislikes:r.dislikes,description:r.description,channelName:r.uploader,channelApiId:r.uploaderUrl.split("/").slice(-1)[0],uploadDate:new Date(r.uploadDate).toISOString(),recommendedVideos:r.relatedStreams.map((e=>({title:e.title,apiId:e.url.split("=").slice(-1)[0],images:[{url:e.thumbnail}],duration:e.duration,views:e.views,channelName:e.uploaderName,channelApiId:e.uploaderUrl.split("/").slice(-1)[0]})))}}const S=e(o).create(),P=()=>localStorage.getItem("apiKey")||"AIzaSyB3nKWm5VUqMMAaFhC3QCH_0VJU84Oyq48",T=(e,t)=>{localStorage.setItem("access_token",e),t&&localStorage.setItem("refresh_token",t)};S.interceptors.request.use((e=>{const t=localStorage.getItem("access_token");return t&&(e.headers.Authorization="Bearer "+t),e}),(e=>{Promise.reject(e)})),S.interceptors.response.use((e=>e),(async t=>{const n=t.config;if(401===t.response.status&&!n._retry){n._retry=!0;const t=await(async()=>{const t=localStorage.getItem("refresh_token");if(!t)return;const n=localStorage.getItem("clientId"),r=localStorage.getItem("clientSecret");let a=g;const i=new URLSearchParams;i.append("client_id",n||f),i.append("refresh_token",t),i.append("grant_type","refresh_token"),n&&r&&(i.append("client_secret",r),a=h);const s=await e(o).post(a,i,{headers:{"Content-Type":"application/x-www-form-urlencoded"}});return s.data.access_token?(T(s.data.access_token),s.data.access_token):void 0})();return S.defaults.headers.common.Authorization="Bearer "+t,S(n)}}));const j=e=>{application.postUiMessage(e)},E=async()=>{const e=localStorage.getItem("usePlayer");return!e||"true"===e};function O(e){return(e.items||[]).map((e=>({apiId:e.id,name:e.snippet?.title||"",images:[{width:e.snippet?.thumbnails?.default?.width||0,url:e.snippet?.thumbnails?.default?.url||"",height:e.snippet?.thumbnails?.default?.height||0}],isUserPlaylist:!0})))}function C(e){return(e.items||[]).map((e=>({apiId:e.id,duration:(0,i.toSeconds)((0,i.parse)(e.contentDetails?.duration||"0")),images:e.snippet?.thumbnails&&Object.values(e.snippet?.thumbnails).map((e=>({url:e.url||"",height:e.height||0,width:e.width||0}))),title:e.snippet?.title||""})))}async function R(e){const t=`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&key=${P()}`,n=await S.get(t);return{items:O(n.data),pageInfo:{totalResults:n.data.pageInfo?.totalResults||0,resultsPerPage:n.data.pageInfo?.resultsPerPage||0,offset:e.page?e.page.offset:0,nextPage:n.data.nextPageToken,prevPage:n.data.prevPageToken}}}async function N(t){let n=`https://www.googleapis.com/youtube/v3/search?part=id&type=video&maxResults=50&key=${P()}&q=${encodeURIComponent(t.query)}`;t.page&&(t.page.nextPage?n+=`&pageToken=${t.page.nextPage}`:t.page.prevPage&&(n+=`&pageToken=${t.page.prevPage}`));const r=await e(o).get(n),a=r.data.items?.map((e=>e.id?.videoId)).join(","),i=`https://www.googleapis.com/youtube/v3/videos?key=${P()}&part=snippet,contentDetails&id=${a}`;return{items:C((await e(o).get(i)).data),pageInfo:{totalResults:r.data.pageInfo?.totalResults||0,resultsPerPage:r.data.pageInfo?.resultsPerPage||0,offset:t.page?t.page.offset:0,nextPage:r.data.nextPageToken,prevPage:r.data.prevPageToken}}}async function U(t){let n=`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=50&key=${P()}&q=${encodeURIComponent(t.query)}`;const r=await e(o).get(n);return{items:(a=r.data,(a.items||[]).map((e=>({apiId:e.id?.channelId,name:e.snippet?.channelTitle||"",images:[{width:e.snippet?.thumbnails?.default?.width||0,url:e.snippet?.thumbnails?.default?.url||"",height:e.snippet?.thumbnails?.default?.height||0}]}))))};var a}async function A(t){let n=`https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&maxResults=50&key=${P()}&q=${encodeURIComponent(t.query)}`;t.page&&(t.page.nextPage?n+=`&pageToken=${t.page.nextPage}`:t.page.prevPage&&(n+=`&pageToken=${t.page.prevPage}`));const r=await e(o).get(n);var a;return{items:(a=r.data,(a.items||[]).map((e=>({apiId:e.id?.playlistId,name:e.snippet?.title||"",images:[{width:e.snippet?.thumbnails?.default?.width||0,url:e.snippet?.thumbnails?.default?.url||"",height:e.snippet?.thumbnails?.default?.height||0}]})))),pageInfo:{totalResults:r.data.pageInfo?.totalResults||0,resultsPerPage:r.data.pageInfo?.resultsPerPage||0,offset:t.page?t.page.offset:0,nextPage:r.data.nextPageToken,prevPage:r.data.prevPageToken}}}async function B(t){let n=`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&key=${P()}&playlistId=${t.apiId}`;t.isUserPlaylist&&(n+="&mine=true"),t.page&&(t.page.nextPage?n+=`&pageToken=${t.page.nextPage}`:t.page.prevPage&&(n+=`&pageToken=${t.page.prevPage}`));const r=t.isUserPlaylist?S:e(o),a=await r.get(n),i=a.data.items?.map((e=>e.contentDetails?.videoId)).join(","),s=`https://www.googleapis.com/youtube/v3/videos?key=${P()}&part=snippet,contentDetails&id=${i}`;return{items:C((await e(o).get(s)).data),pageInfo:{totalResults:a.data.pageInfo?.totalResults||0,resultsPerPage:a.data.pageInfo?.resultsPerPage||0,offset:t.page?t.page.offset:0,nextPage:a.data.nextPageToken,prevPage:a.data.prevPageToken}}}application.onUiMessage=async e=>{switch(e.type){case"check-login":const t=localStorage.getItem("access_token");t&&j({type:"login",accessToken:t}),await(async()=>{const e=document.location.host.split(".");e.shift();const t=e.join("."),n=`${document.location.protocol}//${t}`,r=await application.getPluginId(),a=localStorage.getItem("apiKey")??"",o=localStorage.getItem("clientId")??"",i=localStorage.getItem("clientSecret")??"",s=await E(),c=await b();j({type:"info",origin:n,pluginId:r,apiKey:a,clientId:o,clientSecret:i,usePlayer:s,instance:c})})();break;case"login":T(e.accessToken,e.refreshToken),application.onGetUserPlaylists=R;break;case"logout":localStorage.removeItem("access_token"),localStorage.removeItem("refresh_token"),application.onGetUserPlaylists=void 0;break;case"set-keys":localStorage.setItem("apiKey",e.apiKey),localStorage.setItem("clientId",e.clientId),localStorage.setItem("clientSecret",e.clientSecret),application.createNotification({message:"Api keys Saved!"});break;case"useplayer":localStorage.setItem("usePlayer",String(e.usePlayer));break;case"endvideo":application.endVideo();break;case"getinstnace":const n=await w();j({type:"sendinstance",instance:n})}},application.onSearchAll=async function(e){const t=N(e),n=A(e),r=U(e),[a,o,i]=await Promise.all([t,n,r]);return{videos:a,playlists:o,channels:i}},application.onSearchVideos=N,application.onSearchPlaylists=A,application.onSearchChannels=U,application.onGetChannelVideos=async function(t){const n=`https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails&id=${t.apiId}&key=${P()}`,r=(await e(o).get(n)).data.items,a=r&&r[0];if(a){const e=a.contentDetails?.relatedPlaylists?.uploads;return{items:(await B({apiId:e,isUserPlaylist:!1})).items}}return{items:[]}},application.onGetPlaylistVideos=B,application.onGetVideoComments=async function(e){return k(e)},application.onGetCommentReplies=async function(e){const t={apiId:e.videoApiId,page:e.page};return k(t)},application.onGetTopItems=async function(){const t=`https://www.googleapis.com/youtube/v3/videos?key=${P()}&videoCategoryId=10&chart=mostPopular&part=snippet,contentDetails`;return{videos:{items:C((await e(o).get(t)).data)}}},application.onUsePlayer=E,application.onGetVideo=async function(e){return await E()?x(e.apiId):I(e.apiId)};(async()=>{localStorage.getItem("access_token")&&(application.onGetUserPlaylists=R),await v()})()})();