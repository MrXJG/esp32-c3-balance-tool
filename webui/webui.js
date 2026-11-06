
const $ = id => document.getElementById(id);
let S = {valid:0,k:0,rpm:0,amp:0,phase:0,gram:-1,pos:0,rev:0,range:8,liven:0};
let target = 0, cur = 0, started = false;
let calV0 = null, calStep = 0, calK = {sens:0,delta:0,kx:0,ky:0,kz:0}, calErr = '';

/* ---------------- 入口页（每次打开都显示，点按钮进入，不做持久记忆） ---------------- */
function enterBalancer(){
  const ov = $('splashOverlay');
  if(ov) ov.classList.add('hide');
}

/* ---------------- 轮询 ---------------- */
let pollBusy = false;
async function poll(){
  if(pollBusy) return; pollBusy = true;
  try{
    const r = await fetch('/api/state',{cache:'no-store'});
    S = await r.json();
    $('dot').className = 'dot on';
    $('ssid').textContent = '在线';
  }catch(e){
    $('dot').className = 'dot off';
    $('ssid').textContent = '离线';
  }
  render();
  pollBusy = false;
}
setInterval(poll, 200);
poll();

/* ---------------- 渲染 ---------------- */
function render(){
  const v = !!S.valid;
  const tr = !!S.turning;   // TCRT 独立判定的"在转"
  if(S.mpu === 0){
    $('ssid').textContent = 'MPU 离线';
    $('dot').className = 'dot off';
  }
  $('rpm').textContent = tr ? Math.round(S.rpm) : '0';
  $('amp').textContent = v ? Number(S.amp).toFixed(2) : '0.00';

  const hasK = S.k === 1;
  $('gram').textContent = (v && hasK) ? Number(S.gram).toFixed(1) : '--';

  /* 直接显示需要贴多少克（不按平衡块规格拆分） */
  const recEl = $('rec');
  if(v && hasK && S.gram >= 0){
    recEl.style.display = 'block';
    recEl.innerHTML = '需要贴 <b>'+Number(S.gram).toFixed(1)+'g</b><br>贴到建议位置 '+ Math.round(S.pos) + '°';
  }else{
    recEl.style.display = 'none';
  }

  if(v && hasK){
    target = Number(S.pos);
    $('deg').textContent = Math.round(S.pos) + '°';
    $('degu').textContent = '建议配重位置';
    $('hint').textContent = '从标记处沿轮子转动方向量 ' + Math.round(S.pos) + '°';
  }else if(v){
    target = Number(S.phase);
    $('deg').textContent = Math.round(S.phase) + '°';
    $('degu').textContent = '振动相位（未标定）';
    $('hint').textContent = '点「标定」完成一次试重即可给出配重';
  }else{
    target = 0;
    $('deg').textContent = '--';
    $('degu').textContent = tr ? '正在转…（等 MPU 出角度）' : '转起来…';
    $('hint').textContent = tr ? '转速依赖 MPU 才能出角度' : '转速建议 150 ~ 500 rpm';
  }

  const rev = tr ? (S.rev || 0) : 0;
  $('revs').textContent = rev + ' 圈';
  $('prog').style.width = Math.min(100, rev/40*100) + '%';
  const liveN = S.liven || 0;
  $('stab').textContent = !tr ? '等待转动…' : (!v ? '正在转…（等 MPU 出角度）'
    : (liveN >= 8 ? '8 圈平均 · 数据稳定 ✓' : '多圈平均中（' + liveN + '/8 圈）'));

  $('fwv').textContent = S.fw || '-';
  if($('otafw')) $('otafw').textContent = S.fw ? 'V' + S.fw : '-';
  if($('fwTop')) $('fwTop').textContent = S.fw ? 'V' + S.fw : '';
  $('kst').textContent = hasK ? '已标定 ✓' : '未标定';
  $('kst').className = hasK ? 'good' : 'bad';
  $('trst').textContent = hasK ? '已试重 ✓' : '未试重';
  $('trst').className = hasK ? 'good' : 'bad';
  $('ipv').textContent = location.host;
  $('heapv').textContent = ((S.heap||0)/1024).toFixed(0) + ' KB';
  $('upv').textContent = Math.floor((S.up||0)/60) + ' 分 ' + ((S.up||0)%60) + ' 秒';
  $('swInv').className = 'switch' + (S.inv ? ' on' : '');
  $('swInv').setAttribute('data-on', S.inv ? 1 : 0);
  $('e0').style.background = S.edge===0 ? '#4c3b20' : '#20251f';
  $('e1').style.background = S.edge===1 ? '#4c3b20' : '#20251f';
  $('r8').style.background = (S.range||8)===8 ? '#4c3b20' : '#20251f';
  $('r4').style.background = (S.range||8)===4 ? '#4c3b20' : '#20251f';
  $('sc12').style.background = (S.screws||12)===12 ? '#4c3b20' : '#20251f';
  $('sc10').style.background = (S.screws||12)===10 ? '#4c3b20' : '#20251f';
  if($('calLiveRpm')) $('calLiveRpm').textContent = (S.turning ? Math.round(S.rpm) : 0) + ' rpm';
}

/* ---------------- 仪表盘 ---------------- */
const cvs = $('g'), ctx = cvs.getContext('2d');
let W = 300, H = 300, DPR = 1;

function resize(){
  const box = cvs.parentElement.getBoundingClientRect();
  W = box.width; H = box.height;
  DPR = window.devicePixelRatio || 1;
  cvs.width = W*DPR; cvs.height = H*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', resize);

const RAD = Math.PI/180;
function pt(cx, cy, r, deg){ return [cx + r*Math.sin(deg*RAD), cy - r*Math.cos(deg*RAD)]; }

function draw(){
  if(!W) resize();
  const c = W/2, R = c - 4, inner = R - 16;
  ctx.clearRect(0,0,W,H);

  ctx.beginPath(); ctx.arc(c,c,R,0,Math.PI*2); ctx.fillStyle='#20251f'; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = '#3b433a'; ctx.stroke();

  /* 外圈边盖螺丝：第 1 颗在 0°，其余顺时针均分；0° 那颗青色标出，方便数螺丝找位置 */
  const nScrew = (S && (S.screws === 10 || S.screws === 12)) ? S.screws : 12;
  for(let i=0; i<nScrew; i++){
    const d = i * 360 / nScrew;
    const p = pt(c,c,R-8,d);
    const first = (i === 0);
    ctx.beginPath(); ctx.arc(p[0],p[1], first ? 5.5 : 4.5, 0, Math.PI*2);
    ctx.fillStyle = first ? '#d6a34a' : '#303a31'; ctx.fill();
    ctx.lineWidth = first ? 2 : 1.5; ctx.strokeStyle = first ? '#f4d18a' : '#879486'; ctx.stroke();
    ctx.beginPath(); ctx.arc(p[0],p[1],1.2,0,Math.PI*2);
    ctx.fillStyle = first ? '#17130a' : '#879486'; ctx.fill();
  }

  /* 外圈刻度 */
  for(let d=0; d<360; d+=5){
    const major = (d % 30 === 0);
    const len = major ? 11 : 5;
    const p1 = pt(c,c,inner,d), p2 = pt(c,c,inner-len,d);
    ctx.beginPath(); ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]);
    ctx.lineWidth = major ? 2 : 1;
    ctx.strokeStyle = major ? '#879486' : '#455044';
    ctx.stroke();
  }
  /* 角度数字 */
  ctx.font = '600 12px system-ui,sans-serif';
  ctx.fillStyle = '#a5aa9e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(let d=0; d<360; d+=90){
    const p = pt(c,c,inner-30,d);
    ctx.fillText(d + '°', p[0], p[1]);
  }

  /* 指针(动画) */
  let delta = ((target - cur + 540) % 360) - 180;
  if(!started){ cur = target; started = true; }
  cur = (cur + delta*0.18 + 360) % 360;

  const needOn = S.valid;
  const tip = pt(c,c,inner-24,cur);
  ctx.save();
  ctx.strokeStyle = needOn ? '#d6a34a' : '#596357';
  ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = needOn ? 14 : 0;
  ctx.beginPath(); ctx.moveTo(c,c); ctx.lineTo(tip[0],tip[1]); ctx.stroke();
  ctx.restore();

  /* 针尖圆点 */
  ctx.beginPath(); ctx.arc(tip[0],tip[1],4,0,Math.PI*2);
  ctx.fillStyle = needOn ? '#d6a34a' : '#596357'; ctx.fill();

  /* 中心 */
  ctx.beginPath(); ctx.arc(c,c,9,0,Math.PI*2); ctx.fillStyle='#171b17'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#596357'; ctx.stroke();
  ctx.beginPath(); ctx.arc(c,c,3,0,Math.PI*2); ctx.fillStyle='#d6a34a'; ctx.fill();
}
resize();
(function loop(){ draw(); requestAnimationFrame(loop); })();

/* ---------------- 操作 ---------------- */
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on');
  clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('on'), 1800); }

async function doZero(){
  await fetch('/api/zero',{method:'POST'});
  toast('已清零，重新采集');
}
async function restart(){
  if(!confirm('确定重启设备？')) return;
  await fetch('/api/restart',{method:'POST'}); toast('正在重启…');
}
async function clearAll(){
  if(!confirm('清理全部？将清除标定数据、试重数据和历史记录。')) return;
  await fetch('/api/cal/clear',{method:'POST'});
  localStorage.removeItem('wb_hist');
  calV0 = null; calK = null; calStep = 0;
  if(S){ S.k = 0; }
  renderHist();
  poll();
  toast('已清理全部'); closeAll();
}
async function toggleInv(){
  const now = $('swInv').getAttribute('data-on') === '1' ? 1 : 0;
  const next = now ? 0 : 1;
  await fetch('/api/settings?inv='+next,{method:'POST'});
  $('swInv').className = 'switch' + (next ? ' on' : '');
  $('swInv').setAttribute('data-on', next);
  toast(next ? '角度已反向' : '角度已恢复');
}
async function setEdge(e){
  await fetch('/api/settings?edge='+e,{method:'POST'});
  toast('触发边沿已切换');
}
async function setRange(r){
  await fetch('/api/settings?range='+r,{method:'POST'});
  toast('量程已切换为 ±'+r+'g');
  poll();
}
async function setScrews(n){
  await fetch('/api/settings?screws='+n,{method:'POST'});
  toast('边盖螺丝数已改为 '+n+' 颗，角度表外圈跟着变');
  poll();
}

/* ---------------- 标定 ---------------- */
function openCal(){ calStep = 0; renderCal(); open('sheetCal'); }
function openSet(){ closeAll(); open('sheetSet'); }
function open(id){ $('mask').classList.add('open'); $(id).classList.add('open'); }
function closeAll(){
  $('mask').classList.remove('open');
  ['sheetCal','sheetSet','sheetDiag','sheetOTA','sheetHist'].forEach(i=>$(i).classList.remove('open'));
  stopDiag();
}

/* ---------------- 固件升级（OTA） ---------------- */
function openOTA(){ closeAll(); open('sheetOTA'); }
function otaFileChanged(){
  const f = $('otafile').files[0];
  $('otafilename').textContent = f ? ('已选择：' + f.name + '（' + (f.size/1024).toFixed(0) + ' KB）') : '未选择文件';
  $('otastatus').textContent = f ? '已选择文件，点“开始升级”' : '未开始';
  $('otaprog').style.width = '0%'; $('otapct').textContent = '';
}
function doOTA(){
  const f = $('otafile').files[0];
  if(!f){ toast('请先选择固件文件'); return; }
  if(!/\.bin$/i.test(f.name) || /merged/i.test(f.name)){ toast('只能刷入升级包'); return; }
  if(!confirm('确定上传 ' + f.name + ' 升级？升级中不要断电、不要离开热点。')) return;
  const fd = new FormData();
  fd.append('firmware', f);
  const x = new XMLHttpRequest();
  x.open('POST', '/api/update', true);
  x.upload.onprogress = e => {
    if(e.lengthComputable){
      const pc = Math.round(e.loaded / e.total * 100);
      $('otaprog').style.width = pc + '%';
      $('otapct').textContent = pc + '%';
      $('otastatus').textContent = '上传中…';
    }
  };
  x.onload = () => {
    try{
      const j = JSON.parse(x.responseText);
      if(j.ok){
        $('otastatus').textContent = '上传成功，设备正在重启…';
        toast('升级成功，设备正在重启');
        setTimeout(()=>location.reload(), 5000);
      }else{
        const why = {busy:'正在采集中，请先停下再升级',
          merged:'只能刷入升级包', begin:'只能刷入升级包',
          write:'写入失败', end:'校验失败，旧固件未被替换', abort:'上传被中断', none:'未知错误'}[j.err] || ('失败：' + (j.err||''));
        $('otastatus').textContent = '升级失败：' + why;
        toast('升级失败：' + why);
      }
    }catch(e){
      $('otastatus').textContent = '升级失败：设备无应答';
      toast('升级失败：设备无应答');
    }
  };
  x.onerror = () => { $('otastatus').textContent = '上传失败：网络中断'; toast('上传失败：网络中断'); };
  x.send(fd);
}

/* ---------------- 故障诊断 ---------------- */
let diagTimer = null;
function stopDiag(){ if(diagTimer){ clearInterval(diagTimer); diagTimer=null; } }
function openDiag(){ closeAll(); open('sheetDiag'); diagRun(); stopDiag(); diagTimer = setInterval(diagRun, 1000); }
function diagRun(){
  const b = $('diagBody');
  fetch('/api/diag').then(r=>r.json()).then(d=>{
    const who = d.who;
    const mpuOk = !!d.mpu, sig = !!d.sig;
    const ax=d.ax, ay=d.ay, az=d.az, g=d.g, vib=d.vib, vibms=d.vibms;
    const ticks=d.ticks, tick5s=d.tick5s, tcrt=d.tcrt, edge=d.edge;
    const rpm=d.rpm, valid=!!d.valid, rev=d.rev;
    const minax=d.minax, maxax=d.maxax, minay=d.minay, maxay=d.maxay, minaz=d.minaz, maxaz=d.maxaz;
    const peakg=d.peakg||0, dsamples=d.dsamples||0, dsat=d.dsat||0, advice=d.advice||0;
    const rssi=d.rssi, heap=d.heap, up=d.up;
    const range=d.range||8, rangesw=d.rangesw||0, capactive=!!d.capactive;

    // MPU 状态
    let mpuTxt, mpuCls;
    if (sig) { mpuTxt='在线，信号正常'; mpuCls='on'; }
    else if (mpuOk){ mpuTxt='在线但数据停更（查接线/供电）'; mpuCls='off'; }
    else { mpuTxt='未检测到！查 VCC/GND/SDA=GPIO4/SCL=GPIO3 或换 MPU6050'; mpuCls='off'; }

    // TCRT 状态
    let tcrtTxt, tcrtCls;
    if (tick5s>0){ tcrtTxt='正常：最近5秒 '+tick5s+' 脉冲（电平='+tcrt+'）'; tcrtCls='on'; }
    else if (rpm>0){ tcrtTxt='正常：'+rpm+' rpm'; tcrtCls='on'; }
    else { tcrtTxt='无脉冲：电平='+tcrt+'，共 '+ticks+' 个。查 GPIO6 信号/对焦/反光标记'; tcrtCls='off'; }

    // 模块倾斜估计：仅在轴水平、静止时有效。理想安装时模块法线水平，静止 az≈0；
    // 倾斜 θ 时 |az| ≈ sinθ·g。转动中不计算。
    let tiltTxt = '转动中，倾斜估计不可用';
    if(!(rpm>0) && g>0.8 && g<1.2){
      const th = Math.asin(Math.min(1, Math.abs(az)/g)) * 180/Math.PI;
      tiltTxt = '约 ' + th.toFixed(0) + '°' + (th>12 ? '（偏大，建议调平支架；v1.6.4 三轴标定已将其计入，但标定后请勿移动模块）' : '（在容忍范围内）');
    }

    // 整机结论
    let sumTxt, sumCls;
    if (sig && tick5s>0){ sumTxt='两传感器正常，正在转'; sumCls='on'; }
    else if (sig){ sumTxt='MPU 正常，TCRT 无信号：转动轮子让反光标记过红外头'; sumCls='off'; }
    else { sumTxt='MPU 无信号，先修 MPU（振动值才出得来）'; sumCls='off'; }

    b.innerHTML =
      '<div class="diag-row"><i class="dot '+sumCls+'"></i><b>整机结论：'+sumTxt+'</b></div>'
      +'<div class="diag-row"><i class="dot '+mpuCls+'"></i><span>MPU6050：'+mpuTxt+'（地址 0x'+((d.addr||0).toString(16))+'，WHO=0x'+who.toString(16)+'）</span></div>'
      +'<div class="live">'
      +'<div class="lv"><span>原始振动</span><b>'+vibms.toFixed(3)+' m/s²</b></div>'
      +'<div class="lv"><span>信号 X</span><b>'+ax.toFixed(2)+'</b></div>'
      +'<div class="lv"><span>信号 Y</span><b>'+ay.toFixed(2)+'</b></div>'
      +'<div class="lv"><span>信号 Z</span><b>'+az.toFixed(2)+'</b></div>'
      +'<div class="lv"><span>合模</span><b>'+g.toFixed(2)+' g</b></div>'
      +'<div class="lv"><span>归一化振动</span><b>'+vib.toFixed(3)+' g</b></div>'
      +'</div>'
      +'<h4 style="margin-top:12px">量程诊断（当前±'+range+'g）</h4>'
      +'<div class="kv"><span>量程模式</span><b>手动 ±'+range+'g（固定，不自动切换）</b></div>'
      +'<div class="kv"><span>量程切换次数</span><b>'+rangesw+'</b></div>'
      +'<div class="kv"><span>X轴近1秒范围</span><b>'+minax.toFixed(2)+' ~ '+maxax.toFixed(2)+' g</b></div>'
      +'<div class="kv"><span>Y轴近1秒范围</span><b>'+minay.toFixed(2)+' ~ '+maxay.toFixed(2)+' g</b></div>'
      +'<div class="kv"><span>Z轴近1秒范围</span><b>'+minaz.toFixed(2)+' ~ '+maxaz.toFixed(2)+' g</b></div>'
      +'<div class="kv"><span>三轴最大绝对值</span><b>'+peakg.toFixed(2)+' g</b></div>'
      +'<div class="kv"><span>诊断采样数/疑似饱和</span><b>'+dsamples+' / '+dsat+'</b></div>'
      +(advice===2?'<div class="diag-row"><i class="dot off"></i><b>量程警告：接近饱和，建议在设置里手动切换回±8g。</b></div>':advice===1?'<div class="diag-row"><i class="dot on"></i><b>峰值较低；可在设置里手动切换到±4g，提高灵敏度。</b></div>':'<div class="diag-row"><i class="dot"></i><span>量程为手动固定档，诊断只给提示，不自动切换。</span></div>')
      +'<div class="mini">提示：±4g灵敏度约为±8g的2倍；切换量程后当前5秒采集会重新计时，确保单次结果不混合量程。</div>'
      +'<div class="diag-row"><i class="dot '+tcrtCls+'"></i><span>TCRT5000：'+tcrtTxt+'</span></div>'
      +'<div class="kv"><span>模块倾斜估计（轴水平、静止时有效）</span><b>'+tiltTxt+'</b></div>'
      +'<div class="mini">说明：转动时 Z 轴范围明显大于 0，说明模块平面与轮平面有倾斜；v1.6.4 三轴分轴标定会把三轴投影分别算进去，不必强行调平，但标定后模块不能移动、不能松动。</div>'
      +'<div class="kv"><span>转速</span><b>'+rpm+' rpm</b></div>'
      +'<div class="kv"><span>圈数</span><b>'+rev+'</b></div>'
      +'<div class="kv"><span>触发边沿</span><b>'+((edge?'上升沿':'下降沿'))+'</b></div>'
      +'<div class="kv"><span>信号强度 RSSI</span><b>'+rssi+' dBm</b></div>'
      +'<div class="kv"><span>内存/运行</span><b>'+heap+' KB / '+Math.floor(up/60)+'分'+up%60+'秒</b></div>'
      +'<div class="mini" style="margin-top:6px;color:var(--cyan)">● 实时刷新（每1秒）· 原始振动(m/s²)静止应≈0，转动变大；合模静止≈1.0g</div>';
  }).catch(()=>{ stopDiag(); b.innerHTML='<div class="diag-row"><i class="dot off"></i><span>连接中断，已停止刷新。请确认连上热点后重开。</span></div>'; });
}

function setSteps(n){
  for(let i=1;i<=3;i++) $('s'+i).className = (i<=n) ? 'on' : '';
}

function renderCal(){
  const b = $('calBody');
  setSteps(calStep+1);
  if(calStep === 0){
    const calDone = (S && S.k===1);
    b.innerHTML = `
      <p>标定 = 让仪器认识你的轮子。全程 3 分钟，只需要一次。</p>
      <div class="kv"><span>标定状态</span><b class="${calDone?'good':'bad'}">${calDone?'已标定 ✓':'未标定'}</b></div>
      <div class="kv"><span>试重状态</span><b class="${calDone?'good':'bad'}">${calDone?'已试重 ✓':'未试重'}</b></div>
      <div class="warnbox">前提：轮子能自由转动、支架夹稳、TCRT5000 已能稳定读到转速。</div>
      <div class="kv"><span>实时转速</span><b id="calLiveRpm">-</b></div>
      <p class="mini">先把转速稳在目标值再采集。实时转速每 200ms 更新。</p>
      <p class="mini">第 1 步：空转采样（保持轮子现在的样子，先不要加任何配重）</p>
      <p class="mini">v1.6.4 起三轴分轴标定：模块平面不必与轮平面严格平行，X/Y/Z 三轴会分别标定；但标定完成后模块不能移动、不能松动，否则要重标。</p>
      <button class="solid" onclick="capBase()">开始 · 采集基准</button>
      <button class="ghost" onclick="closeAll()">以后再说</button>`;
  }else if(calStep === 1){
    b.innerHTML = `
      <p>基准已采集，幅值 <b>${calV0 ? calV0.amp.toFixed(3) : '-'} g</b>，标定转速（基准） <b>${calV0 ? Math.round(calV0.rpm) : '-'} rpm</b>。</p>
      <div class="kv"><span>标定转速（基准）</span><b>${calV0 ? Math.round(calV0.rpm) : '-'} rpm</b></div>
      <div class="kv"><span>实时转速</span><b id="calLiveRpm">-</b></div>
      <p class="mini">试重采集前请先把实时转速稳到接近标定转速，两次转速差超过 25% 时会提示确认。</p>
      <p class="mini">第 2 步：在轮子上（标记处，0°）贴一枚已知重量的试重，尽量贴在以后要装配重的同一半径上。</p>
      <div class="field"><label>试重质量 (g)</label><input id="tm" type="number" step="0.5" value="5"></div>
      <div class="field"><label>试重角度 (°)</label><input id="ta" type="number" step="1" value="0"></div>
      <button class="solid" onclick="capTrial()">已贴好 · 采集试重</button>
      <button class="ghost" onclick="closeAll()">取消</button>`;
  }else if(calStep === 2){
    b.innerHTML = `
      <h4 style="margin-top:0">标定完成 ✓</h4>
      <div class="kv"><span>灵敏度 |K|（三轴合计）</span><b>${calK.sens.toFixed(4)} g / g</b></div>
      <div class="kv"><span>X 轴灵敏度</span><b>${(calK.kx||0).toFixed(4)} g / g</b></div>
      <div class="kv"><span>Y 轴灵敏度</span><b>${(calK.ky||0).toFixed(4)} g / g</b></div>
      <div class="kv"><span>Z 轴灵敏度</span><b>${(calK.kz||0).toFixed(4)} g / g</b></div>
      <div class="kv"><span>试重引起的振动变化</span><b>${calK.delta.toFixed(4)} g</b></div>
      <div class="mini">Z 轴灵敏度明显大于 0，说明模块有倾斜，三轴标定已将其计入；标定后请勿移动模块。</div>
      <div class="kv"><span>实时转速</span><b id="calLiveRpm">-</b></div>
      <div class="warnbox">现在可以把试重取下来，重新起转，界面会直接给出「配重 xx g / 位置 xx°」。</div>
      <button class="solid" onclick="closeAll();doZero()">好的，开始平衡</button>`;
  }else if(calStep === 3){
    b.innerHTML = `
      <h4 style="margin-top:0" class="bad">标定失败</h4>
      <p>试重引起的振动变化太小（${calErr}）。常见原因：</p>
      <p class="mini">· 试重太轻（建议 ≥ 5 g，或贴到更大半径）<br>
      · 两次采集转速差太多（保持 200~400 rpm 接近的转速）<br>
      · 轮子没转起来 / 转速读数为 0<br>
      · 试重没贴牢，转起来甩飞了</p>
      <button class="solid" onclick="openCal()">重新标定</button>`;
  }
}

async function grab(){
  const r = await fetch('/api/state',{cache:'no-store'});
  return await r.json();
}

let capTimer = null;
function capStop(){ if(capTimer){ clearInterval(capTimer); capTimer=null; } }
function capToast(d, tag){
  if(!d.active && d.done) return false;              // 已结束
  const remain = Math.ceil((d.remain||0)/1000);
  toast((tag||'采集中')+'… '+remain+'s · 已采 '+d.n+' 圈');
  return true;
}

async function capBase(){
  const s = await grab();
  if(!s.turning){ toast('没检测到转动，请先让轮子转起来'); return; }
  if(!s.valid){ toast('在转但振动还没结算：转速太低或 MPU 无信号，保持 60~300 rpm 多转几圈'); return; }
  await fetch('/api/cap/start',{method:'POST'});
  toast('采集中… 保持转动 5 秒');
  capStop(); capTimer = setInterval(capPollBase, 500);
}
async function capPollBase(){
  const d = await (await fetch('/api/cap/poll',{cache:'no-store'})).json();
  if(capToast(d,'采集基准')) return;
  capStop();
  if(d.n < 3){ toast('采样圈数太少（'+d.n+' 圈），再转快点或保持转动重试'); return; }
  calV0 = {r:d.r, i:d.i, amp:d.amp, rpm:d.rpm,
           xr:d.xr, xi:d.xi, yr:d.yr, yi:d.yi, zr:d.zr3, zi:d.zi3};
  calStep = 1; renderCal();
  toast('基准已采集（5 秒平均 '+d.n+' 圈）');
}

async function capTrial(){
  const m = parseFloat($('tm').value);
  const a = parseFloat($('ta').value) || 0;
  if(!(m > 0)){ toast('试重质量不对'); return; }
  if(!calV0){ toast('请先采集基准'); return; }
  await fetch('/api/cap/start',{method:'POST'});
  toast('采集中… 保持转动 5 秒');
  capStop(); capTimer = setInterval(()=>capPollTrial(m,a), 500);
}
async function capPollTrial(m,a){
  const d = await (await fetch('/api/cap/poll',{cache:'no-store'})).json();
  if(capToast(d,'采集试重')) return;
  capStop();
  if(d.n < 3){ toast('采样圈数太少（'+d.n+' 圈），再转快点或保持转动重试'); return; }
  if(Math.abs(d.rpm - calV0.rpm) / calV0.rpm > 0.25){
    if(!confirm('两次转速差超过 25%（' + Math.round(calV0.rpm) + ' → ' + Math.round(d.rpm) + ' rpm），继续？')) return;
  }
  const q = `m=${m}&a=${a}&x0r=${calV0.xr}&x0i=${calV0.xi}&y0r=${calV0.yr}&y0i=${calV0.yi}&z0r=${calV0.zr}&z0i=${calV0.zi}&x1r=${d.xr}&x1i=${d.xi}&y1r=${d.yr}&y1i=${d.yi}&z1r=${d.zr3}&z1i=${d.zi3}`;
  const r = await fetch('/api/cal/set?' + q, {method:'POST'});
  const j = await r.json();
  if(j.ok){
    calK = j; calStep = 2; renderCal();
  }else{
    calErr = (j.err === 'weak') ? '变化量过小' : '参数错误';
    calStep = 3; renderCal();
  }
}

/* ---------------- 历史 + 实时振动 ---------------- */
function getHist(){ try{ return JSON.parse(localStorage.getItem('wb_hist') || '[]'); }catch(e){ return []; } }
let lastVib = null, recTrace = [], recTraceTimer = null, recTraceStart = 0;
async function saveRec(){
  if(S.k !== 1){ toast('还没有可保存的结果（需先标定）'); return; }
  const s = await grab();
  if(!s.turning){ toast('没检测到转动，请先让轮子转起来'); return; }
  await fetch('/api/cap/start',{method:'POST'});
  toast('采集中… 保持转动 5 秒');
  recTrace = []; recTraceStart = Date.now();
  if(recTraceTimer) clearInterval(recTraceTimer);
  recTraceTimer = setInterval(()=>{
    if(!S) return;
    recTrace.push({t:((Date.now()-recTraceStart)/1000).toFixed(1),
      amp:S.amp, rpm:S.rpm, phase:S.phase,
      x:lastVib?lastVib.ax:0, y:lastVib?lastVib.ay:0, z:lastVib?lastVib.az:0});
  }, 200);
  capStop(); capTimer = setInterval(saveRecPoll, 500);
}
async function saveRecPoll(){
  const d = await (await fetch('/api/cap/poll',{cache:'no-store'})).json();
  if(capToast(d,'记录采集')) return;
  capStop();
  if(recTraceTimer){ clearInterval(recTraceTimer); recTraceTimer = null; }
  if(d.gram < 0){ toast('采集完成但没有配重结果（检查是否已标定）'); return; }
  const h = getHist();
  h.unshift({t:new Date().toLocaleString('zh-CN',{hour12:false}), g:Number(d.gram).toFixed(1),
             p:Math.round(d.pos), r:Math.round(d.rpm), trace:recTrace.slice()});
  localStorage.setItem('wb_hist', JSON.stringify(h.slice(0,10)));
  renderHist(); toast('已记录（5 秒平均 '+d.n+' 圈）');
}
function renderHist(){
  const h = getHist(), box = $('hist');
  if(!h.length){
    box.innerHTML = '<div class="empty">还没有记录。平衡完成后点「记录」保存本次结果。</div>';
    return;
  }
  box.innerHTML = h.map((x,i)=>
    `<div class="hrow" onclick="openHist(${i})"><span style="color:var(--dim)">${x.t}</span>
     <span><span class="g">${x.g} g</span> · ${x.p}° · ${x.r}rpm</span></div>`).join('');
}
function drawLine(canvas, series, color){
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle = '#16233a'; ctx.lineWidth = 1;
  for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(0,H*i/4); ctx.lineTo(W,H*i/4); ctx.stroke(); }
  if(!series || !series.length) return;
  // 固定纵轴 0-1000mg，不按本条记录的最大值放大：静止时接近底部，转动时才抬高
  const mx = 1000;
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
  series.forEach((v,i)=>{
    const x = i/(series.length-1)*W, y = H - 4 - (Math.min(v, mx)/mx)*(H-8);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
}
function drawVib(canvas, samples){
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle = '#16233a'; ctx.lineWidth = 1;
  for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(0,H*i/4); ctx.lineTo(W,H*i/4); ctx.stroke(); }
  if(!samples || !samples.length) return;
  const mean = [0,0,0];
  samples.forEach(s=>{ mean[0]+=s[0]; mean[1]+=s[1]; mean[2]+=s[2]; });
  mean[0]/=samples.length; mean[1]/=samples.length; mean[2]/=samples.length;
  // 固定纵轴 ±1g，不按本窗口最大值放大：静止噪声只有几 mg，在 1g 刻度上
  // 几乎是一条直线；真正振动 0.19g 时约占半高 19%，不会再出现静止比振动还大的假象
  const mx = 1.0;
  const cols = ['#2fe3f2','#3d7bff','#37d67a'];
  for(let a=0;a<3;a++){
    ctx.strokeStyle = cols[a]; ctx.lineWidth = 1.6; ctx.beginPath();
    samples.forEach((s,i)=>{
      const x = i/(samples.length-1)*W;
      let y = H/2 - ((s[a]-mean[a])/mx)*(H/2-4);
      if(y < 0) y = 0; if(y > H) y = H;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
}
function openHist(i){
  const h = getHist(), x = h[i];
  if(!x) return;
  let html = `<div class="kv"><span>时间</span><b>${x.t}</b></div>
    <div class="kv"><span>配重</span><b>${x.g} g · ${x.p}° · ${x.r}rpm</b></div>`;
  const tr = x.trace || [];
  if(tr.length){
    const amps = tr.map(p=>p.amp*1000);
    const amax = Math.max(...amps), amin = Math.min(...amps), aavg = amps.reduce((a,b)=>a+b,0)/amps.length;
    html += `<div class="kv"><span>5 秒抖动幅值</span><b>平均 ${aavg.toFixed(1)} mg · 最大 ${amax.toFixed(1)} mg · 最小 ${amin.toFixed(1)} mg</b></div>
      <div class="mini">曲线为记录 5 秒内每 200ms 的幅值（mg），纵轴固定 0-1000mg，不自动放大，表格为同一轨迹。</div>`;
    $('histCanvas').style.display = 'block';
    drawLine($('histCanvas'), amps, '#2fe3f2');
    html += '<div class="mini" style="max-height:180px;overflow:auto">';
    tr.forEach(p=>{
      html += `<div class="kv"><span>${p.t}s</span><b>${(p.amp*1000).toFixed(1)} mg · ${Math.round(p.rpm)}rpm · ${Math.round(p.phase)}°</b></div>`;
    });
    html += '</div>';
  } else {
    $('histCanvas').style.display = 'none';
    html += '<div class="mini">旧记录：没有 5 秒抖动轨迹。升级到本版后新记录才有轨迹。</div>';
  }
  $('histDetail').innerHTML = html;
  closeAll(); open('sheetHist');
}
renderHist();
let vibBusy = false;
async function pollVib(){
  if(vibBusy) return; vibBusy = true;
  try{
    const v = await (await fetch('/api/vib',{cache:'no-store'})).json();
    if(!v.ok){ vibBusy = false; return; }
    lastVib = v;
    $('vrpm').textContent = v.rpm;
    $('vamp').textContent = (v.amp*1000).toFixed(1);
    $('vphase').textContent = v.valid ? Math.round(v.phase) : '--';
    $('vfluct').textContent = v.fluct.toFixed(1);
    $('vx').textContent = v.ax.toFixed(3) + ' g';
    $('vy').textContent = v.ay.toFixed(3) + ' g';
    $('vz').textContent = v.az.toFixed(3) + ' g';
    $('vsrate').textContent = v.srate + ' Hz';
    $('vperiod').textContent = v.rpm > 0 ? v.period.toFixed(1) + ' ms' : '-- ms';
    if(v.rpm >= 60 && v.amp > 0){
      const f = v.rpm/60, disp = v.amp*9.80665/Math.pow(2*Math.PI*f,2)*1000000;
      $('vdisp').textContent = disp.toFixed(0) + ' μm';
    } else {
      $('vdisp').textContent = '-- μm';
    }
    drawVib($('vibCanvas'), v.s);
  }catch(e){}
  vibBusy = false;
}
setInterval(pollVib, 300); pollVib();
