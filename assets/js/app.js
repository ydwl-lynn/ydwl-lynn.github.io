var LazyLoad=(function(doc){var env,head,pending={},pollCount=0,queue={css:[],js:[]},styleSheets=doc.styleSheets;function createNode(name,attrs){var node=doc.createElement(name),attr;for(attr in attrs){if(attrs.hasOwnProperty(attr)){node.setAttribute(attr,attrs[attr])}}return node}function finish(type){var p=pending[type],callback,urls;if(p){callback=p.callback;urls=p.urls;urls.shift();pollCount=0;if(!urls.length){callback&&callback.call(p.context,p.obj);pending[type]=null;queue[type].length&&load(type)}}}function getEnv(){var ua=navigator.userAgent;env={async:doc.createElement("script").async===true};(env.webkit=/AppleWebKit\//.test(ua))||(env.ie=/MSIE|Trident/.test(ua))||(env.opera=/Opera/.test(ua))||(env.gecko=/Gecko\//.test(ua))||(env.unknown=true)}function load(type,urls,callback,obj,context){var _finish=function(){finish(type)},isCSS=type==="css",nodes=[],i,len,node,p,pendingUrls,url;env||getEnv();if(urls){urls=typeof urls==="string"?[urls]:urls.concat();if(isCSS||env.async||env.gecko||env.opera){queue[type].push({urls:urls,callback:callback,obj:obj,context:context})}else{for(i=0,len=urls.length;i<len;++i){queue[type].push({urls:[urls[i]],callback:i===len-1?callback:null,obj:obj,context:context})}}}if(pending[type]||!(p=pending[type]=queue[type].shift())){return}head||(head=doc.head||doc.getElementsByTagName("head")[0]);pendingUrls=p.urls.concat();for(i=0,len=pendingUrls.length;i<len;++i){url=pendingUrls[i];if(isCSS){node=env.gecko?createNode("style"):createNode("link",{href:url,rel:"stylesheet"})}else{node=createNode("script",{src:url});node.async=false}node.className="lazyload";node.setAttribute("charset","utf-8");if(env.ie&&!isCSS&&"onreadystatechange" in node&&!("draggable" in node)){node.onreadystatechange=function(){if(/loaded|complete/.test(node.readyState)){node.onreadystatechange=null;_finish()}}}else{if(isCSS&&(env.gecko||env.webkit)){if(env.webkit){p.urls[i]=node.href;pollWebKit()}else{node.innerHTML='@import "'+url+'";';pollGecko(node)}}else{node.onload=node.onerror=_finish}}nodes.push(node)}for(i=0,len=nodes.length;i<len;++i){head.appendChild(nodes[i])}}function pollGecko(node){var hasRules;try{hasRules=!!node.sheet.cssRules}catch(ex){pollCount+=1;if(pollCount<200){setTimeout(function(){pollGecko(node)},50)}else{hasRules&&finish("css")}return}finish("css")}function pollWebKit(){var css=pending.css,i;if(css){i=styleSheets.length;while(--i>=0){if(styleSheets[i].href===css.urls[0]){finish("css");break}}pollCount+=1;if(css){if(pollCount<200){setTimeout(pollWebKit,50)}else{finish("css")}}}}return{css:function(urls,callback,obj,context){load("css",urls,callback,obj,context)},js:function(urls,callback,obj,context){load("js",urls,callback,obj,context)}}})(window.document);

var lib = {
    mathjax: 'https://lib.baomitu.com/mathjax/2.7.9/MathJax.js',
    prism: '/assets/js/lib/prism.js'
};

var MathJaxLoaded = false;

window.MathJax = {
    extensions: ['tex2jax.js'],
    jax: ['input/TeX', 'output/SVG'],
    tex2jax: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"] ],
        processEscapes: true
    },
    TeX: {
        extensions: ['autoload-all.js']
    },
    showMathMenu: true,
    styles: {
        '.MathJax_SVG': {
            outline: 'none'
        }
    },
    SVG: {
        font: "TeX"
    }
};


function APP(){
    this.init();
}

APP.prototype.init = function(){
    var _this = this;
    window.addEventListener('DOMContentLoaded', function(){
        _this.highlight();
        _this.renderMath();
        _this.bindEventListener();
    });
}

APP.prototype.bindEventListener = function(){
    this.bindToTopEvent();
};

function toTop(){
    var top = document.documentElement.scrollTop || document.body.scrollTop;
    if(top < 10){
        document.documentElement.scrollTop = document.body.scrollTop = 0;
    }else{
        var targetTop = top * (9 / 10);
        document.documentElement.scrollTop = document.body.scrollTop = targetTop;
        requestAnimationFrame(toTop);
    }
}

APP.prototype.bindToTopEvent = function(){
    var elem = document.querySelector('.m-to-top');
    if(!elem){
        return;
    }
    elem.addEventListener('click', function(){
        requestAnimationFrame(toTop);
    });
};

APP.prototype.highlight = function(){
    let codeblocks = document.querySelectorAll('pre code');
    if(codeblocks.length == 0){
        return;
    }
    LazyLoad.js(lib.prism);
};


APP.prototype.renderMath = function(){
    var post = document.querySelector(".post")
    if (post == null) {
        return;
    }
    var content = post.innerText;
    var hasTex = (content.indexOf("\\(") != -1) || (content.indexOf("\\[") != -1);
    if (!hasTex) {
        return;
    }

    if (MathJaxLoaded) {
        MathJax.Hub.Queue(["Typeset", MathJax.Hub])
    }else{
        LazyLoad.js([lib.mathjax], function(){
            MathJaxLoaded = true;
            MathJax.Hub.Queue(["Typeset", MathJax.Hub])
        });
    }
};

window.lynn = new APP();
