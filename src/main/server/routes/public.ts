import { Router } from 'express'
import { getDb } from '../db'

export const publicRouter = Router()

function page(body: string, title = 'PIKE Rush Sign-In'): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<title>${title}</title>
<style>
  :root{--garnet:#7b1113;--gold:#c9a227;--ink:#0a0b10;--card:#15171f;}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body{margin:0;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;background:
    radial-gradient(1200px 600px at 50% -10%, rgba(123,17,19,.5), transparent 60%), var(--ink);
    color:#f5f6f8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{width:100%;max-width:420px;background:var(--card);border:1px solid rgba(201,162,39,.25);
    border-radius:20px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .crest{width:64px;height:64px;border-radius:16px;margin:0 auto 14px;display:flex;align-items:center;
    justify-content:center;font-weight:800;font-size:26px;color:var(--ink);
    background:linear-gradient(135deg,var(--gold),#e7c14d)}
  h1{font-size:22px;margin:0 0 2px;text-align:center}
  .sub{color:#c9a227;text-align:center;font-size:13px;margin-bottom:4px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
  .event{color:#b9bdc9;text-align:center;font-size:15px;margin:6px 0 22px}
  label{display:block;font-size:13px;color:#b9bdc9;margin:14px 0 6px;font-weight:600}
  input{width:100%;padding:14px 14px;font-size:16px;border-radius:12px;border:1px solid #2a2d38;
    background:#0f1118;color:#fff;outline:none}
  input:focus{border-color:var(--gold)}
  button{width:100%;margin-top:22px;padding:15px;font-size:16px;font-weight:700;border:0;border-radius:12px;
    background:linear-gradient(135deg,var(--garnet),#a51c2c);color:#fff}
  button:disabled{opacity:.6}
  .ok{text-align:center;padding:20px 0}
  .ok .big{font-size:54px}
  .ok h2{margin:10px 0 4px}
  .err{background:rgba(165,28,44,.2);border:1px solid rgba(165,28,44,.5);color:#f3b1ba;
    padding:10px 12px;border-radius:10px;margin-top:14px;font-size:14px;display:none}
  .foot{text-align:center;color:#6b7080;font-size:12px;margin-top:18px}
</style></head><body><div class="card">${body}</div></body></html>`
}

// Landing
publicRouter.get('/', (_req, res) => {
  res.type('html').send(
    page(
      `<div class="crest">ΠΚΑ</div><div class="sub">Sigma · Vanderbilt</div>
       <h1>PIKE Rush</h1>
       <p class="event">This is the local PIKE Rush server. Open the desktop app to manage rush.</p>
       <div class="foot">Once a Pike, Always a Pike</div>`
    )
  )
})

// Public sign-in form
publicRouter.get('/signin/:sessionId', (req, res) => {
  const session = getDb()
    .prepare(
      `SELECT s.id, s.is_open, e.title AS event_title FROM sign_in_sessions s
       JOIN events e ON e.id = s.event_id WHERE s.id = ?`
    )
    .get(req.params.sessionId) as { id: string; is_open: number; event_title: string } | undefined

  if (!session) {
    res
      .status(404)
      .type('html')
      .send(page(`<div class="crest">ΠΚΑ</div><h1>Sign-In Not Found</h1><p class="event">This link is invalid.</p>`))
    return
  }
  if (!session.is_open) {
    res
      .type('html')
      .send(
        page(
          `<div class="crest">ΠΚΑ</div><div class="sub">Sigma · Vanderbilt</div><h1>Sign-In Closed</h1>
           <p class="event">This sign-in for <b>${escapeHtml(session.event_title)}</b> is closed. Find a brother to get added.</p>`
        )
      )
    return
  }

  const form = `
    <div class="crest">ΠΚΑ</div>
    <div class="sub">Sigma · Vanderbilt</div>
    <h1>Welcome to PIKE</h1>
    <p class="event">${escapeHtml(session.event_title)}</p>
    <form id="f">
      <label>First Name</label>
      <input id="first" autocomplete="given-name" required />
      <label>Last Name</label>
      <input id="last" autocomplete="family-name" required />
      <label>Phone Number</label>
      <input id="phone" inputmode="tel" placeholder="(615) 555-1234" required />
      <div class="err" id="err"></div>
      <button type="submit" id="btn">I'm Here 🤙</button>
    </form>
    <div class="foot">Once a Pike, Always a Pike</div>
    <script>
      var phone=document.getElementById('phone');
      phone.addEventListener('input',function(){
        var d=this.value.replace(/\\D/g,'').slice(0,10);
        if(d.length>6)this.value='('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6);
        else if(d.length>3)this.value='('+d.slice(0,3)+') '+d.slice(3);
        else if(d.length>0)this.value='('+d;
        else this.value='';
      });
      document.getElementById('f').addEventListener('submit',async function(e){
        e.preventDefault();
        var err=document.getElementById('err'),btn=document.getElementById('btn');
        err.style.display='none';btn.disabled=true;btn.textContent='Signing you in…';
        try{
          var r=await fetch('/api/signin-sessions/${session.id}/submit',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({first_name:document.getElementById('first').value,
              last_name:document.getElementById('last').value,phone:phone.value})});
          var j=await r.json();
          if(!r.ok)throw new Error(j.error||'Something went wrong');
          document.querySelector('.card').innerHTML=
            '<div class="ok"><div class="big">🤙</div><h2>You\\'re in!</h2>'+
            '<p class="event">See you inside. Welcome to PIKE.</p></div>';
        }catch(ex){err.textContent=ex.message;err.style.display='block';
          btn.disabled=false;btn.textContent="I'm Here 🤙";}
      });
    </script>`
  res.type('html').send(page(form))
})

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
