// Phase 2: browser-only practice. Results are NOT persisted to Supabase yet.
(async()=>{
 const user=await requireLogin();if(!user)return;
 const progress=document.getElementById('progress');
 let selection;try{selection=JSON.parse(sessionStorage.getItem('toeic_selection')||'null');}catch{}
 if(!selection||!Array.isArray(selection.ids)||!selection.ids.length){progress.textContent='Bạn chưa chọn Test. Quay lại trang chọn Test.';return;}
 const ids=selection.ids.filter(id=>Number.isSafeInteger(id)&&id>0).slice(0,100);
 if(!ids.length){progress.textContent='Danh sách Test không hợp lệ.';return;}
 const {data:tests,error:testError}=await supabaseClient.from('tests').select('id,title').in('id',ids).eq('is_active',true);
 if(testError){progress.textContent=testError.message;return;}
 const validIds=tests.map(t=>t.id);
 if(!validIds.length){progress.textContent='Không tìm thấy Test đang hoạt động.';return;}
 const names=new Map(tests.map(t=>[t.id,t.title]));
 // Paginate to avoid the default Supabase 1000-row cap.
 let words=[];
 for(let from=0;;from+=500){
   const {data,error}=await supabaseClient.from('vocabulary').select('id,test_id,english,vietnamese,pronunciation').in('test_id',validIds).order('id').range(from,from+499);
   if(error){progress.textContent=error.message;return;}
   words.push(...data);if(data.length<500)break;
 }
 if(!words.length){progress.textContent='Các Test này chưa có từ vựng. Admin cần thêm từ trước.';return;}
 if(selection.mode==='random'){
   for(let i=words.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[words[i],words[j]]=[words[j],words[i]];}
 }else{
   const rank=new Map(ids.map((id,i)=>[id,i]));words.sort((a,b)=>(rank.get(a.test_id)??999)-(rank.get(b.test_id)??999)||a.id-b.id);
 }
 let index=0,englishCorrect=0,vietnameseCorrect=0;
 const exercise=document.getElementById('exercise'),form=document.getElementById('answerForm'),feedback=document.getElementById('feedback'),next=document.getElementById('next');
 exercise.hidden=false;
 const normalize=s=>s.normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ').replace(/[.!?]+$/g,'');
 const speak=()=>{if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(words[index].english);u.lang='en-US';u.rate=.85;window.speechSynthesis.speak(u);};
 document.getElementById('speak').onclick=speak;
 function render(){
   progress.textContent=`Từ ${index+1}/${words.length} · Đúng tiếng Anh: ${englishCorrect} · Đúng nghĩa: ${vietnameseCorrect}`;
   document.getElementById('testName').textContent=names.get(words[index].test_id)||'Test';
   form.reset();feedback.replaceChildren();form.hidden=false;next.hidden=true;
   document.getElementById('answerEnglish').focus();
 }
 form.onsubmit=e=>{
   e.preventDefault();const word=words[index];
   const en=normalize(document.getElementById('answerEnglish').value)===normalize(word.english);
   // Accept alternatives separated by semicolons; commas remain part of the answer.
   const vi=word.vietnamese.split(';').some(v=>normalize(document.getElementById('answerVietnamese').value)===normalize(v));
   if(en)englishCorrect++;if(vi)vietnameseCorrect++;
   feedback.replaceChildren();const p=document.createElement('p');p.textContent=`Tiếng Anh: ${en?'✓ Đúng':'✗ Sai'} · Nghĩa: ${vi?'✓ Đúng':'✗ Sai'}`;
   const answer=document.createElement('p');answer.textContent=`Đáp án: ${word.english} — ${word.vietnamese}${word.pronunciation?' '+word.pronunciation:''}`;
   feedback.append(p,answer);form.hidden=true;next.hidden=false;next.textContent=index===words.length-1?'Xem kết quả':'Từ tiếp theo →';
 };
 next.onclick=()=>{
   index++;if(index<words.length){render();return;}
   exercise.hidden=true;progress.textContent='Đã hoàn thành!';const result=document.getElementById('results');result.hidden=false;
   const h=document.createElement('h2');h.textContent='Kết quả luyện tập';
   const p=document.createElement('p');p.textContent=`Tổng ${words.length} từ · Tiếng Anh đúng ${englishCorrect}/${words.length} · Nghĩa đúng ${vietnameseCorrect}/${words.length}`;
   const note=document.createElement('p');note.textContent='Phiên bản này chưa lưu điểm vào tài khoản; phần lưu lịch sử sẽ được bổ sung sau.';
   const a=document.createElement('a');a.href='dashboard.html';a.textContent='← Chọn Test khác';result.append(h,p,note,a);
 };
 render();
})();