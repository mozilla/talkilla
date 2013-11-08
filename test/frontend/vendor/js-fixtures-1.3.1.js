"use strict";
(function(fixtures){
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        // NodeJS
        module.exports = fixtures;
    } else if (typeof define === 'function' && define.amd){
        define(function(){
            return fixtures;
        });
    } else{
        var global = (false || eval)('this');
        global.fixtures = fixtures;
    }

}(new function(){
        var fixturesCache = {};
        var self = this;

        self.containerId = 'js-fixtures';
        self.path = 'spec/javascripts/fixtures';
        self.window = function(){
            var iframe = document.getElementById(self.containerId);
            if (!iframe) return null;

            return iframe.contentWindow || iframe.contentDocument; 
        };
        self.body = function(){
            if (!self.window()) return null;

            var content = self.window().document.body.innerHTML;
            return content; 
        };
        self.load = function(html, cb){
            addToContainer(self.read.apply(self, [html]), cb);
        };
        self.set = function(html){
            addToContainer(html);
        };
        self.cache = function(){
            self.read.apply(self, arguments);
        };
        self.sandbox = function(obj){
            addToContainer(objToHTML(obj));
        };
        self.read = function(){
            var htmlChunks = [];

            var fixtureUrls = arguments;
            for (var urlCount = fixtureUrls.length, urlIndex = 0; urlIndex < urlCount; urlIndex++){
                htmlChunks.push(getFixtureHtml(fixtureUrls[urlIndex]));
            }
            return htmlChunks.join('');
        };
        self.clearCache = function(){
            fixturesCache = {};
        };
        self.cleanUp = function(){
            var iframe = document.getElementById(self.containerId);
            if(!iframe) return null;

            iframe.parentNode.removeChild(iframe);
        };
        var createContainer  = function(html, cb){

            var iframe = document.createElement('iframe');
            iframe.setAttribute('id', self.containerId);
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            var doc = iframe.contentWindow || iframe.contentDocument;
            doc = doc.document ? doc.document : doc;

            if (cb)
              iframe.contentWindow.onload = function() { cb(); };
            doc.open();
            doc.write(html);
            doc.close();
        };
        var addToContainer = function(html, cb){
            var container = document.getElementById(self.containerId);
            if (!container){
                createContainer(html, cb);
            } else{
                var iframeWindow = container.contentWindow || container.contentDocument;
                iframeWindow.document.body.innerHTML += html;
            }
        };
        var getFixtureHtml = function(url){
            if (typeof fixturesCache[url] === 'undefined'){
                loadFixtureIntoCache(url);
            }
            return fixturesCache[url];
        };
        var loadFixtureIntoCache = function(relativeUrl){
            var url = makeFixtureUrl(relativeUrl);
            var request = new XMLHttpRequest();
            request.open('GET', url + '?' + new Date().getTime(), false);
            request.send(null);
            fixturesCache[relativeUrl] = request.responseText;
        };
        var makeFixtureUrl = function(relativeUrl){
            return self.path.match('/$') ? self.path + relativeUrl : self.path + '/' + relativeUrl;
        };
        var objToHTML = function(obj){
            var divElem = document.createElement('div'); 
            for (var key in obj){
                // IE < 9 compatibility 
                if (key === 'class'){
                    divElem.className = obj[key];
                    continue;
                }
                divElem.setAttribute(key, obj[key]);
            }
            return divElem.outerHTML;
        };
    }
));
