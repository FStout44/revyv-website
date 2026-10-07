(function(){
  var root=document.documentElement;
  var still=/[?&]still\b/.test(location.search);
  var reduce=still||matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce) root.classList.add('js');

  // scroll text: split into words that light up as you scroll
  var texts=[].map.call(document.querySelectorAll('[data-scrolltext]'),function(el){
    var words=el.textContent.trim().split(/\s+/);
    el.innerHTML=words.map(function(w){return '<span class="w'+(reduce?' on':'')+'">'+w+'</span>'}).join(' ');
    return {el:el,spans:el.querySelectorAll('.w')};
  });

  // reveal on enter
  if(!reduce&&'IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});
    },{threshold:.18,rootMargin:'0px 0px -6% 0px'});
    document.querySelectorAll('.reveal,.slide-l').forEach(function(el){io.observe(el)});
  }

  // room: the pinned photo follows your scroll, cycling through each block's photos
  var media=document.querySelectorAll('.room-media img');
  var mods=[].map.call(document.querySelectorAll('.mod'),function(m){return {el:m,n:+m.dataset.n,ticks:m.querySelectorAll('.ticks i')}});
  var start=0; mods.forEach(function(m){m.start=start;start+=m.n});
  var shown=-1;
  function room(vh){
    var c=vh/2;
    for(var i=0;i<mods.length;i++){
      var m=mods[i], r=m.el.getBoundingClientRect();
      if(r.top>c||r.bottom<=c) continue;
      var k=Math.min(m.n-1,Math.floor((c-r.top)/r.height*m.n));
      if(m.start+k===shown) return;
      shown=m.start+k;
      media.forEach(function(img,j){img.classList.toggle('on',j===shown)});
      for(var t=0;t<m.ticks.length;t++) m.ticks[t].classList.toggle('on',t<=k);
      return;
    }
  }

  // gallery: vertical scroll drives a horizontal track on larger screens
  var gal=document.getElementById('gallery'), track=document.getElementById('track');
  var pinOK=matchMedia('(min-width: 901px)');
  function setPin(){gal.classList.toggle('pin',pinOK.matches&&!reduce); if(!gal.classList.contains('pin')) track.style.transform=''}
  if(gal){setPin(); pinOK.addEventListener('change',setPin)}

  var nav=document.getElementById('nav');
  var par=document.querySelectorAll('[data-parallax]');
  var ticking=false;
  function frame(){
    ticking=false;
    var y=scrollY, vh=innerHeight;
    nav.classList.toggle('solid',y>60);
    room(vh);
    if(reduce) return;

    par.forEach(function(el){
      var r=el.parentElement.getBoundingClientRect();
      if(r.bottom<0||r.top>vh) return;
      var mid=r.top+r.height/2-vh/2;
      el.style.transform='translate3d(0,'+(-mid*parseFloat(el.dataset.parallax)).toFixed(1)+'px,0)';
    });

    texts.forEach(function(t){
      var sr=t.el.getBoundingClientRect();
      if(sr.bottom<-vh||sr.top>vh*2) return;
      var p=(vh*.85-sr.top)/(sr.height+vh*.4);
      var n=Math.round(Math.max(0,Math.min(1,p))*t.spans.length);
      for(var i=0;i<t.spans.length;i++) t.spans[i].classList.toggle('on',i<n);
    });

    if(gal&&gal.classList.contains('pin')){
      var gr=gal.getBoundingClientRect();
      var gp=Math.max(0,Math.min(1,-gr.top/(gr.height-vh)));
      var max=track.scrollWidth-innerWidth;
      track.style.transform='translate3d('+(-gp*max).toFixed(1)+'px,0,0)';
    }
  }
  function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(frame)}}
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll);
  frame();

  // contact form: posts to the address in data-endpoint; until one is set, it says so and sends nothing
  var form=document.getElementById('partner-form');
  if(form){
    var note=document.getElementById('form-note');
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var url=form.dataset.endpoint;
      if(!url){note.textContent="This form isn't connected yet, so nothing was sent.";note.className='form-note warn';return}
      var btn=form.querySelector('button');btn.disabled=true;note.textContent='Sending...';note.className='form-note';
      if(!form.reportValidity()){note.textContent='';btn.disabled=false;return}
      var data={};new FormData(form).forEach(function(v,k){data[k]=v});
      fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)}).then(function(r){
        return r.json().catch(function(){throw 'The form service returned an unreadable reply (code '+r.status+').'});
      }).then(function(d){
        if(String(d.success)!=='true') throw (d.message||'The form service did not accept the submission.');
        form.reset();note.textContent="Thanks. We've got your details and will be in touch to set up a call.";note.className='form-note ok';
      }).catch(function(why){
        var msg=typeof why==='string'?why:'The form service could not be reached.';
        note.textContent=/activat/i.test(msg)?"This form is waiting to be switched on. An activation email has been sent to the site owner.":"That didn't send. "+msg;note.className='form-note warn';
      }).then(function(){btn.disabled=false});
    });
  }
  if(still) root.dataset.sw=root.scrollWidth+'/'+innerWidth;
})();
