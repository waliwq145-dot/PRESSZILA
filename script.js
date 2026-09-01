document.addEventListener("DOMContentLoaded",()=>{
  const path = location.pathname.split("/").pop() || "home.html";
  document.querySelectorAll(".nav-links a[data-page]").forEach(a=>{
    if(a.dataset.page===path || (path==="home.html" && a.dataset.page==="home.html")) a.classList.add("active");
  });
  const menu=document.querySelector(".menu-btn"), links=document.querySelector(".nav-links");
  if(menu) menu.addEventListener("click",()=>{links.classList.toggle("open");menu.setAttribute("aria-expanded",links.classList.contains("open"))});
  links?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>links.classList.remove("open")));
  const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");observer.unobserve(e.target)}}),{threshold:.12});
  document.querySelectorAll(".reveal").forEach(e=>observer.observe(e));

  document.querySelectorAll("form[data-api]").forEach(form=>{
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const status=form.querySelector(".form-status"), btn=form.querySelector("button[type=submit]");
      const data=Object.fromEntries(new FormData(form).entries());
      data.type=form.dataset.api;
      status.className="form-status"; status.textContent="Sending…"; btn.disabled=true;
      try{
        const r=await fetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
        const j=await r.json();
        if(!r.ok) throw new Error(j.error||"Something went wrong.");
        status.classList.add("success"); status.textContent=j.message;
        form.reset();
      }catch(err){status.classList.add("error");status.textContent=err.message}
      finally{btn.disabled=false}
    });
  });

  const adminForm=document.querySelector("#admin-login");
  if(adminForm){
    adminForm.addEventListener("submit",async e=>{
      e.preventDefault();
      const key=document.querySelector("#admin-key").value.trim();
      const status=document.querySelector("#admin-status");
      status.textContent="Loading…";
      try{
        const r=await fetch("/api/admin/inquiries",{headers:{"x-admin-key":key}});
        const j=await r.json(); if(!r.ok) throw new Error(j.error||"Unauthorized");
        sessionStorage.setItem("presszilaAdminKey",key);
        renderInquiries(j.inquiries); status.textContent=`${j.inquiries.length} inquiry${j.inquiries.length===1?"":"ies"} loaded.`;
      }catch(err){status.className="form-status error";status.textContent=err.message}
    });
    const saved=sessionStorage.getItem("presszilaAdminKey");
    if(saved){document.querySelector("#admin-key").value=saved;adminForm.requestSubmit()}
  }
});
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function renderInquiries(rows){
  const tbody=document.querySelector("#inquiry-body"); tbody.innerHTML="";
  rows.forEach(x=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${esc(x.type)}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.phone)}</td><td>${esc(x.company)}</td><td>${esc(x.service)}</td><td>${esc(x.budget)}</td><td>${esc(x.timeline)}</td><td>${esc(x.message)}</td><td>${esc(x.created_at)}</td>`;
    tbody.appendChild(tr);
  });
}
