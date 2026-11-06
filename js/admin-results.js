/* Admin-only student result viewer. Supabase RLS is the security boundary. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pageSize = 50;
  let page = 0;
  let currentRows = [];
  let hasNext = false;
  let users = new Map();
  let tests = new Map();
  let filteredUserIds = null;
  let authorized = false;
  const status = msg => { $('resultsStatus').textContent = msg; };
  const dateText = date => date ? new Date(date).toLocaleString('vi-VN') : '—';
  const studentName = id => {
    const p = users.get(id);
    return p?.full_name?.trim() || p?.email || id;
  };
  const displayTest = id => tests.get(id) || `Test ${id}`;
  function td(text) { const cell = document.createElement('td'); cell.textContent = String(text ?? '—'); return cell; }
  async function loadMetadata() {
    // Fetch profiles and tests in pages to avoid Supabase's default 1000-row limit.
    users = new Map(); tests = new Map();
    for (let from = 0;;from += 500) {
      const {data,error} = await db.from('profiles').select('id,full_name').order('id').range(from,from+499);
      if (error) throw error;
      for (const p of data) users.set(p.id,p);
      if (data.length < 500) break;
    }
    for (let from = 0;;from += 500) {
      const {data,error} = await db.from('tests').select('id,title').order('id').range(from,from+499);
      if (error) throw error;
      for (const t of data) tests.set(t.id,t.title);
      if (data.length < 500) break;
    }
    const sel = $('resultsTest'); const old = sel.value;
    sel.replaceChildren(new Option('Tất cả Test',''));
    for (const [id,title] of tests) sel.add(new Option(title,String(id)));
    sel.value = old;
  }
  async function loadResults() {
    if (!authorized) return;
    $('resultDetails').hidden = true;
    const tbody = $('resultsRows');tbody.replaceChildren();
    status('Đang tải kết quả...');
    $('resultsPrev').disabled = true;$('resultsNext').disabled = true;
    try {
      const queryText = $('resultsSearch').value.trim().toLocaleLowerCase('vi');
      filteredUserIds = queryText ? [...users].filter(([,p]) =>
        (p.full_name || '').toLocaleLowerCase('vi').includes(queryText)
      ).map(([id])=>id) : null;
      if (filteredUserIds && !filteredUserIds.length) {
        currentRows=[];hasNext=false;render();status('Không tìm thấy học viên phù hợp.');return;
      }
      let q = db.from('attempts').select('id,user_id,test_id,score,total,created_at')
        .order('created_at',{ascending:false}).order('id',{ascending:false});
      if ($('resultsTest').value) q=q.eq('test_id',Number($('resultsTest').value));
      if (filteredUserIds) q=q.in('user_id',filteredUserIds);
      const {data,error}=await q.range(page*pageSize,(page+1)*pageSize);
      if(error)throw error;
      hasNext=data.length>pageSize;currentRows=data.slice(0,pageSize);
      render();status(currentRows.length ? 'Chọn “Chi tiết” để xem từng câu trả lời.' : 'Chưa có lượt luyện tập phù hợp.');
    } catch (error) {currentRows=[];hasNext=false;render();status('Không đọc được kết quả: '+error.message+' (kiểm tra quyền Admin và RLS).');}
  }
  function render() {
    const tbody=$('resultsRows');tbody.replaceChildren();
    for (const r of currentRows) {
      const tr=document.createElement('tr');
      tr.append(td(studentName(r.user_id)),td(displayTest(r.test_id)),td(`${r.score}/${r.total} (${r.total?Math.round(100*r.score/r.total):0}%)`),td(dateText(r.created_at)));
      const cell=document.createElement('td'),button=document.createElement('button');
      button.type='button';button.textContent='Chi tiết';button.onclick=()=>openDetails(r);
      cell.append(button);tr.append(cell);tbody.append(tr);
    }
    $('resultsCount').textContent=String(currentRows.length);
    $('resultsAverage').textContent=currentRows.length?Math.round(currentRows.reduce((sum,r)=>sum+(r.total?r.score/r.total*100:0),0)/currentRows.length)+'%':'—';
    $('resultsPage').textContent='Trang '+(page+1);
    $('resultsPrev').disabled=page===0;$('resultsNext').disabled=!hasNext;
    $('resultsExport').disabled=!currentRows.length;
  }
  async function openDetails(row) {
    $('resultDetails').hidden=false;
    $('resultDetailTitle').textContent=`Chi tiết bài #${row.id}`;
    $('resultDetailInfo').textContent=`${studentName(row.user_id)} · ${displayTest(row.test_id)} · ${row.score}/${row.total} · ${dateText(row.created_at)}`;
    $('resultDetailRows').replaceChildren();$('resultDetailStatus').textContent='Đang tải câu trả lời...';
    try {
      let answers=[];
      for(let from=0;;from+=500){
        const {data,error}=await db.from('attempt_answers').select('id,vocabulary_id,submitted_english,submitted_vietnamese,is_correct').eq('attempt_id',row.id).order('id').range(from,from+499);
        if(error)throw error;answers.push(...data);if(data.length<500)break;
      }
      const wordMap=new Map();const ids=[...new Set(answers.map(a=>a.vocabulary_id))];
      for(let i=0;i<ids.length;i+=200){
        const {data,error}=await db.from('vocabulary').select('id,english,vietnamese').in('id',ids.slice(i,i+200));
        if(error)throw error;for(const w of data)wordMap.set(w.id,w);
      }
      for(const a of answers){
        const w=wordMap.get(a.vocabulary_id);
        const tr=document.createElement('tr');
        tr.append(td(w?.english||`Từ #${a.vocabulary_id}`),td(w?.vietnamese||'Không còn từ vựng'),td(`Anh: ${a.submitted_english||'—'} | Việt: ${a.submitted_vietnamese||'—'}`));
        const outcome=td(a.is_correct?'Đúng cả hai':'Chưa đúng cả hai');outcome.className=a.is_correct?'result-good':'result-bad';tr.append(outcome);
        $('resultDetailRows').append(tr);
      }
      $('resultDetailStatus').textContent=answers.length?`Có ${answers.length} câu trả lời.`:'Bài làm này chưa lưu được chi tiết câu trả lời.';
    } catch(error){$('resultDetailStatus').textContent='Không đọc được chi tiết: '+error.message;}
    $('resultDetails').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function exportCsv() {
    if(!currentRows.length)return;
    const cols=['Học viên','Test','Điểm','Tổng số','Thời gian'];
    const lines=[cols,...currentRows.map(r=>[studentName(r.user_id),displayTest(r.test_id),r.score,r.total,dateText(r.created_at)])];
    const csv='\uFEFF'+lines.map(line=>line.map(value=>{const raw=String(value??'');const safe=/^[=+@\-\t\r]/.test(raw)?'\''+raw:raw;return '"'+safe.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download=`toeic-ket-qua-trang-${page+1}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  async function start() {
    try {
      const {data:{user},error}=await db.auth.getUser();if(error||!user)return;
      const {data:profile,error:roleError}=await db.from('profiles').select('role').eq('id',user.id).single();
      if(roleError||profile?.role!=='admin')return;
      authorized=true;await loadMetadata();await loadResults();
    }catch(error){status('Không thể khởi tạo mục kết quả: '+error.message);}
  }
  $('resultsFilter').onclick=()=>{page=0;loadResults();};
  $('resultsSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();page=0;loadResults();}});
  $('resultsTest').onchange=()=>{page=0;loadResults();};
  $('resultsPrev').onclick=()=>{if(page>0){page--;loadResults();}};
  $('resultsNext').onclick=()=>{if(hasNext){page++;loadResults();}};
  $('resultsExport').onclick=exportCsv;
  $('closeResultDetails').onclick=()=>{$('resultDetails').hidden=true;};
  start();
})();
