(function(){
  var KEY='revyv-maintenance-v1';
  var boxes=[].slice.call(document.querySelectorAll('.chk input'));
  var nameEl=document.getElementById('m-name'), dateEl=document.getElementById('m-date'), notesEl=document.getElementById('m-notes');
  var barText=document.getElementById('bar-text'), barFill=document.getElementById('bar-fill');
  var note=document.getElementById('m-note'), skipped=document.getElementById('skipped');
  var send=document.getElementById('m-send'), reset=document.getElementById('m-reset');

  function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
  function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}}
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify({name:nameEl.value,date:dateEl.value,notes:notesEl.value,done:boxes.filter(function(b){return b.checked}).map(function(b){return b.dataset.id})}))}catch(e){}
  }
  function refresh(){
    var done=boxes.filter(function(b){return b.checked}).length;
    barText.textContent=done+' of '+boxes.length+' done';
    barFill.style.width=(done/boxes.length*100)+'%';
    [].forEach.call(document.querySelectorAll('.step'),function(s){
      var bs=s.querySelectorAll('.chk input'), d=s.querySelectorAll('.chk input:checked').length;
      s.querySelector('.step-count').textContent=d+' of '+bs.length;
      s.classList.toggle('done',d===bs.length);
    });
    var left=boxes.length-done;
    skipped.hidden=left===0;
    if(left) skipped.innerHTML='<b>'+left+' item'+(left===1?' is':'s are')+' not ticked.</b> You can still submit, and the unticked items will be listed in the report.';
  }

  var st=load();
  nameEl.value=st.name||''; dateEl.value=st.date||today(); notesEl.value=st.notes||'';
  (st.done||[]).forEach(function(id){var b=document.querySelector('.chk input[data-id="'+id+'"]');if(b)b.checked=true});
  refresh();

  boxes.forEach(function(b){b.addEventListener('change',function(){save();refresh()})});
  [nameEl,dateEl,notesEl].forEach(function(el){el.addEventListener('input',save)});

  function clearAll(){
    boxes.forEach(function(b){b.checked=false}); nameEl.value='';notesEl.value='';dateEl.value=today();
    try{localStorage.removeItem(KEY)}catch(e){}
    refresh();
  }
  // two taps to clear, so a stray tap can't wipe a half-finished checklist
  var armed=false,timer;
  reset.addEventListener('click',function(){
    if(!armed){armed=true;reset.textContent='Tap again to clear everything';timer=setTimeout(function(){armed=false;reset.textContent='Start a new checklist'},4000);return}
    clearTimeout(timer);armed=false;reset.textContent='Start a new checklist';clearAll();note.textContent='';note.className='form-note';scrollTo({top:0,behavior:'smooth'});
  });

  send.addEventListener('click',function(){
    if(!nameEl.value.trim()){note.textContent='Add your name at the top before submitting.';note.className='form-note warn';nameEl.focus();return}
    if(!dateEl.value){note.textContent='Add the date at the top before submitting.';note.className='form-note warn';dateEl.focus();return}
    var missed=boxes.filter(function(b){return !b.checked}).map(function(b){return 'Step '+b.dataset.step+': '+b.nextElementSibling.textContent});
    var done=boxes.length-missed.length;
    var data={
      _subject:'REVYV maintenance checklist: '+dateEl.value+' by '+nameEl.value.trim(),
      _cc:send.dataset.cc,_template:'table',
      Name:nameEl.value.trim(),Date:dateEl.value,
      Completed:done+' of '+boxes.length+' items',
      'Not ticked':missed.length?missed.join(' | '):'None',
      'Issues or notes':notesEl.value.trim()||'None'
    };
    send.disabled=true;note.textContent='Sending...';note.className='form-note';
    fetch(send.dataset.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)}).then(function(r){
      return r.json().catch(function(){throw 'The form service returned an unreadable reply (code '+r.status+').'});
    }).then(function(d){
      if(String(d.success)!=='true') throw (d.message||'The form service did not accept the submission.');
      clearAll();note.textContent='Submitted. Thank you, the checklist has been sent.';note.className='form-note ok';
    }).catch(function(why){
      var msg=typeof why==='string'?why:'The form service could not be reached.';
      note.textContent="That didn't send, and your ticks are still saved. "+msg;note.className='form-note warn';
    }).then(function(){send.disabled=false});
  });
})();
